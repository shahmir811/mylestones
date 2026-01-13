const { pool, query } = require('../db');

const getAlbumByEventId = async (eventId, userId) => {
	// Verify event ownership
	const eventCheck = await query('SELECT id, creator_id FROM events WHERE id = $1', [eventId]);

	if (eventCheck.rows.length === 0) {
		throw new Error('Event not found');
	}

	if (eventCheck.rows[0].creator_id !== userId) {
		throw new Error('Access denied. Only event owner can view album.');
	}

	// Get album
	const albumResult = await query(
		`SELECT a.*
		 FROM albums a
		 WHERE a.event_id = $1`,
		[eventId]
	);

	if (albumResult.rows.length === 0) {
		throw new Error('Album not found');
	}

	const album = albumResult.rows[0];

	// Get all photos with their positions in the album (for curation)
	const photosResult = await query(
		`SELECT p.id, p.file_url, p.caption, p.approved, p.uploaded_at,
		        ap.position
		 FROM photos p
		 LEFT JOIN album_photos ap ON ap.photo_id = p.id AND ap.album_id = $1
		 WHERE p.event_id = $2
		 ORDER BY 
		   CASE WHEN ap.position IS NULL THEN 1 ELSE 0 END,
		   ap.position ASC,
		   p.uploaded_at ASC`,
		[album.id, eventId]
	);

	// Get pdf_url from print order if album is ready
	let pdfUrl = null;
	if (album.status === 'ready') {
		const printOrderResult = await query(
			'SELECT pdf_url FROM print_orders WHERE album_id = $1 ORDER BY created_at DESC LIMIT 1',
			[album.id]
		);
		if (printOrderResult.rows.length > 0) {
			pdfUrl = printOrderResult.rows[0].pdf_url;
		}
	}

	return {
		id: album.id,
		event_id: album.event_id,
		title: album.title,
		template_type: album.template_type,
		page_count: album.page_count,
		status: album.status,
		created_at: album.created_at,
		updated_at: album.updated_at,
		pdf_url: pdfUrl,
		photos: photosResult.rows.map((row) => ({
			id: row.id,
			file_url: row.file_url,
			caption: row.caption,
			approved: row.approved,
			uploaded_at: row.uploaded_at,
			position: row.position,
		})),
	};
};

const updatePhoto = async (photoId, userId, updates) => {
	const { caption, approved } = updates;

	// Verify photo ownership via event
	const photoCheck = await query(
		`SELECT p.id, e.creator_id
		 FROM photos p
		 JOIN events e ON e.id = p.event_id
		 WHERE p.id = $1`,
		[photoId]
	);

	if (photoCheck.rows.length === 0) {
		throw new Error('Photo not found');
	}

	if (photoCheck.rows[0].creator_id !== userId) {
		throw new Error('Access denied. Only event owner can update photos.');
	}

	// Build update query dynamically
	const updateFields = [];
	const updateValues = [];
	let paramCount = 1;

	if (caption !== undefined) {
		updateFields.push(`caption = $${paramCount}`);
		updateValues.push(caption);
		paramCount++;
	}

	if (approved !== undefined) {
		updateFields.push(`approved = $${paramCount}`);
		updateValues.push(approved);
		paramCount++;
	}

	if (updateFields.length === 0) {
		throw new Error('No fields to update');
	}

	updateValues.push(photoId);

	const result = await query(
		`UPDATE photos 
		 SET ${updateFields.join(', ')}
		 WHERE id = $${paramCount}
		 RETURNING *`,
		updateValues
	);

	return result.rows[0];
};

const reorderPhotos = async (albumId, userId, photoIds) => {
	// Validate input
	if (!Array.isArray(photoIds) || photoIds.length === 0) {
		throw new Error('photo_ids must be a non-empty array');
	}

	// Remove duplicates and filter out null/undefined values
	const uniquePhotoIds = [...new Set(photoIds.filter(id => id != null && id !== ''))];

	if (uniquePhotoIds.length === 0) {
		throw new Error('photo_ids must contain at least one valid photo ID');
	}

	if (uniquePhotoIds.length !== photoIds.length) {
		console.warn(`[ALBUM] Removed ${photoIds.length - uniquePhotoIds.length} duplicate or invalid photo IDs`);
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Verify album ownership
		const albumCheck = await client.query(
			`SELECT a.id, e.creator_id
			 FROM albums a
			 JOIN events e ON e.id = a.event_id
			 WHERE a.id = $1`,
			[albumId]
		);

		if (albumCheck.rows.length === 0) {
			throw new Error('Album not found');
		}

		if (albumCheck.rows[0].creator_id !== userId) {
			throw new Error('Access denied. Only event owner can reorder photos.');
		}

		// Verify all photos exist, are approved, and belong to the same event
		const eventIdResult = await client.query('SELECT event_id FROM albums WHERE id = $1', [albumId]);
		const eventId = eventIdResult.rows[0].event_id;

		const photosCheck = await client.query(
			`SELECT id, approved, file_url
			 FROM photos
			 WHERE id = ANY($1::uuid[]) AND event_id = $2`,
			[uniquePhotoIds, eventId]
		);

		if (photosCheck.rows.length !== uniquePhotoIds.length) {
			throw new Error('One or more photo IDs are invalid or do not belong to this event');
		}

		// Check all photos are approved
		const unapprovedPhotos = photosCheck.rows.filter((p) => !p.approved);
		if (unapprovedPhotos.length > 0) {
			throw new Error('Only approved photos can be added to the album');
		}

		// Check all photos have valid file_url
		const invalidPhotos = photosCheck.rows.filter((p) => !p.file_url || p.file_url.trim() === '');
		if (invalidPhotos.length > 0) {
			throw new Error('One or more photos have invalid file URLs');
		}

		// Remove ALL existing album_photos entries for this album
		// This ensures we start fresh and avoid duplicate position conflicts
		await client.query('DELETE FROM album_photos WHERE album_id = $1', [albumId]);

		// Insert new positions (only valid, unique photos)
		for (let i = 0; i < uniquePhotoIds.length; i++) {
			await client.query(
				`INSERT INTO album_photos (album_id, photo_id, position)
				 VALUES ($1, $2, $3)`,
				[albumId, uniquePhotoIds[i], i + 1]
			);
		}

		await client.query('COMMIT');

		return { success: true, photosReordered: uniquePhotoIds.length };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const finalizeAlbum = async (albumId, userId) => {
	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Verify album ownership
		const albumCheck = await client.query(
			`SELECT a.id, a.event_id, e.creator_id, e.status
			 FROM albums a
			 JOIN events e ON e.id = a.event_id
			 WHERE a.id = $1`,
			[albumId]
		);

		if (albumCheck.rows.length === 0) {
			throw new Error('Album not found');
		}

		const album = albumCheck.rows[0];

		if (album.creator_id !== userId) {
			throw new Error('Access denied. Only event owner can finalize album.');
		}

		// Update album status to 'ready'
		await client.query("UPDATE albums SET status = 'ready', updated_at = NOW() WHERE id = $1", [
			albumId,
		]);

		// Update event status to 'finalized'
		await client.query(
			"UPDATE events SET status = 'finalized', updated_at = NOW() WHERE id = $1",
			[album.event_id]
		);

		await client.query('COMMIT');

		return { success: true, albumId, eventId: album.event_id };
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const previewAlbum = async (albumId, userId) => {
	// Verify album ownership
	const albumCheck = await query(
		`SELECT a.id, a.event_id, e.creator_id
		 FROM albums a
		 JOIN events e ON e.id = a.event_id
		 WHERE a.id = $1`,
		[albumId]
	);

	if (albumCheck.rows.length === 0) {
		throw new Error('Album not found');
	}

	if (albumCheck.rows[0].creator_id !== userId) {
		throw new Error('Access denied. Only event owner can preview album.');
	}

	return { success: true, albumId };
};

module.exports = {
	getAlbumByEventId,
	updatePhoto,
	reorderPhotos,
	finalizeAlbum,
	previewAlbum,
};


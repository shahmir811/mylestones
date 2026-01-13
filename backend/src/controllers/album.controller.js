const albumService = require('../services/album.service');

const getAlbum = async (req, res) => {
	try {
		const eventId = req.params.eventId;
		const userId = req.user.id;

		const album = await albumService.getAlbumByEventId(eventId, userId);

		res.json(album);
	} catch (error) {
		console.error('Get album error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to get album' });
	}
};

const updatePhoto = async (req, res) => {
	try {
		const photoId = req.params.id;
		const userId = req.user.id;
		const { caption, approved } = req.body;

		// Validate at least one field is provided
		if (caption === undefined && approved === undefined) {
			return res.status(400).json({
				error: 'At least one field (caption or approved) must be provided',
			});
		}

		// Validate approved is boolean if provided
		if (approved !== undefined && typeof approved !== 'boolean') {
			return res.status(400).json({ error: 'approved must be a boolean' });
		}

		const photo = await albumService.updatePhoto(photoId, userId, { caption, approved });

		res.json(photo);
	} catch (error) {
		console.error('Update photo error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		if (error.message.includes('No fields to update')) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to update photo' });
	}
};

const reorderPhotos = async (req, res) => {
	try {
		const albumId = req.params.albumId;
		const userId = req.user.id;
		const { photo_ids } = req.body;

		// Validate photo_ids
		if (!photo_ids) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields: ['photo_ids'],
			});
		}

		if (!Array.isArray(photo_ids)) {
			return res.status(400).json({ error: 'photo_ids must be an array' });
		}

		if (photo_ids.length === 0) {
			return res.status(400).json({ error: 'photo_ids array cannot be empty' });
		}

		const result = await albumService.reorderPhotos(albumId, userId, photo_ids);

		res.json(result);
	} catch (error) {
		console.error('Reorder photos error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		if (
			error.message.includes('invalid') ||
			error.message.includes('Only approved photos') ||
			error.message.includes('must be')
		) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to reorder photos' });
	}
};

const finalizeAlbum = async (req, res) => {
	try {
		const albumId = req.params.albumId;
		const userId = req.user.id;

		const result = await albumService.finalizeAlbum(albumId, userId);

		res.json(result);
	} catch (error) {
		console.error('Finalize album error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to finalize album' });
	}
};

const previewAlbum = async (req, res) => {
	try {
		const albumId = req.params.albumId;
		const userId = req.user.id;

		// Verify ownership
		await albumService.previewAlbum(albumId, userId);

		// Generate preview PDF (same as print order but doesn't save to database)
		const pdfService = require('../services/pdf.service');
		const baseUrl = process.env.APP_API_URL || process.env.BASE_URL || 'http://localhost:3000';
		const pdfUrl = await pdfService.generateAlbumPDF(albumId, baseUrl);

		res.json({ pdf_url: pdfUrl });
	} catch (error) {
		console.error('Preview album error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		if (error.message.includes('No approved photos') || error.message.includes('No photos with valid')) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to generate preview' });
	}
};

module.exports = {
	getAlbum,
	updatePhoto,
	reorderPhotos,
	finalizeAlbum,
	previewAlbum,
};


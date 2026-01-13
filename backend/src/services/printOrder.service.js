const { pool, query } = require('../db');
const pdfService = require('./pdf.service');

const createPrintOrder = async (userId, orderData) => {
	const { album_id, print_format, shipping_address } = orderData;

	// Validate required fields
	if (!album_id || !print_format || !shipping_address) {
		const missingFields = [];
		if (!album_id) missingFields.push('album_id');
		if (!print_format) missingFields.push('print_format');
		if (!shipping_address) missingFields.push('shipping_address');
		throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Get album with event info
		const albumResult = await client.query(
			`SELECT a.id, a.status as album_status, a.event_id,
			        e.id as event_id, e.status as event_status, e.creator_id
			 FROM albums a
			 JOIN events e ON e.id = a.event_id
			 WHERE a.id = $1`,
			[album_id]
		);

		if (albumResult.rows.length === 0) {
			throw new Error('Album not found');
		}

		const album = albumResult.rows[0];

		// Verify event ownership
		if (album.creator_id !== userId) {
			throw new Error('Access denied. Only event owner can create print orders.');
		}

		// Verify album status is 'ready'
		if (album.album_status !== 'ready') {
			throw new Error(`Album is not ready for printing. Current status: ${album.album_status}`);
		}

		// Verify event status is 'finalized'
		if (album.event_status !== 'finalized') {
			throw new Error(`Event is not finalized. Current status: ${album.event_status}`);
		}

		// Check for duplicate print orders for this album
		const existingOrder = await client.query(
			'SELECT id FROM print_orders WHERE album_id = $1',
			[album_id]
		);

		if (existingOrder.rows.length > 0) {
			throw new Error('A print order already exists for this album');
		}

		// Generate PDF for the album
		// Use APP_API_URL for image URLs (backend serves the images)
		// Fallback to BASE_URL for backward compatibility, then default to port 3000
		const baseUrl = process.env.APP_API_URL || process.env.BASE_URL || 'http://localhost:3000';
		const pdfUrl = await pdfService.generateAlbumPDF(album_id, baseUrl);

		// Create print order
		// Set publisher_id to the event owner (userId) since they're creating the order
		const orderResult = await client.query(
			`INSERT INTO print_orders (album_id, publisher_id, print_format, pdf_url, status, shipping_address)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING *`,
			[album_id, userId, print_format, pdfUrl, 'sent', shipping_address]
		);

		const printOrder = orderResult.rows[0];

		// Update event status to 'sent_to_print' (permanent lock)
		await client.query(
			"UPDATE events SET status = 'sent_to_print', updated_at = NOW() WHERE id = $1",
			[album.event_id]
		);

		await client.query('COMMIT');

		return printOrder;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const getPrintOrderById = async (printOrderId, userId, userRole) => {
	// Get print order with related data
	const result = await query(
		`SELECT po.*, a.title as album_title, a.event_id,
		        e.title as event_title, e.creator_id
		 FROM print_orders po
		 JOIN albums a ON a.id = po.album_id
		 JOIN events e ON e.id = a.event_id
		 WHERE po.id = $1`,
		[printOrderId]
	);

	if (result.rows.length === 0) {
		throw new Error('Print order not found');
	}

	const printOrder = result.rows[0];

	// Verify access: owner or publisher
	const isOwner = printOrder.creator_id === userId;
	const isPublisher = printOrder.publisher_id === userId || userRole === 'publisher';

	if (!isOwner && !isPublisher) {
		throw new Error('Access denied. Only event owner or assigned publisher can view this print order.');
	}

	return {
		id: printOrder.id,
		album_id: printOrder.album_id,
		album_title: printOrder.album_title,
		event_id: printOrder.event_id,
		event_title: printOrder.event_title,
		publisher_id: printOrder.publisher_id,
		print_format: printOrder.print_format,
		pdf_url: printOrder.pdf_url,
		status: printOrder.status,
		shipping_address: printOrder.shipping_address,
		created_at: printOrder.created_at,
		updated_at: printOrder.updated_at,
	};
};

module.exports = {
	createPrintOrder,
	getPrintOrderById,
};


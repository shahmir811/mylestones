const { pool, query } = require('../db');

// Valid event types
const VALID_EVENT_TYPES = ['celebration', 'remembrance'];

// Valid statuses
const VALID_STATUSES = ['draft', 'collecting', 'finalized', 'sent_to_print'];

// Allowed status transitions
const ALLOWED_TRANSITIONS = {
	draft: ['collecting'],
	collecting: ['finalized'],
	finalized: ['sent_to_print'],
	sent_to_print: [], // No transitions allowed once sent to print
};

const createEvent = async (userId, eventData) => {
	const { event_type, title, person_name, description, deadline_at, template_type } = eventData;

	// Validate event_type
	if (!VALID_EVENT_TYPES.includes(event_type)) {
		throw new Error(`Invalid event_type. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
	}

	// Validate required fields
	const missingFields = [];
	if (!title) missingFields.push('title');
	if (!person_name) missingFields.push('person_name');

	if (missingFields.length > 0) {
		throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
	}

	const client = await pool.connect();

	try {
		await client.query('BEGIN');

		// Insert event
		const eventResult = await client.query(
			`INSERT INTO events (event_type, title, person_name, description, deadline_at, status, creator_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)
			 RETURNING *`,
			[event_type, title, person_name, description || null, deadline_at || null, 'draft', userId]
		);

		const event = eventResult.rows[0];

		// Create album for the event
		// Use provided template_type or default to 'standard' if not provided
		const albumTemplateType = template_type || 'standard';
		const albumResult = await client.query(
			`INSERT INTO albums (event_id, title, template_type)
			 VALUES ($1, $2, $3)
			 RETURNING *`,
			[event.id, `${title} - Album`, albumTemplateType]
		);

		const album = albumResult.rows[0];

		// Ownership is tracked via creator_id in events table, no need for separate table

		await client.query('COMMIT');

		return {
			...event,
			album,
			is_owner: true, // Creator is always the owner
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
};

const getEventsByUserId = async (userId) => {
	const result = await query(
		`SELECT id, event_type, title, person_name, description, deadline_at, status, creator_id, created_at, updated_at
		 FROM events
		 WHERE creator_id = $1
		 ORDER BY created_at DESC`,
		[userId]
	);

	return result.rows.map((row) => ({
		id: row.id,
		event_type: row.event_type,
		title: row.title,
		person_name: row.person_name,
		description: row.description,
		deadline_at: row.deadline_at,
		status: row.status,
		creator_id: row.creator_id,
		created_at: row.created_at,
		updated_at: row.updated_at,
	}));
};

const getEventById = async (eventId, userId) => {
	const result = await query(
		`SELECT e.*, a.id as album_id, a.title as album_title
		 FROM events e
		 LEFT JOIN albums a ON a.event_id = e.id
		 WHERE e.id = $1`,
		[eventId]
	);

	if (result.rows.length === 0) {
		return null;
	}

	const row = result.rows[0];
	const isOwner = row.creator_id === userId;

	return {
		id: row.id,
		event_type: row.event_type,
		title: row.title,
		person_name: row.person_name,
		description: row.description,
		deadline_at: row.deadline_at,
		status: row.status,
		creator_id: row.creator_id,
		created_at: row.created_at,
		updated_at: row.updated_at,
		album: row.album_id
			? {
					id: row.album_id,
					title: row.album_title,
				}
			: null,
		is_owner: isOwner,
	};
};

const updateEventStatus = async (eventId, newStatus, userId) => {
	// Validate status
	if (!VALID_STATUSES.includes(newStatus)) {
		throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
	}

	// Get current event status and creator_id
	const eventResult = await query('SELECT status, creator_id FROM events WHERE id = $1', [eventId]);

	if (eventResult.rows.length === 0) {
		throw new Error('Event not found');
	}

	const currentStatus = eventResult.rows[0].status;
	const creatorId = eventResult.rows[0].creator_id;
	const isOwner = creatorId === userId;

	// Check if event is already sent_to_print (block all changes)
	if (currentStatus === 'sent_to_print') {
		throw new Error('Cannot modify event. Event has already been sent to print.');
	}

	// Validate transition
	const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus];
	if (!allowedNextStatuses.includes(newStatus)) {
		throw new Error(
			`Invalid status transition. Cannot transition from "${currentStatus}" to "${newStatus}". Allowed transitions: ${allowedNextStatuses.join(', ')}`
		);
	}

	// Update status
	const result = await query(
		'UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
		[newStatus, eventId]
	);

	return {
		...result.rows[0],
		is_owner: isOwner,
	};
};

module.exports = {
	createEvent,
	getEventsByUserId,
	getEventById,
	updateEventStatus,
	VALID_EVENT_TYPES,
	VALID_STATUSES,
};


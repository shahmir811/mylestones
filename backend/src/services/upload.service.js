const { query } = require('../db');
const path = require('path');
const fs = require('fs').promises;

// Allowed image MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Upload directory (create if doesn't exist)
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const ensureUploadDir = async () => {
	try {
		await fs.access(UPLOAD_DIR);
	} catch {
		await fs.mkdir(UPLOAD_DIR, { recursive: true });
	}
};

const validateImageFile = (file) => {
	if (!file) {
		throw new Error('No file provided');
	}

	// Check MIME type
	if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
		throw new Error(`Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`);
	}

	// Check file size
	if (file.size > MAX_FILE_SIZE) {
		throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
	}

	return true;
};

const saveFile = async (file) => {
	await ensureUploadDir();

	// Generate unique filename
	const ext = path.extname(file.originalname);
	const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
	const filepath = path.join(UPLOAD_DIR, filename);

	// Save file
	await fs.writeFile(filepath, file.buffer);

	// Return mock URL (in production, this would be a real URL)
	return `/uploads/${filename}`;
};

const validateInviteToken = async (token) => {
	// Find invite by token
	const result = await query(
		`SELECT i.id, i.event_id, i.email, i.expires_at, i.used_at,
		        e.status, e.title
		 FROM invites i
		 JOIN events e ON e.id = i.event_id
		 WHERE i.token = $1`,
		[token]
	);

	if (result.rows.length === 0) {
		throw new Error('Invalid token');
	}

	const invite = result.rows[0];

	// Check if token is expired
	const now = new Date();
	const expiresAt = new Date(invite.expires_at);

	if (expiresAt < now) {
		throw new Error('Token has expired');
	}

	// Check event status
	if (invite.status !== 'collecting') {
		throw new Error(`Event is not in collecting status. Current status: ${invite.status}`);
	}

	return {
		eventId: invite.event_id,
		email: invite.email,
		inviteId: invite.id,
	};
};

const getOrCreateContributor = async (eventId, email, name) => {
	// Try to find existing contributor
	const existing = await query(
		'SELECT id FROM contributors WHERE event_id = $1 AND email = $2',
		[eventId, email]
	);

	if (existing.rows.length > 0) {
		return existing.rows[0].id;
	}

	// Create new contributor
	const result = await query(
		`INSERT INTO contributors (event_id, email, name)
		 VALUES ($1, $2, $3)
		 RETURNING id`,
		[eventId, email, name || null]
	);

	return result.rows[0].id;
};

const uploadPhotos = async (token, files, captions, contributorName) => {
	// Validate token and get event info
	const inviteInfo = await validateInviteToken(token);
	const { eventId, email, inviteId } = inviteInfo;

	// Validate files
	if (!files || files.length === 0) {
		throw new Error('No photos provided');
	}

	// Validate all files are images
	for (const file of files) {
		validateImageFile(file);
	}

	// Get or create contributor
	const contributorId = await getOrCreateContributor(eventId, email, contributorName);

	// Process each photo
	const uploadedPhotos = [];
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const caption = captions && captions[i] ? captions[i] : null;

		// Save file
		const fileUrl = await saveFile(file);

		// Create photo record
		const photoResult = await query(
			`INSERT INTO photos (event_id, contributor_id, file_url, caption, approved, uploaded_at)
			 VALUES ($1, $2, $3, $4, $5, NOW())
			 RETURNING id`,
			[eventId, contributorId, fileUrl, caption, false] // approved defaults to false
		);

		uploadedPhotos.push(photoResult.rows[0].id);
	}

	// Mark invite as used if at least one photo was uploaded
	if (uploadedPhotos.length > 0 && inviteId) {
		// Only update if used_at is null (first time using)
		await query('UPDATE invites SET used_at = NOW() WHERE id = $1 AND used_at IS NULL', [
			inviteId,
		]);
	}

	return {
		photosUploaded: uploadedPhotos.length,
		event_id: eventId,
		contributor_id: contributorId,
	};
};

module.exports = {
	uploadPhotos,
	validateImageFile,
};


const crypto = require('crypto');
const { query } = require('../db');
const emailService = require('./email.service');

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateEmail = (email) => {
	return EMAIL_REGEX.test(email);
};

const generateSecureToken = () => {
	// Generate 32 bytes (256 bits) of random data and convert to hex string
	return crypto.randomBytes(32).toString('hex');
};

const createInvites = async (eventId, emails) => {
	// Validate emails array
	if (!Array.isArray(emails) || emails.length === 0) {
		throw new Error('emails must be a non-empty array');
	}

	// Validate each email format
	const invalidEmails = emails.filter((email) => !validateEmail(email));
	if (invalidEmails.length > 0) {
		throw new Error(`Invalid email format: ${invalidEmails.join(', ')}`);
	}

	// Fetch event details including creator information
	const eventResult = await query(
		`SELECT e.id, e.person_name, e.creator_id, u.name as creator_name
		 FROM events e
		 JOIN users u ON u.id = e.creator_id
		 WHERE e.id = $1`,
		[eventId]
	);

	if (eventResult.rows.length === 0) {
		throw new Error('Event not found');
	}

	const event = {
		person_name: eventResult.rows[0].person_name,
	};
	const ownerName = eventResult.rows[0].creator_name;

	const invites = [];
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

	// Process each email
	for (const email of emails) {
		// Check if invite already exists for this email and event
		const existingInvite = await query(
			'SELECT id, token, expires_at FROM invites WHERE event_id = $1 AND email = $2',
			[eventId, email]
		);

		let inviteToken;

		if (existingInvite.rows.length > 0) {
			// Reuse existing invite
			const invite = existingInvite.rows[0];
			inviteToken = invite.token;
			invites.push({
				email,
				token: invite.token,
				expires_at: invite.expires_at,
			});
		} else {
			// Create new invite
			const token = generateSecureToken();
			inviteToken = token;

			const result = await query(
				`INSERT INTO invites (event_id, email, token, expires_at)
				 VALUES ($1, $2, $3, $4)
				 RETURNING email, token, expires_at`,
				[eventId, email, token, expiresAt]
			);

			const invite = result.rows[0];
			invites.push(invite);
		}

		// Send email (log errors but don't block invite creation)
		try {
			await emailService.sendInviteEmail({
				to: email,
				event,
				token: inviteToken,
				ownerName,
			});
		} catch (error) {
			console.error(`[INVITE] Failed to send email to ${email} for event ${eventId}:`, error);
			// Continue processing other invites even if email fails
		}
	}

	return invites;
};

const getInviteByToken = async (token) => {
	// Find invite by token
	const result = await query(
		`SELECT i.event_id, i.expires_at, i.used_at,
		        e.title, e.person_name, e.event_type, e.status
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

	// Check if token has been used
	if (invite.used_at) {
		throw new Error('Token has already been used');
	}

	return {
		event_id: invite.event_id,
		title: invite.title,
		person_name: invite.person_name,
		event_type: invite.event_type,
		status: invite.status,
	};
};

module.exports = {
	createInvites,
	getInviteByToken,
};


const inviteService = require('../services/invite.service');

const createInvites = async (req, res) => {
	try {
		const eventId = req.params.id;
		const { emails } = req.body;

		// Validate emails field
		if (!emails) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields: ['emails'],
			});
		}

		if (!Array.isArray(emails)) {
			return res.status(400).json({
				error: 'emails must be an array',
			});
		}

		if (emails.length === 0) {
			return res.status(400).json({
				error: 'emails array cannot be empty',
			});
		}

		const invites = await inviteService.createInvites(eventId, emails);

		res.status(201).json({ invites });
	} catch (error) {
		console.error('Create invites error:', error);

		if (error.message.includes('Invalid email format')) {
			return res.status(400).json({ error: error.message });
		}

		if (error.message.includes('Event not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('must be a non-empty array')) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to create invites' });
	}
};

const getInviteByToken = async (req, res) => {
	try {
		const { token } = req.params;

		if (!token) {
			return res.status(400).json({ error: 'Token is required' });
		}

		const invite = await inviteService.getInviteByToken(token);

		res.json(invite);
	} catch (error) {
		console.error('Get invite by token error:', error);

		if (error.message === 'Invalid token') {
			return res.status(404).json({ error: error.message });
		}

		if (error.message === 'Token has expired') {
			return res.status(410).json({ error: error.message }); // 410 Gone
		}

		if (error.message === 'Token has already been used') {
			return res.status(410).json({ error: error.message }); // 410 Gone
		}

		res.status(500).json({ error: 'Failed to get invite' });
	}
};

module.exports = {
	createInvites,
	getInviteByToken,
};


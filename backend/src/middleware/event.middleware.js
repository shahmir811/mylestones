const { query } = require('../db');

const checkEventOwnership = async (req, res, next) => {
	try {
		const eventId = req.params.id;
		const userId = req.user.id;

		// Check if user is the creator/owner of the event
		const result = await query('SELECT id FROM events WHERE id = $1 AND creator_id = $2', [
			eventId,
			userId,
		]);

		if (result.rows.length === 0) {
			return res.status(403).json({ error: 'Access denied. Only event owner can perform this action.' });
		}

		next();
	} catch (error) {
		console.error('Event ownership check error:', error);
		res.status(500).json({ error: 'Failed to verify event ownership' });
	}
};

module.exports = {
	checkEventOwnership,
};


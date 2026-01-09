const { query } = require('../db');

// Check if user owns the event associated with an album
const checkAlbumOwnership = async (req, res, next) => {
	try {
		const albumId = req.params.albumId || req.params.id;
		const userId = req.user.id;

		// Get event_id from album and check ownership
		const result = await query(
			`SELECT e.id
			 FROM albums a
			 JOIN events e ON e.id = a.event_id
			 WHERE a.id = $1 AND e.creator_id = $2`,
			[albumId, userId]
		);

		if (result.rows.length === 0) {
			return res.status(403).json({ error: 'Access denied. Only event owner can perform this action.' });
		}

		next();
	} catch (error) {
		console.error('Album ownership check error:', error);
		res.status(500).json({ error: 'Failed to verify album ownership' });
	}
};

// Check if user owns the event associated with a photo
const checkPhotoOwnership = async (req, res, next) => {
	try {
		const photoId = req.params.id;
		const userId = req.user.id;

		// Get event_id from photo and check ownership
		const result = await query(
			`SELECT e.id
			 FROM photos p
			 JOIN events e ON e.id = p.event_id
			 WHERE p.id = $1 AND e.creator_id = $2`,
			[photoId, userId]
		);

		if (result.rows.length === 0) {
			return res.status(403).json({ error: 'Access denied. Only event owner can perform this action.' });
		}

		next();
	} catch (error) {
		console.error('Photo ownership check error:', error);
		res.status(500).json({ error: 'Failed to verify photo ownership' });
	}
};

module.exports = {
	checkAlbumOwnership,
	checkPhotoOwnership,
};


const { query } = require('../db');

// Check if user can access print order (owner or publisher)
const checkPrintOrderAccess = async (req, res, next) => {
	try {
		const printOrderId = req.params.id;
		const userId = req.user.id;
		const userRole = req.user.role;

		// Get print order with album and event info
		const result = await query(
			`SELECT po.id, po.publisher_id, e.creator_id
			 FROM print_orders po
			 JOIN albums a ON a.id = po.album_id
			 JOIN events e ON e.id = a.event_id
			 WHERE po.id = $1`,
			[printOrderId]
		);

		if (result.rows.length === 0) {
			return res.status(404).json({ error: 'Print order not found' });
		}

		const printOrder = result.rows[0];

		// Check if user is event owner or publisher assigned to this order
		const isOwner = printOrder.creator_id === userId;
		const isPublisher = printOrder.publisher_id === userId || userRole === 'publisher';

		if (!isOwner && !isPublisher) {
			return res.status(403).json({
				error: 'Access denied. Only event owner or assigned publisher can view this print order.',
			});
		}

		next();
	} catch (error) {
		console.error('Print order access check error:', error);
		res.status(500).json({ error: 'Failed to verify print order access' });
	}
};

module.exports = {
	checkPrintOrderAccess,
};


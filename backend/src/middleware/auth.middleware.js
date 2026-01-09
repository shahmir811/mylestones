const jwt = require('jsonwebtoken');
const { query } = require('../db');

const authenticate = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return res.status(401).json({ error: 'Authentication required' });
		}

		const token = authHeader.substring(7);

		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is not configured');
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		const result = await query('SELECT id, name, email, role FROM users WHERE id = $1', [
			decoded.userId,
		]);

		if (result.rows.length === 0) {
			return res.status(401).json({ error: 'User not found' });
		}

		req.user = result.rows[0];
		next();
	} catch (error) {
		if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
			return res.status(401).json({ error: 'Invalid or expired token' });
		}
		return res.status(401).json({ error: 'Authentication failed' });
	}
};

module.exports = {
	authenticate,
};


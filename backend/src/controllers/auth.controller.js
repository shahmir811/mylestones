const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../db');

const register = async (req, res) => {
	try {
		const { name, email, password, role } = req.body;

		// Check for missing fields
		const missingFields = [];
		if (!name) missingFields.push('name');
		if (!email) missingFields.push('email');
		if (!password) missingFields.push('password');
		if (!role) missingFields.push('role');

		if (missingFields.length > 0) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields,
			});
		}

		if (role !== 'creator' && role !== 'publisher') {
			return res.status(400).json({ error: 'Role must be either "creator" or "publisher"' });
		}

		// Check if email already exists
		const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);

		if (existingUser.rows.length > 0) {
			return res.status(400).json({ error: 'Email already registered' });
		}

		// Hash password
		const passwordHash = await bcrypt.hash(password, 10);

		// Insert user
		const result = await query(
			'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
			[name, email, passwordHash, role]
		);

		const user = result.rows[0];

		// Generate JWT
		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is not configured');
		}

		const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
			expiresIn: process.env.JWT_EXPIRES_IN || '7d',
		});

		res.status(201).json({
			token,
			user,
		});
	} catch (error) {
		console.error('Registration error:', error);
		res.status(500).json({ error: 'Registration failed' });
	}
};

const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Check for missing fields
		const missingFields = [];
		if (!email) missingFields.push('email');
		if (!password) missingFields.push('password');

		if (missingFields.length > 0) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields,
			});
		}

		// Find user by email
		const result = await query('SELECT id, name, email, password_hash, role FROM users WHERE email = $1', [email]);

		if (result.rows.length === 0) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		const user = result.rows[0];

		// Verify password
		const isValidPassword = await bcrypt.compare(password, user.password_hash);

		if (!isValidPassword) {
			return res.status(401).json({ error: 'Invalid credentials' });
		}

		// Generate JWT
		if (!process.env.JWT_SECRET) {
			throw new Error('JWT_SECRET is not configured');
		}

		const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
			expiresIn: process.env.JWT_EXPIRES_IN || '7d',
		});

		// Remove password_hash from response
		const { password_hash, ...userWithoutPassword } = user;

		res.json({
			token,
			user: userWithoutPassword,
		});
	} catch (error) {
		console.error('Login error:', error);
		res.status(500).json({ error: 'Login failed' });
	}
};

const getCurrentUser = async (req, res) => {
	try {
		res.json({ user: req.user });
	} catch (error) {
		console.error('Get current user error:', error);
		res.status(500).json({ error: 'Failed to get user' });
	}
};

module.exports = {
	register,
	login,
	getCurrentUser,
};

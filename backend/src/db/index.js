const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
	// Production / Render
	pool = new Pool({
		connectionString: process.env.DATABASE_URL,
		ssl: {
			rejectUnauthorized: false,
		},
	});
} else {
	// Local development
	const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

	const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

	if (missingVars.length > 0) {
		throw new Error(`Missing required database environment variables: ${missingVars.join(', ')}`);
	}

	pool = new Pool({
		host: process.env.DB_HOST,
		port: parseInt(process.env.DB_PORT, 10),
		database: process.env.DB_NAME,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
	});
}

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };

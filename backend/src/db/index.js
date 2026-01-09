const { Pool } = require('pg');

// Validate required environment variables
const requiredEnvVars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
	throw new Error(
		`Missing required database environment variables: ${missingVars.join(', ')}`
	);
}

const pool = new Pool({
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT, 10),
	database: process.env.DB_NAME,
	user: process.env.DB_USER,
	password: String(process.env.DB_PASSWORD),
});

const query = async (text, params) => {
	return pool.query(text, params);
};

module.exports = {
	query,
	pool,
};


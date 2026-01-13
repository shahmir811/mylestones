require('dotenv').config();
const app = require('./app');
const { query } = require('./db');

const PORT = process.env.PORT || 3000;

// Test database connection on startup
const testConnection = async () => {
	try {
		await query('SELECT 1');
	} catch (error) {
		console.error('Database connection failed:', error.message);
		process.exit(1);
	}
};

// Start server after database connection is verified
testConnection().then(() => {
	app.listen(PORT);
});


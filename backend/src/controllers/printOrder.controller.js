const printOrderService = require('../services/printOrder.service');

const createPrintOrder = async (req, res) => {
	try {
		const userId = req.user.id;
		const { album_id, print_format, shipping_address } = req.body;

		// Validate required fields
		const missingFields = [];
		if (!album_id) missingFields.push('album_id');
		if (!print_format) missingFields.push('print_format');
		if (!shipping_address) missingFields.push('shipping_address');

		if (missingFields.length > 0) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields,
			});
		}

		const printOrder = await printOrderService.createPrintOrder(userId, {
			album_id,
			print_format,
			shipping_address,
		});

		res.status(201).json(printOrder);
	} catch (error) {
		console.error('Create print order error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		if (
			error.message.includes('not ready') ||
			error.message.includes('not finalized') ||
			error.message.includes('already exists') ||
			error.message.includes('Missing required fields')
		) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to create print order' });
	}
};

const getPrintOrder = async (req, res) => {
	try {
		const printOrderId = req.params.id;
		const userId = req.user.id;
		const userRole = req.user.role;

		const printOrder = await printOrderService.getPrintOrderById(printOrderId, userId, userRole);

		res.json(printOrder);
	} catch (error) {
		console.error('Get print order error:', error);

		if (error.message.includes('not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Access denied')) {
			return res.status(403).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to get print order' });
	}
};

module.exports = {
	createPrintOrder,
	getPrintOrder,
};


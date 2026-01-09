const eventService = require('../services/event.service');

const createEvent = async (req, res) => {
	try {
		const userId = req.user.id;
		const { event_type, title, person_name, description, deadline_at, template_type } = req.body;

		// Validate required fields
		const missingFields = [];
		if (!event_type) missingFields.push('event_type');
		if (!title) missingFields.push('title');
		if (!person_name) missingFields.push('person_name');

		if (missingFields.length > 0) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields,
			});
		}

		const event = await eventService.createEvent(userId, {
			event_type,
			title,
			person_name,
			description,
			deadline_at,
			template_type,
		});

		res.status(201).json(event);
	} catch (error) {
		console.error('Create event error:', error);

		if (error.message.includes('Invalid event_type')) {
			return res.status(400).json({ error: error.message });
		}

		if (error.message.includes('Missing required fields')) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to create event' });
	}
};

const getEvents = async (req, res) => {
	try {
		const userId = req.user.id;

		const events = await eventService.getEventsByUserId(userId);

		res.json(events);
	} catch (error) {
		console.error('Get events error:', error);
		res.status(500).json({ error: 'Failed to get events' });
	}
};

const getEvent = async (req, res) => {
	try {
		const eventId = req.params.id;
		const userId = req.user.id;

		const event = await eventService.getEventById(eventId, userId);

		if (!event) {
			return res.status(404).json({ error: 'Event not found' });
		}

		res.json(event);
	} catch (error) {
		console.error('Get event error:', error);
		res.status(500).json({ error: 'Failed to get event' });
	}
};

const updateEventStatus = async (req, res) => {
	try {
		const eventId = req.params.id;
		const userId = req.user.id;
		const { status } = req.body;

		// Validate status field
		if (!status) {
			return res.status(400).json({
				error: 'Missing required fields',
				missingFields: ['status'],
			});
		}

		const event = await eventService.updateEventStatus(eventId, status, userId);

		res.json(event);
	} catch (error) {
		console.error('Update event status error:', error);

		if (error.message.includes('Invalid status')) {
			return res.status(400).json({ error: error.message });
		}

		if (error.message.includes('Event not found')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('Cannot modify event')) {
			return res.status(403).json({ error: error.message });
		}

		if (error.message.includes('Invalid status transition')) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to update event status' });
	}
};

module.exports = {
	createEvent,
	getEvents,
	getEvent,
	updateEventStatus,
};

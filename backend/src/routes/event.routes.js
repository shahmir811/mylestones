const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkEventOwnership } = require('../middleware/event.middleware');
const eventController = require('../controllers/event.controller');
const inviteController = require('../controllers/invite.controller');

// Get all events for authenticated user - protected
router.get('/', authenticate, eventController.getEvents);

// Create event - protected, no ownership check needed (user creates their own)
router.post('/', authenticate, eventController.createEvent);

// Create invites for event - protected, owner only (must come before /:id route)
router.post('/:id/invites', authenticate, checkEventOwnership, inviteController.createInvites);

// Get event - protected, owner only
router.get('/:id', authenticate, checkEventOwnership, eventController.getEvent);

// Update event status - protected, owner only
router.patch('/:id/status', authenticate, checkEventOwnership, eventController.updateEventStatus);

module.exports = router;

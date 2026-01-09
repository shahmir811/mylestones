const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/invite.controller');

// Get invite by token - public route
router.get('/invites/:token', inviteController.getInviteByToken);

module.exports = router;


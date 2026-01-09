const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');

// Upload photos via invite token - public route
router.post('/uploads/:token', uploadController.uploadMiddleware, uploadController.handleUpload);

module.exports = router;

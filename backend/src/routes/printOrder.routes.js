const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkPrintOrderAccess } = require('../middleware/printOrder.middleware');
const printOrderController = require('../controllers/printOrder.controller');

// Create print order - protected, owner only (checked in service)
router.post('/print-orders', authenticate, printOrderController.createPrintOrder);

// Get print order - protected, owner or publisher
router.get('/print-orders/:id', authenticate, checkPrintOrderAccess, printOrderController.getPrintOrder);

module.exports = router;


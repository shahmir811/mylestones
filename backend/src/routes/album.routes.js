const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { checkAlbumOwnership, checkPhotoOwnership } = require('../middleware/album.middleware');
const albumController = require('../controllers/album.controller');

// Get album by event ID - protected, owner only
router.get('/albums/:eventId', authenticate, albumController.getAlbum);

// Update photo - protected, owner only
router.patch('/photos/:id', authenticate, checkPhotoOwnership, albumController.updatePhoto);

// Reorder photos in album - protected, owner only
router.post('/albums/:albumId/reorder', authenticate, checkAlbumOwnership, albumController.reorderPhotos);

// Preview album (generate PDF without finalizing) - protected, owner only
router.post('/albums/:albumId/preview', authenticate, checkAlbumOwnership, albumController.previewAlbum);

// Finalize album - protected, owner only
router.post('/albums/:albumId/finalize', authenticate, checkAlbumOwnership, albumController.finalizeAlbum);

module.exports = router;


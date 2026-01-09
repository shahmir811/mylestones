const uploadService = require('../services/upload.service');
const multer = require('multer');

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
	try {
		uploadService.validateImageFile({
			mimetype: file.mimetype,
			size: 0, // Size will be checked after upload
		});
		cb(null, true);
	} catch (error) {
		cb(new Error(error.message), false);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 10 * 1024 * 1024, // 10MB
	},
});

// Middleware to handle multiple files
const uploadMiddleware = upload.array('photos', 20); // Max 20 photos

const handleUpload = async (req, res) => {
	try {
		const { token } = req.params;
		const { name: contributorName, captions } = req.body;

		if (!token) {
			return res.status(400).json({ error: 'Token is required' });
		}

		if (!req.files || req.files.length === 0) {
			return res.status(400).json({ error: 'No photos provided' });
		}

		// Parse captions if provided as string (form-data)
		let captionsArray = null;
		if (captions) {
			try {
				captionsArray = typeof captions === 'string' ? JSON.parse(captions) : captions;
				if (!Array.isArray(captionsArray)) {
					captionsArray = [captionsArray];
				}
			} catch {
				// If parsing fails, treat as single caption
				captionsArray = [captions];
			}
		}

		// Validate file sizes
		for (const file of req.files) {
			uploadService.validateImageFile(file);
		}

		const result = await uploadService.uploadPhotos(
			token,
			req.files,
			captionsArray,
			contributorName
		);

		res.status(201).json(result);
	} catch (error) {
		console.error('Upload error:', error);

		if (error.message.includes('Invalid token')) {
			return res.status(404).json({ error: error.message });
		}

		if (error.message.includes('expired')) {
			return res.status(410).json({ error: error.message });
		}

		if (error.message.includes('not in collecting status')) {
			return res.status(403).json({ error: error.message });
		}

		if (error.message.includes('Invalid file type') || error.message.includes('File size')) {
			return res.status(400).json({ error: error.message });
		}

		if (error.message.includes('No photos provided')) {
			return res.status(400).json({ error: error.message });
		}

		res.status(500).json({ error: 'Failed to upload photos' });
	}
};

module.exports = {
	handleUpload,
	uploadMiddleware,
};


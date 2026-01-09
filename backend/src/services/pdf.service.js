const puppeteer = require('puppeteer');
const { query } = require('../db');
const path = require('path');
const fs = require('fs').promises;

// Print specifications
// Trim size: 200mm × 200mm
// Bleed: 3mm on each side
// PDF canvas: 206mm × 206mm (200 + 3 + 3)
// DPI: 300
const TRIM_SIZE_MM = 200;
const BLEED_MM = 3;
const CANVAS_SIZE_MM = TRIM_SIZE_MM + BLEED_MM * 2; // 206mm

// PDF storage directory
const PDF_DIR = path.join(__dirname, '../../pdfs');

const ensurePdfDir = async () => {
	try {
		await fs.access(PDF_DIR);
	} catch {
		await fs.mkdir(PDF_DIR, { recursive: true });
	}
};

/**
 * Generate HTML for a single photo page
 * Full-bleed image with proper bleed/trim structure
 */
const generatePhotoPageHTML = (photoUrl, caption, baseUrl) => {
	// Construct full image URL
	const fullImageUrl = photoUrl.startsWith('http') ? photoUrl : `${baseUrl}${photoUrl}`;

	const captionHTML = caption
		? `<div class="caption">${escapeHtml(caption)}</div>`
		: '';

	return `
		<div class="page">
			<div class="bleed">
				<div class="trim">
					<img src="${fullImageUrl}" alt="Photo" />
					${captionHTML}
				</div>
			</div>
		</div>
	`;
};

/**
 * Escape HTML to prevent XSS
 */
const escapeHtml = (text) => {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Generate complete HTML document for the album
 */
const generateAlbumHTML = (photos, baseUrl) => {
	const pagesHTML = photos
		.map((photo) => generatePhotoPageHTML(photo.file_url, photo.caption, baseUrl))
		.join('');

	const isDev = process.env.NODE_ENV !== 'production';

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Album PDF</title>
	<style>
		@page {
			size: 206mm 206mm;
			margin: 0;
		}

		html, body {
			margin: 0;
			padding: 0;
		}

		.page {
			width: 206mm;
			height: 206mm;
			page-break-after: always;
		}

		.bleed {
			width: 206mm;
			height: 206mm;
		}

		.trim {
			width: 200mm;
			height: 200mm;
			margin: 3mm;
			overflow: hidden;
			position: relative;
			${isDev ? 'outline: 0.5mm dashed rgba(0,0,0,0.1);' : ''}
		}

		.trim img {
			width: 100%;
			height: 100%;
			object-fit: cover;
		}

		.caption {
			position: absolute;
			bottom: 20px;
			left: 20px;
			right: 20px;
			background: rgba(0, 0, 0, 0.7);
			color: #fff;
			padding: 15px 20px;
			font-family: Arial, sans-serif;
			font-size: 16px;
			line-height: 1.5;
			text-align: center;
			border-radius: 4px;
		}
	</style>
</head>
<body>
	${pagesHTML}
</body>
</html>
	`;
};

/**
 * Load album with ordered photos from database
 */
const loadAlbumWithPhotos = async (albumId) => {
	// Get album
	const albumResult = await query(
		`SELECT a.id, a.event_id, a.title
		 FROM albums a
		 WHERE a.id = $1`,
		[albumId]
	);

	if (albumResult.rows.length === 0) {
		throw new Error('Album not found');
	}

	const album = albumResult.rows[0];

	// Get ordered photos (only approved photos that are in album_photos)
	const photosResult = await query(
		`SELECT p.id, p.file_url, p.caption
		 FROM photos p
		 INNER JOIN album_photos ap ON ap.photo_id = p.id
		 WHERE ap.album_id = $1 AND p.approved = true
		 ORDER BY ap.position ASC`,
		[albumId]
	);

	if (photosResult.rows.length === 0) {
		throw new Error('No approved photos found in album');
	}

	return {
		album,
		photos: photosResult.rows,
	};
};

/**
 * Generate PDF for an album
 * @param {string} albumId - Album UUID
 * @param {string} baseUrl - Base URL for images (e.g., http://localhost:3000)
 * @returns {Promise<string>} - PDF file path
 */
const generateAlbumPDF = async (albumId, baseUrl = 'http://localhost:3000') => {
	// Ensure PDF directory exists
	await ensurePdfDir();

	// Load album and photos
	const { album, photos } = await loadAlbumWithPhotos(albumId);

	// Generate HTML
	const html = generateAlbumHTML(photos, baseUrl);

	// Launch Puppeteer with improved error handling
	// On macOS, Chrome might need explicit permissions or different launch options
	let browser;
	try {
		const os = require('os');
		const homeDir = os.homedir();
		
		// Try system Chrome first (more reliable on macOS), then Puppeteer's Chrome
		const possiblePaths = [
			// System Chrome (preferred - more stable on macOS)
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			'/Applications/Chromium.app/Contents/MacOS/Chromium',
			// Puppeteer's Chrome (fallback)
			`${homeDir}/.cache/puppeteer/chrome/mac_arm-121.0.6167.85/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`,
		];
		
		let executablePath;
		for (const chromePath of possiblePaths) {
			try {
				await fs.access(chromePath);
				executablePath = chromePath;
				console.log(`Using Chrome at: ${chromePath}`);
				break;
			} catch {
				// Try next path
				continue;
			}
		}

		const launchOptions = {
			headless: 'new', // Use new headless mode to avoid deprecation warning
			executablePath: executablePath, // Explicitly set Chrome path
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-accelerated-2d-canvas',
				'--disable-gpu',
				'--disable-software-rasterizer',
				'--disable-extensions',
				'--disable-background-networking',
				'--disable-background-timer-throttling',
				'--disable-backgrounding-occluded-windows',
				'--disable-breakpad',
				'--disable-client-side-phishing-detection',
				'--disable-component-update',
				'--disable-default-apps',
				'--disable-features=TranslateUI',
				'--disable-hang-monitor',
				'--disable-ipc-flooding-protection',
				'--disable-popup-blocking',
				'--disable-prompt-on-repost',
				'--disable-renderer-backgrounding',
				'--disable-sync',
				'--metrics-recording-only',
				'--no-first-run',
				'--safebrowsing-disable-auto-update',
				'--enable-automation',
				'--password-store=basic',
				'--use-mock-keychain',
			],
			timeout: 60000, // 60 second timeout for browser launch
		};

		browser = await puppeteer.launch(launchOptions);
	} catch (launchError) {
		console.error('Failed to launch Puppeteer browser:', launchError);
		console.error('Error details:', {
			message: launchError.message,
			stack: launchError.stack,
		});
		
		// Provide more helpful error message with troubleshooting steps
		const errorMsg = launchError.message || 'Unknown error';
		
		// Check if it's a Chrome crash issue
		if (errorMsg.includes('Failed to launch') || errorMsg.includes('crash')) {
			throw new Error(
				`PDF generation failed: Chrome browser crashed on launch. ` +
				`This is often a macOS security issue. Solutions: ` +
				`1. Open System Preferences > Security & Privacy > General ` +
				`2. If you see a message about Chrome being blocked, click "Allow Anyway" ` +
				`3. Try manually opening Chrome once to accept any security prompts ` +
				`4. Restart your Node.js server and try again`
			);
		}
		
		throw new Error(
			`PDF generation failed: Could not launch browser. ${errorMsg}. ` +
			`Please check that Chrome is installed and accessible.`
		);
	}

	try {
		const page = await browser.newPage();

		// Set content
		await page.setContent(html, { waitUntil: 'networkidle0' });

		// Wait for images to load
		await page.evaluate(() => {
			return Promise.all(
				Array.from(document.images).map((img) => {
					if (img.complete) return Promise.resolve();
					return new Promise((resolve, reject) => {
						img.onload = resolve;
						img.onerror = reject;
						setTimeout(reject, 5000); // 5 second timeout
					});
				})
			);
		}).catch((err) => {
			console.warn('Some images failed to load:', err.message);
		});

		// Generate PDF filename
		const filename = `album-${albumId}-${Date.now()}.pdf`;
		const filepath = path.join(PDF_DIR, filename);

		// Generate PDF with print specifications
		await page.pdf({
			printBackground: true,
			width: "206mm",
			height: "206mm",
			margin: {
				top: "0mm",
				right: "0mm",
				bottom: "0mm",
				left: "0mm",
			},
			path: filepath,
		});

		// Return relative URL path
		return `/pdfs/${filename}`;
	} finally {
		await browser.close();
	}
};

module.exports = {
	generateAlbumPDF,
};


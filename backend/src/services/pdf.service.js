const puppeteer = require('puppeteer');
const { query } = require('../db');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const https = require('https');

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
	// Validate photoUrl
	if (!photoUrl || typeof photoUrl !== 'string' || photoUrl.trim() === '') {
		throw new Error('Invalid photo URL provided for PDF generation');
	}

	// Construct full image URL
	const fullImageUrl = photoUrl.startsWith('http') ? photoUrl : `${baseUrl}${photoUrl}`;

	const captionHTML = caption ? `<div class="caption">${escapeHtml(caption)}</div>` : '';

	return `
		<div class="page">
			<div class="bleed">
				<div class="trim">
					<img src="${fullImageUrl}" alt="Photo" loading="eager" />
					${captionHTML}
				</div>
			</div>
		</div>
	`;
};

/**
 * Escape HTML to prevent XSS
 */
const escapeHtml = text => {
	const map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;',
	};
	return text.replace(/[&<>"']/g, m => map[m]);
};

/**
 * Generate complete HTML document for the album
 */
const generateAlbumHTML = (photos, baseUrl) => {
	// Filter out any photos with invalid URLs before generating HTML
	const validPhotos = photos.filter(photo => {
		if (!photo || !photo.file_url || typeof photo.file_url !== 'string') {
			console.warn(`[PDF] Skipping photo with invalid file_url: ${photo?.id || 'unknown'}`);
			return false;
		}
		const trimmedUrl = photo.file_url.trim();
		if (trimmedUrl === '') {
			console.warn(`[PDF] Skipping photo with empty file_url: ${photo?.id || 'unknown'}`);
			return false;
		}
		return true;
	});

	if (validPhotos.length === 0) {
		throw new Error('No valid photos with file URLs to generate PDF');
	}

	if (validPhotos.length !== photos.length) {
		console.warn(`[PDF] Filtered out ${photos.length - validPhotos.length} invalid photo(s) before HTML generation`);
	}

	const pagesHTML = validPhotos.map(photo => generatePhotoPageHTML(photo.file_url, photo.caption, baseUrl)).join('');

	const isDev = process.env.NODE_ENV !== 'production';

	return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Album PDF</title>
	<style>
		/* Remove @page rule - let Puppeteer handle page size via explicit dimensions */
		html, body {
			margin: 0;
			padding: 0;
			width: 206mm;
		}
		
		body {
			display: block;
		}

		.page {
			width: 206mm;
			height: 206mm;
			min-height: 206mm;
			max-height: 206mm;
			display: block;
			overflow: hidden;
			box-sizing: border-box;
			margin: 0;
			padding: 0;
			float: none;
			clear: both;
			/* Explicitly prevent any page breaks */
			page-break-after: avoid !important;
			page-break-before: avoid !important;
			page-break-inside: avoid !important;
			break-after: avoid !important;
			break-before: avoid !important;
			break-inside: avoid !important;
		}

		.bleed {
			width: 206mm;
			height: 206mm;
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		.trim {
			width: 200mm;
			height: 200mm;
			margin: 3mm;
			padding: 0;
			overflow: hidden;
			position: relative;
			box-sizing: border-box;
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
const loadAlbumWithPhotos = async albumId => {
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
	// Also ensure file_url is not null or empty
	// Use DISTINCT ON to avoid duplicates, and ensure we get the correct position
	const photosResult = await query(
		`SELECT DISTINCT ON (ap.position) p.id, p.file_url, p.caption, ap.position
		 FROM album_photos ap
		 INNER JOIN photos p ON p.id = ap.photo_id
		 WHERE ap.album_id = $1 
		   AND p.approved = true
		   AND p.file_url IS NOT NULL
		   AND p.file_url != ''
		   AND TRIM(p.file_url) != ''
		 ORDER BY ap.position ASC, p.id`,
		[albumId]
	);


	if (photosResult.rows.length === 0) {
		throw new Error('No approved photos with valid file URLs found in album');
	}

	// Additional client-side filter for safety (shouldn't be needed after SQL filter, but just in case)
	const validPhotos = photosResult.rows.filter(photo => {
		const isValid = photo.file_url && photo.file_url.trim() !== '';
		if (!isValid) {
			console.warn(`[PDF] Filtering out photo ${photo.id} with invalid file_url`);
		}
		return isValid;
	});

	if (validPhotos.length === 0) {
		throw new Error('No photos with valid file URLs found in album');
	}

	// Log if we filtered any photos (shouldn't happen with SQL filter, but useful for debugging)
	if (validPhotos.length !== photosResult.rows.length) {
		console.warn(`[PDF] Filtered out ${photosResult.rows.length - validPhotos.length} photos with invalid file URLs`);
	}

	// Sort by position to ensure correct order (in case DISTINCT changed order)
	const sortedPhotos = validPhotos.sort((a, b) => a.position - b.position);
	
	// Remove position from result (we don't need it after sorting)
	const photosWithoutPosition = sortedPhotos.map(({ position, ...photo }) => photo);


	return {
		album,
		photos: photosWithoutPosition,
	};
};

/**
 * Generate PDF for an album
 * @param {string} albumId - Album UUID
 * @param {string} baseUrl - Base URL for images (e.g., http://localhost:3000 - backend API URL)
 * @returns {Promise<string>} - PDF file path
 */
const generateAlbumPDF = async (albumId, baseUrl = 'http://localhost:3000') => {
	// Ensure PDF directory exists
	await ensurePdfDir();

	// Load album and photos
	const { album, photos } = await loadAlbumWithPhotos(albumId);

	// Final validation: ensure we have valid photos with non-empty file URLs
	if (!photos || photos.length === 0) {
		throw new Error('No valid photos found in album for PDF generation');
	}


	// Generate HTML
	const html = generateAlbumHTML(photos, baseUrl);
	
	// Verify HTML only contains expected number of pages
	const pageCountInHTML = (html.match(/<div class="page">/g) || []).length;
	
	if (pageCountInHTML !== photos.length) {
		console.error(`[PDF] WARNING: HTML page count (${pageCountInHTML}) doesn't match photo count (${photos.length})`);
	}

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
		
		// Set viewport to match PDF page size exactly
		// 206mm at 96 DPI = ~778px, but we'll use a larger viewport for better quality
		const pageWidthPx = 2433; // 206mm at 300 DPI
		const pageHeightPx = pageWidthPx; // Square pages
		
		await page.setViewport({
			width: pageWidthPx,
			height: pageHeightPx * photos.length, // Set height to fit all pages
			deviceScaleFactor: 1,
		});
		
		// Emulate print media to ensure proper page rendering
		await page.emulateMediaType('print');

		// Set content
		await page.setContent(html, { waitUntil: 'networkidle0' });

		// Verify initial page count in DOM
		const initialPageCount = await page.evaluate(() => {
			return document.querySelectorAll('.page').length;
		});
		
		if (initialPageCount !== photos.length) {
			console.error(`[PDF] WARNING: Initial DOM page count (${initialPageCount}) doesn't match expected (${photos.length})`);
		}

		// Wait for images to load and remove pages with failed/invalid images
		const removedPagesCount = await page.evaluate(() => {
			return new Promise((resolve) => {
				const images = Array.from(document.images);
				const removedPages = new Set();
				let loadedCount = 0;
				let removedCount = 0;
				const totalImages = images.length;

				if (totalImages === 0) {
					document.querySelectorAll('.page').forEach(page => page.remove());
					resolve(totalImages); // Return count of pages removed (all of them)
					return;
				}

				const checkAndRemoveInvalid = (img) => {
					const pageElement = img.closest('.page');
					if (!pageElement) return false;
					
					const pageId = Array.from(document.querySelectorAll('.page')).indexOf(pageElement);
					
					if (img.naturalWidth === 0 || img.naturalHeight === 0 || !img.complete) {
						if (!removedPages.has(pageId)) {
							pageElement.remove();
							removedPages.add(pageId);
							removedCount++;
							return true;
						}
					}
					return false;
				};

				const checkComplete = () => {
					loadedCount++;
					if (loadedCount >= totalImages) {
						// Final pass: remove any pages that still have invalid images
						images.forEach(img => {
							checkAndRemoveInvalid(img);
						});
						resolve(removedCount);
					}
				};

				images.forEach((img, index) => {
					// If image is already loaded and valid, mark as complete
					if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
						checkComplete();
						return;
					}

					// Set a timeout for each image
					const timeout = setTimeout(() => {
						checkAndRemoveInvalid(img);
						checkComplete();
					}, 10000); // 10 second timeout per image

					img.onload = () => {
						clearTimeout(timeout);
						// Verify image actually loaded (has dimensions)
						if (checkAndRemoveInvalid(img)) {
						}
						checkComplete();
					};

					img.onerror = () => {
						clearTimeout(timeout);
						// Remove the page if image fails to load
						if (checkAndRemoveInvalid(img)) {
						}
						checkComplete();
					};
				});
			});
		});

		if (removedPagesCount > 0) {
			console.warn(`[PDF] Removed ${removedPagesCount} page(s) with failed or invalid images`);
		}

		// Final verification: count remaining pages with valid images and remove any invalid ones
		const finalValidation = await page.evaluate(() => {
			const pages = Array.from(document.querySelectorAll('.page'));
			let validCount = 0;
			let removedCount = 0;
			const details = [];

			pages.forEach((page, index) => {
				const img = page.querySelector('img');
				// Check if image exists, is loaded, and has valid dimensions
				if (!img) {
					details.push(`Page ${index + 1}: No image element found`);
					page.remove();
					removedCount++;
				} else if (!img.complete) {
					details.push(`Page ${index + 1}: Image not complete (src: ${img.src.substring(0, 50)}...)`);
					page.remove();
					removedCount++;
				} else if (img.naturalWidth === 0 || img.naturalHeight === 0) {
					details.push(`Page ${index + 1}: Image has zero dimensions (${img.naturalWidth}x${img.naturalHeight}, src: ${img.src.substring(0, 50)}...)`);
					page.remove();
					removedCount++;
				} else {
					validCount++;
					details.push(`Page ${index + 1}: Valid (${img.naturalWidth}x${img.naturalHeight})`);
				}
			});

			return { validCount, removedCount, totalBefore: pages.length, details };
		});
		

		if (finalValidation.validCount === 0) {
			throw new Error('No valid pages with images remaining after validation');
		}

		if (finalValidation.removedCount > 0) {
			console.warn(`[PDF] Final validation removed ${finalValidation.removedCount} additional invalid page(s)`);
		}

		// Double-check: verify we have the expected number of pages
		if (finalValidation.validCount !== photos.length) {
			console.error(`[PDF] ERROR: Valid page count (${finalValidation.validCount}) doesn't match photo count (${photos.length})`);
			console.error(`[PDF] This suggests some images failed to load. Check the logs above for details.`);
		}

		// Final verification: count pages in DOM right before PDF generation
		const finalPageCount = await page.evaluate(() => {
			const pages = document.querySelectorAll('.page');
			const validPages = Array.from(pages).filter(page => {
				const img = page.querySelector('img');
				return img && img.complete && img.naturalWidth > 0 && img.naturalHeight > 0;
			});
			// Remove any invalid pages one more time
			pages.forEach(page => {
				const img = page.querySelector('img');
				if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
					page.remove();
				}
			});
			return document.querySelectorAll('.page').length;
		});
		
		if (finalPageCount !== photos.length) {
			console.error(`[PDF] CRITICAL: Final page count (${finalPageCount}) doesn't match expected (${photos.length})`);
			console.error(`[PDF] This will result in empty pages in the PDF.`);
		}

		// Generate PDF filename
		const filename = `album-${albumId}-${Date.now()}.pdf`;
		const filepath = path.join(PDF_DIR, filename);

		// Wait a bit more to ensure all rendering is complete
		await page.waitForTimeout(1000);
		
		// One final check: remove any pages without valid images and verify structure
		const finalCheck = await page.evaluate(() => {
			const pages = Array.from(document.querySelectorAll('.page'));
			const details = [];
			let removed = 0;
			
			pages.forEach((pageEl, idx) => {
				const img = pageEl.querySelector('img');
				if (!img || !img.complete || img.naturalWidth === 0 || img.naturalHeight === 0) {
					details.push(`Removing page ${idx + 1}: invalid image`);
					pageEl.remove();
					removed++;
				} else {
					details.push(`Page ${idx + 1}: valid (${img.naturalWidth}x${img.naturalHeight})`);
				}
			});
			
			const remainingPages = document.querySelectorAll('.page').length;
			return { remainingPages, removed, details };
		});
		
		if (finalCheck.remainingPages !== photos.length) {
			console.error(`[PDF] CRITICAL: Page count mismatch! Expected ${photos.length}, found ${finalCheck.remainingPages}`);
		}

		// Debug: Get the actual HTML structure to verify what Puppeteer sees
		const actualHTML = await page.evaluate(() => {
			const pages = Array.from(document.querySelectorAll('.page'));
			return {
				count: pages.length,
				pages: pages.map((p, idx) => {
					const img = p.querySelector('img');
					return {
						index: idx + 1,
						hasImage: !!img,
						imageComplete: img?.complete || false,
						imageDimensions: img ? `${img.naturalWidth}x${img.naturalHeight}` : 'none',
						imageSrc: img?.src?.substring(0, 80) || 'none'
					};
				})
			};
		});
		
		// Verify body height matches expected page count
		const bodyInfo = await page.evaluate(() => {
			const body = document.body;
			const pages = document.querySelectorAll('.page');
			return {
				bodyHeight: body.offsetHeight,
				bodyScrollHeight: body.scrollHeight,
				pageCount: pages.length,
				expectedHeight: pages.length * 206, // 206mm per page
				hasOverflow: body.scrollHeight > body.offsetHeight
			};
		});
		
		if (bodyInfo.hasOverflow) {
			console.warn(`[PDF] WARNING: Body has overflow, which might cause extra pages`);
			// Fix body height to exactly match page count
			await page.evaluate((pageCount) => {
				document.body.style.height = `${pageCount * 206}mm`;
				document.body.style.maxHeight = `${pageCount * 206}mm`;
				document.body.style.overflow = 'hidden';
			}, finalCheck.remainingPages);
		}

		// Generate PDF with print specifications
		// Explicitly disable header/footer and use exact page dimensions
		await page.pdf({
			printBackground: true,
			width: '206mm',
			height: '206mm',
			margin: {
				top: '0mm',
				right: '0mm',
				bottom: '0mm',
				left: '0mm',
			},
			displayHeaderFooter: false,
			preferCSSPageSize: false, // Use explicit dimensions, not CSS
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

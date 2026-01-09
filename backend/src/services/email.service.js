const { Resend } = require('resend');

// Validate required environment variables
if (!process.env.RESEND_API_KEY) {
	throw new Error('RESEND_API_KEY environment variable is required');
}

if (!process.env.APP_BASE_URL) {
	throw new Error('APP_BASE_URL environment variable is required');
}

if (!process.env.FROM_EMAIL) {
	throw new Error('FROM_EMAIL environment variable is required');
}

// Initialize Resend with API key
// Note: FROM_EMAIL must be onboarding@resend.dev unless a custom domain is verified
const resend = new Resend(process.env.RESEND_API_KEY);
const APP_BASE_URL = process.env.APP_BASE_URL;
const FROM_EMAIL = process.env.FROM_EMAIL;

/**
 * Sends an invite email using Resend
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email address
 * @param {Object} params.event - Event object with person_name
 * @param {string} params.token - Invite token
 * @param {string} params.ownerName - Name of the event owner
 * @returns {Promise<Object>} Success result with email data
 * @throws {Error} If email sending fails
 */
const sendInviteEmail = async ({ to, event, token, ownerName }) => {
	const inviteUrl = `${APP_BASE_URL}/upload/${token}`;

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
	<div style="background-color: #ffffff; padding: 40px 20px; border-radius: 8px;">
		<p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
		
		<p style="font-size: 16px; margin-bottom: 20px;">
			${ownerName} is creating a photo album for ${event.person_name}.
		</p>
		
		<p style="font-size: 16px; margin-bottom: 30px;">
			You're invited to contribute your photos to help make this album special.
		</p>
		
		<div style="text-align: center; margin: 40px 0;">
			<a href="${inviteUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">Upload photos</a>
		</div>
		
		<p style="font-size: 14px; color: #666; margin-top: 40px;">
			If the button doesn't work, you can copy and paste this link into your browser:<br>
			<a href="${inviteUrl}" style="color: #2563eb; word-break: break-all;">${inviteUrl}</a>
		</p>
	</div>
</body>
</html>
	`;

	const text = `
Hello,

${ownerName} is creating a photo album for ${event.person_name}.

You're invited to contribute your photos to help make this album special.

Upload photos: ${inviteUrl}

If the link doesn't work, copy and paste it into your browser.
	`.trim();

	console.log(`[EMAIL] Attempting to send invite email to ${to}`);

	const { data, error } = await resend.emails.send({
		from: FROM_EMAIL,
		to,
		subject: `You're invited to add photos for ${event.person_name}`,
		html,
	});

	if (error) {
		console.error(`[EMAIL] Failed to send invite email to ${to}:`, error);
		throw error;
	}

	console.log(`[EMAIL] Invite email queued successfully to ${to} (ID: ${data?.id})`);

	return { success: true, data };
};

module.exports = {
	sendInviteEmail,
};

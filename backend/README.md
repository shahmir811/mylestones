# Mylestones Backend API

Express.js REST API backend for the Mylestones collaborative photo album platform. Provides secure authentication, event management, photo uploads, album curation, PDF generation, and print order processing.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Password hashing with bcrypt
  - User registration and login
  - Protected routes with middleware

- **Event Management**
  - Create events (celebrations or remembrances)
  - Event status workflow: draft → collecting → finalized → sent_to_print
  - Event ownership validation
  - Automatic album creation on event creation

- **Invitation System**
  - Generate secure invitation tokens
  - Email invitations via Resend
  - Token-based photo uploads (no account required)
  - Token expiration (30 days)
  - One-time use tokens

- **Photo Management**
  - Token-based photo uploads via Multer
  - Photo approval workflow
  - Photo caption support
  - Photo ordering and reordering

- **Album Management**
  - Album creation and management
  - Photo reordering within albums
  - Album finalization
  - Album status tracking

- **PDF Generation**
  - Print-ready PDF generation using Puppeteer
  - 200mm × 200mm trim size with 3mm bleed
  - 300 DPI resolution
  - Full-bleed photo pages with captions

- **Print Orders**
  - Create print orders for finalized albums
  - Automatic PDF generation on order creation
  - Shipping address management
  - Print format specification

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js 4.18.2
- **Database**: PostgreSQL (pg 8.11.3)
- **Authentication**: JWT (jsonwebtoken 9.2.0), bcrypt 5.1.1
- **File Upload**: Multer 1.4.5
- **PDF Generation**: Puppeteer 21.11.0
- **Email**: Resend 3.2.0
- **Development**: Nodemon 3.0.1

## Project Structure

```
backend/
├── src/
│   ├── app.js                    # Express app configuration
│   ├── server.js                 # Server entry point
│   ├── config/                   # Configuration files
│   ├── controllers/              # Request handlers
│   │   ├── auth.controller.js
│   │   ├── event.controller.js
│   │   ├── invite.controller.js
│   │   ├── upload.controller.js
│   │   ├── album.controller.js
│   │   ├── printOrder.controller.js
│   │   └── healthController.js
│   ├── middleware/               # Express middleware
│   │   ├── auth.middleware.js   # JWT authentication
│   │   ├── event.middleware.js  # Event ownership validation
│   │   ├── album.middleware.js  # Album/photo ownership validation
│   │   └── printOrder.middleware.js
│   ├── routes/                   # API routes
│   │   ├── auth.routes.js
│   │   ├── event.routes.js
│   │   ├── invite.routes.js
│   │   ├── upload.routes.js
│   │   ├── album.routes.js
│   │   ├── printOrder.routes.js
│   │   └── healthRoutes.js
│   ├── services/                 # Business logic
│   │   ├── event.service.js
│   │   ├── invite.service.js
│   │   ├── email.service.js
│   │   ├── upload.service.js
│   │   ├── album.service.js
│   │   ├── pdf.service.js
│   │   └── printOrder.service.js
│   ├── db/                       # Database connection
│   │   └── index.js
│   └── utils/                    # Utility functions
├── uploads/                      # Uploaded photo files (gitignored)
├── pdfs/                         # Generated PDF files (gitignored)
├── package.json
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- Google Chrome or Chromium (required for PDF generation with Puppeteer)
- npm or yarn

## Installation

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `backend/` directory:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=mylestones
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password

   # JWT Configuration
   JWT_SECRET=your_super_secret_jwt_key_min_32_chars
   JWT_EXPIRES_IN=7d

   # Email Service (Resend)
   RESEND_API_KEY=your_resend_api_key

   # Base URL for PDF generation (used for image URLs in PDFs)
   BASE_URL=http://localhost:3000
   ```

4. **Set up the database**
   - Create a PostgreSQL database
   - Run database migrations/schema (if available)
   - Update database connection details in `.env`

## Running the Server

### Development Mode

Start the server with auto-reload using nodemon:
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or the PORT specified in `.env`)

### Production Mode

Start the server:
```bash
npm start
```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
  - Body: `{ name, email, password }`
  - Returns: `{ token, user: { id, name, email, role } }`

- `POST /auth/login` - Login and get JWT token
  - Body: `{ email, password }`
  - Returns: `{ token, user: { id, name, email, role } }`

- `GET /auth/me` - Get current user (protected)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ id, name, email, role }`

### Events

- `GET /events` - Get all events for authenticated user (protected)
  - Returns: Array of events

- `POST /events` - Create a new event (protected)
  - Body: `{ event_type, title, person_name, description?, deadline_at?, template_type? }`
  - Returns: Created event with album

- `GET /events/:id` - Get event details (protected, owner only)
  - Returns: Event details with album information

- `PATCH /events/:id/status` - Update event status (protected, owner only)
  - Body: `{ status }`
  - Returns: Updated event

### Invites

- `POST /events/:id/invites` - Create invitations for an event (protected, owner only)
  - Body: `{ emails: string[] }`
  - Returns: Array of created invites with tokens
  - Sends email invitations automatically

- `GET /invites/:token` - Validate invite token (public)
  - Returns: Invite details and event information

### Uploads

- `POST /uploads/:token` - Upload photos via invite token (public)
  - Content-Type: `multipart/form-data`
  - Body: Form data with `photos[]` (array of files) and optional `captions[]`
  - Returns: Array of uploaded photo objects

### Albums

- `GET /albums/:eventId` - Get album by event ID (protected, owner only)
  - Returns: Album with ordered photos

- `PATCH /photos/:id` - Update photo details (protected, owner only)
  - Body: `{ caption?, approved? }`
  - Returns: Updated photo

- `POST /albums/:albumId/reorder` - Reorder photos in album (protected, owner only)
  - Body: `{ photo_ids: string[] }`
  - Returns: Success message

- `POST /albums/:albumId/finalize` - Finalize album (protected, owner only)
  - Returns: Updated album with status 'ready'

### Print Orders

- `POST /print-orders` - Create a print order (protected, owner only)
  - Body: `{ album_id, print_format, shipping_address }`
  - Automatically generates PDF and updates event status to 'sent_to_print'
  - Returns: Created print order with PDF URL

- `GET /print-orders/:id` - Get print order details (protected, owner or publisher)
  - Returns: Print order details with album and event information

### Health Check

- `GET /health` - API health check
  - Returns: `{ status: 'ok', timestamp }`

## Static File Serving

The server serves static files for:
- `/uploads` - Uploaded photos
- `/pdfs` - Generated PDF files

## Event Status Workflow

1. **draft** - Event is created but not accepting photos
   - Can transition to: `collecting`

2. **collecting** - Event is open for photo contributions
   - Can transition to: `finalized`

3. **finalized** - Event owner has finalized the album
   - Can transition to: `sent_to_print`

4. **sent_to_print** - Print order has been created (final state)
   - No further changes allowed

## Database Schema

The application uses PostgreSQL with the following main tables:

- `users` - User accounts
- `events` - Event information
- `albums` - Album collections
- `photos` - Photo metadata
- `album_photos` - Junction table for album-photo relationships with ordering
- `invites` - Invitation tokens and metadata
- `print_orders` - Print order information

## Security Features

- **Authentication**: JWT tokens with configurable expiration
- **Password Hashing**: bcrypt with salt rounds
- **Authorization**: Owner-based access control
- **Secure Tokens**: Crypto-secure random token generation for invites
- **Token Expiration**: 30-day expiration for invite tokens
- **Input Validation**: Request validation in controllers and services
- **SQL Injection Protection**: Parameterized queries with pg

## PDF Generation

PDFs are generated using Puppeteer with the following specifications:

- **Trim Size**: 200mm × 200mm
- **Bleed**: 3mm on all sides
- **Canvas Size**: 206mm × 206mm
- **Resolution**: 300 DPI
- **Format**: Full-bleed images with optional captions

The PDF service:
- Generates HTML pages for each photo
- Uses Puppeteer to render and convert to PDF
- Handles image loading and error cases
- Stores PDFs in the `pdfs/` directory

### Troubleshooting PDF Generation on macOS

If PDF generation fails on macOS:
1. Open System Preferences > Security & Privacy > General
2. If Chrome is blocked, click "Allow Anyway"
3. Manually open Chrome once to accept security prompts
4. Restart the Node.js server

## Email Service

Uses Resend for sending invitation emails:
- Welcome emails for new users
- Invitation emails with secure upload links
- Email validation before sending

Configure your Resend API key in `.env`:
```env
RESEND_API_KEY=your_resend_api_key
```

## Error Handling

The API uses consistent error responses:
```json
{
  "error": "Error message",
  "missingFields": ["field1", "field2"] // Optional
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (authorization failed)
- `404` - Not Found
- `500` - Internal Server Error

## Development

### Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (not yet implemented)

### Database Connection

The server tests the database connection on startup. If the connection fails, the server will exit with an error message.

### File Storage

- **Uploads**: Stored in `backend/uploads/` (gitignored)
- **PDFs**: Stored in `backend/pdfs/` (gitignored)

Ensure these directories exist or have write permissions.

## Testing

Test endpoints using:
- Postman
- cURL
- Any HTTP client

Example request:
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

## Deployment

### Environment Variables

Ensure all required environment variables are set in your production environment:
- Database credentials
- JWT secret (use a strong random string)
- Resend API key
- BASE_URL (production domain)

### Security Considerations

- Use HTTPS in production
- Keep JWT_SECRET secure and never commit it
- Use environment-specific database credentials
- Set appropriate CORS origins
- Rate limit API endpoints in production
- Use a reverse proxy (nginx) for static file serving in production

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure database exists
- Check firewall settings for remote databases

### PDF Generation Issues
- Ensure Chrome/Chromium is installed
- Check file permissions for `pdfs/` directory
- Review macOS security settings (see PDF Generation section)

### File Upload Issues
- Check `uploads/` directory exists and has write permissions
- Verify Multer configuration
- Check file size limits

## License

ISC

## Author

Shahmir Khan Jadoon

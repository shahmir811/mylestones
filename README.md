# Mylestones

A collaborative photo album platform for creating memorable event albums. Mylestones allows you to create events (celebrations or remembrances), invite contributors to share photos, curate albums with drag-and-drop functionality, and generate print-ready PDFs for physical albums.

## Features

### Event Management

- Create events for celebrations or remembrances
- Set event details: title, person name, description, and deadline
- Manage event lifecycle with status workflow: `draft` → `collecting` → `finalized` → `sent_to_print`
- View all your events in one place

### Collaborative Photo Collection

- Generate secure invitation tokens for contributors
- Send email invitations to multiple contributors
- Contributors can upload photos via secure token-based links
- Photos can be organized with captions

### Album Creation & Management

- Automatically create albums when events are created
- Drag-and-drop photo reordering using dnd-kit
- Photo approval workflow
- Finalize albums when ready for printing

### Print-Ready PDF Generation

- Generate high-quality PDFs optimized for printing
- Print specifications: 200mm × 200mm trim size with 3mm bleed (206mm × 206mm canvas)
- 300 DPI resolution
- Full-bleed photo pages with optional captions
- Generated using Puppeteer for reliable PDF rendering

### Print Ordering

- Create print orders for finalized albums
- Specify print format and shipping address
- Automatic PDF generation on order creation
- Order tracking and management

## Tech Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens) with bcrypt
- **File Upload**: Multer
- **PDF Generation**: Puppeteer
- **Email Service**: Resend
- **Development**: Nodemon

### Frontend

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: dnd-kit (Core, Sortable, Utilities)
- **HTTP Client**: Fetch API with custom authenticated requests

## Project Structure

```
mylestones/
├── backend/                 # Express.js backend API
│   ├── src/
│   │   ├── app.js          # Express app configuration
│   │   ├── server.js       # Server entry point
│   │   ├── config/         # Configuration files
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware (auth, validation)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── db/             # Database connection
│   │   └── utils/          # Utility functions
│   ├── uploads/            # Uploaded photo files
│   ├── pdfs/               # Generated PDF files
│   └── package.json
│
├── frontend/               # Next.js frontend application
│   ├── app/                # Next.js App Router pages
│   │   ├── events/         # Event management pages
│   │   ├── upload/         # Photo upload pages
│   │   └── login/          # Authentication page
│   ├── components/         # React components
│   ├── lib/                # Utilities (API client, auth)
│   └── package.json
│
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn
- Google Chrome (required for PDF generation with Puppeteer)

### Environment Variables

#### Backend (`backend/.env`)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mylestones
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Email (Resend)
RESEND_API_KEY=your_resend_api_key

# Base URL for PDF generation
BASE_URL=http://localhost:3000
```

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd mylestones
   ```

2. **Install backend dependencies**

   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**

   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up the database**

   - Create a PostgreSQL database named `mylestones`
   - Run the database migrations/schema (if available)
   - Update the database connection details in `backend/.env`

5. **Configure environment variables**
   - Copy `.env.example` to `.env` in both `backend/` and `frontend/` directories
   - Fill in all required environment variables

### Running the Application

#### Development Mode

1. **Start the backend server**

   ```bash
   cd backend
   npm run dev
   ```

   The backend will run on `http://localhost:3000`

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:3001` (or next available port)

#### Production Mode

1. **Build the frontend**

   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend**

   ```bash
   cd backend
   npm start
   ```

3. **Start the frontend**
   ```bash
   cd frontend
   npm start
   ```

## API Endpoints

### Authentication

- `POST /auth/register` - Register a new user
- `POST /auth/login` - Login and get JWT token

### Events

- `GET /events` - Get all events for authenticated user
- `POST /events` - Create a new event
- `GET /events/:id` - Get event details
- `PATCH /events/:id/status` - Update event status

### Invites

- `POST /events/:id/invites` - Create invitations for an event
- `GET /invites/:token` - Validate invite token

### Uploads

- `POST /upload/:token` - Upload photos via invite token

### Albums

- `GET /albums/:eventId` - Get album by event ID
- `PATCH /photos/:id` - Update photo details
- `POST /albums/:albumId/reorder` - Reorder photos in album
- `POST /albums/:albumId/finalize` - Finalize album

### Print Orders

- `POST /print-orders` - Create a print order
- `GET /print-orders/:id` - Get print order details

### Health Check

- `GET /health` - API health check endpoint

## Key Features Explained

### Event Status Workflow

1. **draft** - Event is created but not yet accepting photos
2. **collecting** - Event is open for photo contributions
3. **finalized** - Event owner has finalized the album and is ready for printing
4. **sent_to_print** - Print order has been created (final state, no further changes)

### Photo Upload Flow

1. Event creator generates invitations with secure tokens
2. Invitations are sent via email to contributors
3. Contributors click the link and are taken to an upload page
4. Contributors upload photos with optional captions
5. Photos await approval by the event owner
6. Owner can reorder, edit, and approve photos
7. Once finalized, the album can be sent for printing

### PDF Generation

- PDFs are generated with print specifications for 200mm × 200mm albums
- Includes 3mm bleed on all sides (206mm × 206mm total canvas)
- High-resolution (300 DPI) rendering
- Full-bleed images with optional captions
- Generated using Puppeteer for reliable browser-based rendering

## Development Notes

### Database Schema

The application uses PostgreSQL with tables for:

- `users` - User accounts
- `events` - Event information
- `albums` - Album collections
- `photos` - Photo metadata
- `album_photos` - Junction table for album-photo relationships with ordering
- `invites` - Invitation tokens and metadata
- `print_orders` - Print order information

### Security

- JWT-based authentication
- Password hashing with bcrypt
- Secure token generation for invitations
- Token expiration (30 days for invites)
- Owner-based access control for events and albums

### File Storage

- Uploaded photos stored in `backend/uploads/`
- Generated PDFs stored in `backend/pdfs/`
- Files served statically via Express

## Troubleshooting

### PDF Generation Issues on macOS

If PDF generation fails on macOS, it may be a Chrome security issue:

1. Open System Preferences > Security & Privacy > General
2. If Chrome is blocked, click "Allow Anyway"
3. Manually open Chrome once to accept security prompts
4. Restart your Node.js server

### Database Connection Issues

- Verify PostgreSQL is running
- Check database credentials in `.env`
- Ensure the database exists
- Check firewall settings if using remote database

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Author

Shahmir Khan Jadoon

---

For more details about specific components, see:

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)

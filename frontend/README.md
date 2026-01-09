# Mylestones Frontend

Next.js 16 frontend application for the Mylestones collaborative photo album platform. Built with React 19, TypeScript, and Tailwind CSS 4, featuring a modern, responsive user interface for managing events, uploading photos, curating albums, and ordering prints.

## Features

- **User Authentication**
  - Login and registration pages
  - JWT token management with localStorage
  - Protected routes with authentication checks
  - Automatic redirects for unauthenticated users

- **Event Management**
  - Create new events (celebrations or remembrances)
  - View all events in a clean, organized list
  - Event details page with status tracking
  - Event status updates

- **Photo Upload**
  - Token-based photo upload (no account required for contributors)
  - Multiple photo uploads
  - Photo caption support
  - Upload progress feedback

- **Album Management**
  - View album with all photos
  - Drag-and-drop photo reordering using dnd-kit
  - Photo approval workflow
  - Album finalization

- **Print Ordering**
  - View finalized albums
  - Create print orders with shipping address
  - Print format selection

- **Responsive Design**
  - Mobile-friendly interface
  - Tailwind CSS for styling
  - Modern UI components

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: dnd-kit (Core 6.1.0, Sortable 8.0.0, Utilities 3.2.2)
- **Fonts**: Geist Sans & Geist Mono (Next.js optimized)

## Project Structure

```
frontend/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout with Header
│   ├── page.tsx                 # Home page
│   ├── globals.css              # Global styles
│   ├── login/                   # Authentication pages
│   │   └── page.tsx
│   ├── events/                  # Event management pages
│   │   ├── page.tsx             # Events list
│   │   ├── new/                 # Create event
│   │   │   └── page.tsx
│   │   └── [id]/                # Event details
│   │       ├── page.tsx         # Event overview
│   │       ├── photos/          # Photo upload
│   │       │   └── page.tsx
│   │       ├── album/           # Album management
│   │       │   └── page.tsx
│   │       └── completed/       # Completed album view
│   │           └── page.tsx
│   ├── upload/                  # Token-based upload
│   │   └── [token]/
│   │       └── page.tsx
│   └── health/                  # Health check
│       └── page.tsx
├── components/                   # React components
│   └── Header.tsx               # Navigation header
├── lib/                         # Utilities
│   ├── api.ts                   # API client functions
│   └── auth.ts                  # Authentication utilities
├── public/                      # Static assets
├── package.json
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js configuration
├── postcss.config.mjs           # PostCSS configuration
├── eslint.config.mjs            # ESLint configuration
└── README.md
```

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Backend API running (see [Backend README](../backend/README.md))

## Installation

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the `frontend/` directory:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
   ```

   Or use `NEXT_PUBLIC_API_URL` (the code checks for both):
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

## Running the Application

### Development Mode

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000` (or the next available port).

### Production Mode

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

### Linting

Run ESLint to check for code issues:
```bash
npm run lint
```

## Key Features

### Authentication Flow

1. User visits protected routes
2. Authentication check using `isAuthenticated()` from `lib/auth.ts`
3. If not authenticated, redirect to `/login`
4. After login, JWT token is stored in localStorage
5. Token is included in all authenticated requests

### API Client

The `lib/api.ts` module provides:

- **`apiRequest<T>(endpoint, options)`** - Basic API requests
- **`authenticatedRequest<T>(endpoint, options, onUnauthorized?)`** - Authenticated requests with automatic token handling
  - Automatically includes JWT token in Authorization header
  - Handles 401 responses and redirects to login
  - Provides callback for unauthorized handling

Example usage:
```typescript
import { authenticatedRequest } from '@/lib/api';

// Fetch events
const events = await authenticatedRequest<Event[]>('/events', {
  method: 'GET',
}, () => {
  router.push('/login');
});
```

### Authentication Utilities

The `lib/auth.ts` module provides:

- **`getToken()`** - Get stored JWT token
- **`setToken(token)`** - Store JWT token
- **`removeToken()`** - Remove JWT token
- **`isAuthenticated()`** - Check if user is authenticated
- **`login(credentials)`** - Login and store token
- **`logout()`** - Logout and remove token

### Protected Routes

Routes are protected using client-side checks:

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function ProtectedPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
    }
  }, [router]);

  // Component content
}
```

### Drag and Drop Photo Reordering

Uses `@dnd-kit` libraries for drag-and-drop functionality:
- `@dnd-kit/core` - Core drag and drop functionality
- `@dnd-kit/sortable` - Sortable list support
- `@dnd-kit/utilities` - Helper utilities

## Pages

### Home (`/`)
- Landing page showing application status

### Login (`/login`)
- User authentication
- Login form with email and password
- Redirects to events page on success

### Events List (`/events`)
- Display all events for authenticated user
- Create new event button
- Link to individual event pages

### Create Event (`/events/new`)
- Form to create new events
- Fields: event type, title, person name, description, deadline, template type
- Creates event and associated album

### Event Details (`/events/[id]`)
- View event information
- See event status
- Navigate to photos, album, or completed views

### Photo Upload (`/events/[id]/photos`)
- Upload photos to an event
- Multiple file uploads
- Optional captions for each photo

### Album Management (`/events/[id]/album`)
- View album with all photos
- Drag-and-drop to reorder photos
- Approve/reject photos
- Finalize album when ready

### Completed Album (`/events/[id]/completed`)
- View finalized album
- Create print orders
- Specify shipping address and print format

### Token Upload (`/upload/[token]`)
- Public upload page for contributors
- No authentication required
- Upload photos via secure token link
- Accessible via email invitation links

## Styling

The application uses Tailwind CSS 4 for styling:

- Utility-first CSS framework
- Responsive design utilities
- Custom color scheme
- Modern UI components

Global styles are defined in `app/globals.css`:
- Tailwind directives
- Custom CSS variables
- Font configurations

## Fonts

Uses Next.js optimized fonts:
- **Geist Sans** - Primary font for UI
- **Geist Mono** - Monospace font for code/data

Fonts are loaded via `next/font/google` for optimal performance.

## TypeScript

The project is fully typed with TypeScript:
- Type-safe API requests
- Interface definitions for data models
- Type checking during development
- Better IDE support and autocomplete

Key type definitions:
- `Event` - Event data structure
- `Album` - Album data structure
- `Photo` - Photo data structure
- `LoginResponse` - Authentication response
- `ApiError` - Error response structure

## Environment Variables

### `NEXT_PUBLIC_API_BASE_URL` or `NEXT_PUBLIC_API_URL`
- Base URL for the backend API
- Must start with `NEXT_PUBLIC_` to be accessible in the browser
- Default: `http://localhost:3000`

## Development

### Hot Reload

Next.js provides automatic hot reload during development:
- Changes to React components update immediately
- API route changes require server restart
- TypeScript errors shown in terminal and browser

### Code Structure

- **Client Components**: Marked with `'use client'` directive
- **Server Components**: Default (no directive needed)
- **API Routes**: Not used in this frontend (API calls go to backend)

### File Naming

- Pages: `page.tsx` in route directories
- Layouts: `layout.tsx`
- Components: PascalCase (e.g., `Header.tsx`)
- Utilities: camelCase (e.g., `api.ts`, `auth.ts`)

## Building for Production

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

3. **Deploy to Vercel** (recommended)
   - Connect your GitHub repository
   - Vercel will detect Next.js automatically
   - Set environment variables in Vercel dashboard
   - Deploy with one click

### Build Output

The build process creates:
- Optimized JavaScript bundles
- Static HTML pages (where possible)
- Optimized images and assets
- Production-ready `.next/` directory

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Other Platforms

Next.js can be deployed to:
- Vercel (recommended for Next.js)
- Netlify
- AWS Amplify
- Docker containers
- Any Node.js hosting

### Environment Variables

Set in your hosting platform:
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL

## Troubleshooting

### API Connection Issues
- Verify backend is running
- Check `NEXT_PUBLIC_API_BASE_URL` environment variable
- Check CORS settings on backend
- Verify network connectivity

### Authentication Issues
- Check localStorage is enabled
- Verify token is being stored correctly
- Check token expiration
- Ensure backend JWT_SECRET matches

### Build Issues
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`
- Verify all environment variables are set

### TypeScript Errors
- Run `npm run lint` to see errors
- Check `tsconfig.json` configuration
- Ensure all imported types are defined

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance

- Automatic code splitting
- Image optimization with Next.js Image component
- Font optimization with `next/font`
- Static page generation where possible
- Client-side routing for fast navigation

## Security

- JWT tokens stored in localStorage
- Automatic token inclusion in requests
- Token removal on logout
- Protected routes with authentication checks
- HTTPS required in production

## License

ISC

## Author

Shahmir Khan Jadoon

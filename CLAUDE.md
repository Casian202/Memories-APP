# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Memories for Two" is a full-stack web application for couples to share memories, events, photos, surprises, and daily motivations. The application is designed to be deployed via Docker with Cloudflare Tunnel support for secure external access.

## Development Commands

### Docker (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Stop services
docker-compose down
```

### Backend (Local Development)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend (Local Development)
```bash
cd frontend
npm install
npm run dev       # Development server on port 3000
npm run build     # Production build
npm run lint      # ESLint
```

### Backup
```bash
docker-compose exec backend python -m app.services.backup_service
```

## Architecture

### Backend (FastAPI + SQLite)
- **Entry Point**: [main.py](backend/app/main.py) - FastAPI app with lifespan events for DB initialization and seeding
- **Configuration**: [config.py](backend/app/config.py) - Pydantic Settings loaded from environment variables
- **Database**: [database.py](backend/app/database.py) - Async SQLAlchemy with SQLite (WAL mode)
- **Models**: `backend/app/models/` - SQLAlchemy ORM models (user, event, photo, surprise, motivation, theme, relationship, message)
- **Schemas**: `backend/app/schemas/` - Pydantic schemas for request/response validation
- **Routers**: `backend/app/routers/` - API endpoints organized by domain (auth, events, photos, surprises, motivations, messages, themes, admin, settings)
- **Services**: `backend/app/services/` - Business logic layer (auth_service, event_service, photo_service, surprise_service, theme_service)

### Frontend (React + Vite)
- **Entry Point**: [main.jsx](frontend/src/main.jsx)
- **App Component**: [App.jsx](frontend/src/App.jsx) - Main routing and layout
- **Pages**: `frontend/src/pages/` - Route-level components (Dashboard, Events, EventDetail, Surprises, Motivations, Settings, Admin, Login)
- **Components**: `frontend/src/components/` - Reusable UI components
- **Context**: `frontend/src/context/` - AuthContext and ThemeContext for global state
- **API Client**: [services/api.js](frontend/src/services/api.js) - Axios instance with JWT interceptors for auth and token refresh

### Key Technologies
- **Backend**: FastAPI, SQLAlchemy (async), aiosqlite, PyJWT (python-jose), bcrypt, Pillow
- **Frontend**: React 18, React Router 6, TanStack Query, Framer Motion, TailwindCSS, Axios, Lucide icons
- **Deployment**: Docker Compose with nginx reverse proxy, Cloudflare Tunnel for HTTPS

## API Structure

All API routes are prefixed with `/api`. Main routers:
- `/api/auth` - Authentication (login, logout, refresh, change-password)
- `/api/events` - Events CRUD and photo management
- `/api/photos` - Photo operations
- `/api/surprises` - Surprise cards with reveal conditions
- `/api/motivations` - Daily motivational messages
- `/api/messages` - Daily messages
- `/api/themes` - Visual themes (9 predefined, auto-activation for special dates)
- `/api/admin` - Admin endpoints (user list, stats)
- `/api/settings` - Application settings

API documentation available at `/docs` (Swagger) and `/redoc` when backend is running.

## Environment Variables

Key variables (see [.env.example](.env.example)):
- `SECRET_KEY` - Secret key for JWT signing (required, min 32 chars in production)
- `DATABASE_URL` - SQLite connection string (default: `sqlite+aiosqlite:///./data/sqlite/memories.db`)
- `CORS_ORIGINS` - Comma-separated allowed origins (default: `*`)
- `UPLOAD_DIR`, `BACKUP_DIR`, `LOG_DIR` - Storage paths
- `MAX_UPLOAD_SIZE` - Max upload size in bytes (default: 52428800 = 50MB)
- `VITE_API_URL` - Frontend API base URL (default: `/api`)

## Data Storage

- `data/sqlite/` - SQLite database file
- `data/photos/` - Uploaded photos (events/, surprises/)
- `data/backups/` - Database backups
- `data/logs/` - Application logs

## Initial Users

Two users are seeded on first run: `hubby` (admin) and `wifey` (user), both with password `memories2024`. Password change is enforced on first login.

## Key Architectural Patterns

### Authentication Flow
- JWT tokens (access + refresh) stored in localStorage
- Session tracking in database (`sessions` table)
- Token refresh handled automatically via axios interceptors in [api.js](frontend/src/services/api.js)
- Protected routes redirect to login on 401 response

### Backend Layer Separation
- **Routers**: HTTP request/response handling, dependency injection for auth
- **Services**: Business logic and database operations
- **Models**: SQLAlchemy async ORM definitions
- **Schemas**: Pydantic validation for request/response

### State Management
- React Context: Auth state (AuthContext), Theme state (ThemeContext)
- TanStack Query: Server state with caching and background refetch

### Database Design
- SQLite with WAL mode for better concurrency
- Maximum 2 users enforced at application level
- Relationships: User → Events, Photos, Surprises, Motivations, Sessions

### Theming System
- 9 predefined themes (Default, Harry Potter houses, holidays, vacations)
- Colors stored in database, applied via CSS custom properties
- Seasonal automatic activation based on dates

## Nginx Configuration

Nginx acts as reverse proxy on port 8184:
- Rate limiting: 10 req/s for API, 5 req/min for auth endpoints
- Static file serving for `/photos`
- Gzip compression and security headers
"""
Main FastAPI application.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
import os

from app.config import settings
from app.database import init_db, get_db, engine
from app.routers import api_router
from app.seeds.themes import seed_themes
from app.services.user_json_service import UserJSONService
from app.services.auth_service import AuthService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting application...")

    # Initialize database tables
    print("Initializing database...")
    await init_db()
    print("Database initialized.")

    # Initialize JSON user storage
    print("Initializing user storage...")
    UserJSONService.initialize_storage()
    print("User storage initialized.")

    # Sync users from JSON to database
    print("Syncing users from JSON to database...")
    async for db in get_db():
        for user_data in UserJSONService.get_all_users():
            try:
                await AuthService.sync_user_to_db(user_data, db)
                print(f"Synced user: {user_data['username']}")
            except Exception as e:
                print(f"Error syncing user {user_data['username']}: {e}")
        break
    print("User sync complete.")

    # Seed initial data (themes)
    print("Seeding themes...")
    async for db in get_db():
        await seed_themes(db)
        break
    print("Themes seeded.")

    print("Application startup complete!")

    yield
    # Shutdown
    pass


app = FastAPI(
    title="Făcută cu ❤️ pentru noi doi API",
    description="API pentru aplicația de cuplu",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Mount static files for photos
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "events"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "surprises"), exist_ok=True)
os.makedirs(settings.BACKUP_DIR, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health_check():
    """Health check endpoint with database verification."""
    try:
        # Test database connection
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1"))
            result.fetchone()

        # Check if required tables exist
        async with engine.begin() as conn:
            result = await conn.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
            ))
            users_table = result.fetchone()

            if not users_table:
                return {
                    "status": "unhealthy",
                    "version": "1.0.0",
                    "error": "Users table not found"
                }

        return {
            "status": "healthy",
            "version": "1.0.0",
            "database": "connected",
            "tables": "ok"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "version": "1.0.0",
            "error": str(e)
        }


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Memories for Two API", "docs": "/docs"}
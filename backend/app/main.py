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
from sqlalchemy import text


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting application...")

    # Initialize database tables
    print("Initializing database...")
    await init_db()
    print("Database initialized.")

    # Run migrations for new columns
    print("Running migrations...")
    async with engine.begin() as conn:
        # Add background_image column to themes if not exists
        try:
            await conn.execute(text("SELECT background_image FROM themes LIMIT 1"))
        except Exception:
            await conn.execute(text("ALTER TABLE themes ADD COLUMN background_image VARCHAR(500)"))
            print("Added background_image column to themes table")
        # Add notification_dismissed column to surprises if not exists
        try:
            await conn.execute(text("SELECT notification_dismissed FROM surprises LIMIT 1"))
            # Fix any NULL values from initial migration
            await conn.execute(text("UPDATE surprises SET notification_dismissed = 0 WHERE notification_dismissed IS NULL"))
        except Exception:
            await conn.execute(text("ALTER TABLE surprises ADD COLUMN notification_dismissed BOOLEAN DEFAULT 0"))
            await conn.execute(text("UPDATE surprises SET notification_dismissed = 0 WHERE notification_dismissed IS NULL"))
            print("Added notification_dismissed column to surprises table")
        # Add media_type column to photos if not exists
        try:
            await conn.execute(text("SELECT media_type FROM photos LIMIT 1"))
        except Exception:
            await conn.execute(text("ALTER TABLE photos ADD COLUMN media_type VARCHAR(10) DEFAULT 'image'"))
            await conn.execute(text("UPDATE photos SET media_type = 'image' WHERE media_type IS NULL"))
            print("Added media_type column to photos table")
        # Add transcoding_status column to photos if not exists
        try:
            await conn.execute(text("SELECT transcoding_status FROM photos LIMIT 1"))
        except Exception:
            await conn.execute(text("ALTER TABLE photos ADD COLUMN transcoding_status VARCHAR(20)"))
            print("Added transcoding_status column to photos table")
        # Add map fields to coming_soon_pages if not exists
        try:
            await conn.execute(text("SELECT map_enabled FROM coming_soon_pages LIMIT 1"))
        except Exception:
            await conn.execute(text("ALTER TABLE coming_soon_pages ADD COLUMN map_enabled BOOLEAN DEFAULT 0"))
            await conn.execute(text("ALTER TABLE coming_soon_pages ADD COLUMN map_destination_lat REAL"))
            await conn.execute(text("ALTER TABLE coming_soon_pages ADD COLUMN map_destination_lng REAL"))
            await conn.execute(text("ALTER TABLE coming_soon_pages ADD COLUMN map_destination_name VARCHAR(200)"))
            await conn.execute(text("ALTER TABLE coming_soon_pages ADD COLUMN map_waypoints_json TEXT"))
            await conn.execute(text("ALTER TABLE coming_soon_pages ADD COLUMN map_message TEXT"))
            print("Added map columns to coming_soon_pages table")
        # Add media_type and transcoding_status to coming_soon_photos if not exists
        try:
            await conn.execute(text("SELECT media_type FROM coming_soon_photos LIMIT 1"))
        except Exception:
            await conn.execute(text("ALTER TABLE coming_soon_photos ADD COLUMN media_type VARCHAR(10) DEFAULT 'image'"))
            print("Added media_type column to coming_soon_photos table")
        try:
            await conn.execute(text("SELECT transcoding_status FROM coming_soon_photos LIMIT 1"))
        except Exception:
            await conn.execute(text("ALTER TABLE coming_soon_photos ADD COLUMN transcoding_status VARCHAR(20)"))
            print("Added transcoding_status column to coming_soon_photos table")
    print("Migrations complete.")

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

    # Clean up stale chunked upload temp files (older than 24h)
    import shutil
    import time
    temp_dir = os.path.join(settings.UPLOAD_DIR, "temp")
    if os.path.exists(temp_dir):
        now = time.time()
        for entry in os.listdir(temp_dir):
            entry_path = os.path.join(temp_dir, entry)
            if os.path.isdir(entry_path):
                age = now - os.path.getmtime(entry_path)
                if age > 86400:  # 24 hours
                    shutil.rmtree(entry_path, ignore_errors=True)
                    print(f"Cleaned up stale upload: {entry}")
    os.makedirs(temp_dir, exist_ok=True)
    print("Temp upload directory ready.")

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
os.makedirs(os.path.join(settings.UPLOAD_DIR, "coming_soon"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "themes"), exist_ok=True)
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
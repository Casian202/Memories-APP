"""
Database configuration and session management.
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import event, text
import os
import asyncio

from app.config import settings

# Ensure database directory exists
db_url = settings.DATABASE_URL
# Handle both relative (3 slashes) and absolute (4 slashes) paths
if db_url.startswith("sqlite+aiosqlite:////"):
    db_path = db_url.replace("sqlite+aiosqlite:///", "")  # keeps leading /
else:
    db_path = db_url.replace("sqlite+aiosqlite:///", "")
os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
)

# Session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# Base class for models
Base = declarative_base()


async def init_db():
    """Initialize database and create tables."""
    async with engine.begin() as conn:
        # Import all models to ensure they are registered
        from app.models import user, relationship, event, photo, surprise, motivation, message, theme, coming_soon
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Enable WAL mode for SQLite
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA synchronous=NORMAL"))
        await conn.execute(text("PRAGMA cache_size=-64000"))  # 64MB cache
        await conn.execute(text("PRAGMA foreign_keys=ON"))


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_db():
    """Close database connections."""
    await engine.dispose()
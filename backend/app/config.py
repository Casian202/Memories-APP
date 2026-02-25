"""
Application configuration settings.
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    APP_NAME: str = "Făcută cu ❤️ pentru noi doi"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Database - use 4 slashes for absolute path in Docker
    DATABASE_URL: str = "sqlite+aiosqlite:////data/sqlite/memories.db"
    
    # JWT Settings
    JWT_SECRET: str = "your-super-secret-key-change-in-production-min-32-characters"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:8184,http://127.0.0.1:8184,*"
    
    # File Storage
    UPLOAD_DIR: str = "/data/photos"
    BACKUP_DIR: str = "/data/backups"
    LOG_DIR: str = "/data/logs"
    USERS_FILE: str = "/data/sqlite/users.json"  # JSON file for user storage
    MAX_UPLOAD_SIZE: int = 200  # MB (increased for video uploads)
    
    # Password requirements
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_NUMBER: bool = True
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
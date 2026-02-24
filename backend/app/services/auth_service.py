"""
Authentication service.

This service handles authentication using JSON-based user storage
while maintaining database sessions for JWT token management.
"""
from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.user import User
from app.models.theme import Session
from app.schemas.user import UserCreate, UserLogin, UserResponse, ChangePassword, CreateUserRequest
from app.services.user_json_service import UserJSONService
from app.utils.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.config import settings


class AuthService:
    """Authentication service for user management."""

    @staticmethod
    def get_json_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
        """Get a user by ID from JSON storage."""
        return UserJSONService.get_user_by_id(user_id)

    @staticmethod
    def get_json_user_by_username(username: str) -> Optional[Dict[str, Any]]:
        """Get a user by username from JSON storage."""
        return UserJSONService.get_user_by_username(username)

    @staticmethod
    async def get_db_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
        """Get a user by username from database (for backward compatibility)."""
        result = await db.execute(select(User).where(User.username == username.lower()))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_db_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
        """Get a user by ID from database."""
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_count() -> int:
        """Get the total number of users from JSON storage."""
        return UserJSONService.get_user_count()

    @staticmethod
    def verify_admin_password(password: str) -> bool:
        """Verify the master admin password."""
        return UserJSONService.verify_master_password(password)

    @staticmethod
    def create_json_user(user_data: CreateUserRequest) -> Dict[str, Any]:
        """Create a new user in JSON storage."""
        return UserJSONService.create_user(
            username=user_data.username,
            password=user_data.password,
            role=user_data.role,
            display_name=user_data.display_name
        )

    @staticmethod
    async def sync_user_to_db(user_data: Dict[str, Any], db: AsyncSession) -> User:
        """Sync JSON user to database for session management."""
        # First try to find by ID (preferred)
        result = await db.execute(
            select(User).where(User.id == user_data["id"])
        )
        db_user = result.scalar_one_or_none()

        if not db_user:
            # Fallback: try by username
            result = await db.execute(
                select(User).where(User.username == user_data["username"])
            )
            db_user = result.scalar_one_or_none()

        if db_user:
            # Update existing user
            db_user.password_hash = user_data["password_hash"]
            db_user.display_name = user_data.get("display_name")
            db_user.is_admin = user_data.get("is_admin", False)
            db_user.force_password_change = user_data.get("must_change_password", False)
            if user_data.get("avatar_path"):
                db_user.avatar_path = user_data["avatar_path"]
        else:
            # Create new user in database with the same ID as JSON
            db_user = User(
                id=user_data["id"],
                username=user_data["username"],
                password_hash=user_data["password_hash"],
                display_name=user_data.get("display_name"),
                is_admin=user_data.get("is_admin", False),
                force_password_change=user_data.get("must_change_password", False),
                avatar_path=user_data.get("avatar_path"),
            )
            db.add(db_user)

        await db.commit()
        await db.refresh(db_user)
        return db_user

    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserCreate, is_admin: bool = False) -> User:
        """Create a new user. Only allowed if less than 2 users exist."""
        # Check if max users reached
        count = UserJSONService.get_user_count()
        if count >= 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Numarul maxim de utilizatori a fost atins"
            )

        # Check if username exists in JSON
        if UserJSONService.get_user_by_username(user_data.username):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username-ul exista deja"
            )

        # Create user in JSON storage
        json_user = UserJSONService.create_user(
            username=user_data.username,
            password=user_data.password,
            role="admin" if is_admin else "user",
            display_name=user_data.display_name,
            must_change_password=False
        )

        # Sync to database
        db_user = await AuthService.sync_user_to_db(json_user, db)

        return db_user

    @staticmethod
    async def authenticate_user(db: AsyncSession, login_data: UserLogin) -> Tuple[User, str, str]:
        """
        Authenticate a user and return tokens.
        Returns (user, access_token, refresh_token).
        Uses JSON storage for credentials, database for sessions.
        """
        # Get user from JSON storage
        json_user = UserJSONService.get_user_by_username(login_data.username)

        if not json_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username sau parola incorecta"
            )

        # Verify password using JSON hash
        if not UserJSONService.verify_password(login_data.password, json_user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username sau parola incorecta"
            )

        # Sync user to database for session management
        db_user = await AuthService.sync_user_to_db(json_user, db)

        # Create tokens
        access_token = create_access_token(
            data={"sub": db_user.id, "username": db_user.username, "is_admin": db_user.is_admin}
        )
        refresh_token = create_refresh_token(
            data={"sub": db_user.id, "type": "refresh"}
        )

        # Store session in database
        session = Session(
            user_id=db_user.id,
            token=access_token,
            refresh_token=refresh_token,
            expires_at=datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        db.add(session)
        await db.commit()

        return db_user, access_token, refresh_token

    @staticmethod
    async def logout(db: AsyncSession, token: str) -> None:
        """Logout user by invalidating the session."""
        result = await db.execute(select(Session).where(Session.token == token))
        session = result.scalar_one_or_none()

        if session:
            await db.delete(session)
            await db.commit()

    @staticmethod
    async def logout_all_sessions(db: AsyncSession, user_id: int) -> None:
        """Logout from all sessions for a user."""
        result = await db.execute(select(Session).where(Session.user_id == user_id))
        sessions = result.scalars().all()

        for session in sessions:
            await db.delete(session)

        await db.commit()

    @staticmethod
    async def refresh_access_token(db: AsyncSession, refresh_token: str) -> Tuple[str, str]:
        """Refresh access token using refresh token."""
        payload = verify_token(refresh_token)

        if not payload or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token invalid"
            )

        user_id = payload.get("sub")

        # Get user from JSON storage
        json_user = UserJSONService.get_user_by_id(user_id)

        if not json_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Utilizator inexistent"
            )

        # Sync to database
        db_user = await AuthService.sync_user_to_db(json_user, db)

        # Create new tokens
        new_access_token = create_access_token(
            data={"sub": db_user.id, "username": db_user.username, "is_admin": db_user.is_admin}
        )
        new_refresh_token = create_refresh_token(
            data={"sub": db_user.id, "type": "refresh"}
        )

        # Update session
        result = await db.execute(
            select(Session).where(Session.refresh_token == refresh_token)
        )
        session = result.scalar_one_or_none()

        if session:
            session.token = new_access_token
            session.refresh_token = new_refresh_token
            session.expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            await db.commit()

        return new_access_token, new_refresh_token

    @staticmethod
    async def change_password(
        db: AsyncSession,
        user: User,
        password_data: ChangePassword
    ) -> User:
        """Change user password in JSON storage and sync to database."""
        # Get user from JSON storage
        json_user = UserJSONService.get_user_by_id(user.id)

        if not json_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilizatorul nu a fost gasit"
            )

        # Verify current password
        if not UserJSONService.verify_password(password_data.current_password, json_user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parola curenta este incorecta"
            )

        # Update password in JSON storage
        updated_user = UserJSONService.update_user_password(
            user_id=user.id,
            new_password=password_data.new_password,
            set_must_change=False
        )

        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Eroare la actualizarea parolei"
            )

        # Sync to database
        db_user = await AuthService.sync_user_to_db(updated_user, db)

        return db_user

    @staticmethod
    async def update_user(
        db: AsyncSession,
        user: User,
        display_name: Optional[str] = None,
        birthday: Optional[datetime] = None,
        avatar_path: Optional[str] = None
    ) -> User:
        """Update user profile in JSON storage and database."""
        # Update in JSON storage
        update_data = {}
        if display_name is not None:
            update_data["display_name"] = display_name
        if birthday is not None:
            update_data["birthday"] = str(birthday)
        if avatar_path is not None:
            update_data["avatar_path"] = avatar_path

        if update_data:
            UserJSONService.update_user(user.id, **update_data)

        # Update database user
        db_user = await AuthService.get_db_user_by_id(db, user.id)
        if not db_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilizatorul nu a fost gasit"
            )

        if display_name is not None:
            db_user.display_name = display_name
        if birthday is not None:
            db_user.birthday = birthday
        if avatar_path is not None:
            db_user.avatar_path = avatar_path

        db_user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(db_user)

        return db_user
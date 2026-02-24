"""
JSON-based user storage service.

This service manages users stored in a JSON file instead of the database.
The master admin password is stored hashed in code only (NOT in the JSON file).
"""
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from passlib.context import CryptContext

from app.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Master admin password hash for "FXAU2FKZ5EAGM!"
# This is stored in CODE ONLY, not in the JSON file for security
MASTER_ADMIN_PASSWORD_HASH = pwd_context.hash("FXAU2FKZ5EAGM!")


class UserJSONService:
    """Service for managing users stored in JSON file."""

    @classmethod
    def get_users_file_path(cls) -> str:
        """Get the full path to the users JSON file."""
        return settings.USERS_FILE

    @classmethod
    def initialize_storage(cls) -> None:
        """Initialize the JSON storage file if it doesn't exist."""
        users_file = settings.USERS_FILE
        os.makedirs(os.path.dirname(users_file), exist_ok=True)

        if not os.path.exists(users_file):
            # Only store users array, admin password hash is in CODE only
            initial_data = {
                "users": []
            }
            cls._write_users_file(initial_data)

    @classmethod
    def _read_users_file(cls) -> Dict[str, Any]:
        """Read the users JSON file."""
        users_file = settings.USERS_FILE
        if not os.path.exists(users_file):
            cls.initialize_storage()

        with open(users_file, "r", encoding="utf-8") as f:
            return json.load(f)

    @classmethod
    def _write_users_file(cls, data: Dict[str, Any]) -> None:
        """Write to the users JSON file."""
        users_file = settings.USERS_FILE
        os.makedirs(os.path.dirname(users_file), exist_ok=True)
        with open(users_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

    @classmethod
    def verify_master_password(cls, password: str) -> bool:
        """Verify the master admin password against the hash stored in code."""
        return pwd_context.verify(password, MASTER_ADMIN_PASSWORD_HASH)

    @classmethod
    def get_all_users(cls) -> List[Dict[str, Any]]:
        """Get all users from the JSON file."""
        data = cls._read_users_file()
        return data.get("users", [])

    @classmethod
    def get_user_by_id(cls, user_id: int) -> Optional[Dict[str, Any]]:
        """Get a user by ID."""
        users = cls.get_all_users()
        for user in users:
            if user.get("id") == user_id:
                return user
        return None

    @classmethod
    def get_user_by_username(cls, username: str) -> Optional[Dict[str, Any]]:
        """Get a user by username (case-insensitive)."""
        users = cls.get_all_users()
        username_lower = username.lower()
        for user in users:
            if user.get("username", "").lower() == username_lower:
                return user
        return None

    @classmethod
    def get_user_count(cls) -> int:
        """Get the total number of users."""
        return len(cls.get_all_users())

    @classmethod
    def get_next_user_id(cls) -> int:
        """Get the next available user ID."""
        users = cls.get_all_users()
        if not users:
            return 1
        return max(user.get("id", 0) for user in users) + 1

    @classmethod
    def create_user(
        cls,
        username: str,
        password: str,
        role: str = "user",
        display_name: Optional[str] = None,
        must_change_password: bool = False  # Default changed to False - no forced password change
    ) -> Dict[str, Any]:
        """Create a new user in the JSON file."""
        # Check if max users reached (max 2)
        if cls.get_user_count() >= 2:
            raise ValueError("Numarul maxim de utilizatori a fost atins")

        # Check if username exists
        if cls.get_user_by_username(username):
            raise ValueError("Username-ul exista deja")

        # Validate role
        if role not in ["admin", "user"]:
            raise ValueError("Rol invalid. Trebuie sa fie 'admin' sau 'user'")

        # Create user
        user = {
            "id": cls.get_next_user_id(),
            "username": username.lower(),
            "password_hash": pwd_context.hash(password),
            "display_name": display_name or username,
            "role": role,
            "is_admin": role == "admin",
            "must_change_password": must_change_password,
            "avatar_path": None,
            "birthday": None,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        # Save to file
        data = cls._read_users_file()
        data["users"].append(user)
        cls._write_users_file(data)

        return user

    @classmethod
    def update_user_password(cls, user_id: int, new_password: str, set_must_change: bool = False) -> Optional[Dict[str, Any]]:
        """Update a user's password."""
        data = cls._read_users_file()
        users = data.get("users", [])

        for i, user in enumerate(users):
            if user.get("id") == user_id:
                users[i]["password_hash"] = pwd_context.hash(new_password)
                users[i]["must_change_password"] = set_must_change
                users[i]["updated_at"] = datetime.utcnow().isoformat()
                data["users"] = users
                cls._write_users_file(data)
                return users[i]

        return None

    @classmethod
    def update_user(cls, user_id: int, **kwargs) -> Optional[Dict[str, Any]]:
        """Update user fields."""
        data = cls._read_users_file()
        users = data.get("users", [])

        for i, user in enumerate(users):
            if user.get("id") == user_id:
                for key, value in kwargs.items():
                    if value is not None and key in ["display_name", "avatar_path", "birthday"]:
                        users[i][key] = value
                users[i]["updated_at"] = datetime.utcnow().isoformat()
                data["users"] = users
                cls._write_users_file(data)
                return users[i]

        return None

    @classmethod
    def verify_password(cls, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @classmethod
    def sync_user_to_database(cls, user_data: Dict[str, Any], db) -> Any:
        """Sync a JSON user to the database for session management."""
        from app.models.user import User
        from sqlalchemy import select

        # Check if user exists in database
        result = db.execute(
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
            if user_data.get("birthday"):
                db_user.birthday = user_data["birthday"]
        else:
            # Create new user in database
            db_user = User(
                username=user_data["username"],
                password_hash=user_data["password_hash"],
                display_name=user_data.get("display_name"),
                is_admin=user_data.get("is_admin", False),
                force_password_change=user_data.get("must_change_password", False),
                avatar_path=user_data.get("avatar_path"),
            )
            db.add(db_user)

        db.commit()
        db.refresh(db_user)
        return db_user
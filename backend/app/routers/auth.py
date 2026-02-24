"""
Authentication routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import timedelta
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserLogin, Token, ChangePassword, RefreshToken,
    AdminSetupRequest, AdminSetupResponse, CreateUserRequest, UserJSONResponse,
    CreateUserResponse
)
from app.services.auth_service import AuthService
from app.services.user_json_service import UserJSONService
from app.utils.security import get_current_user, get_current_active_user, create_access_token, verify_token
from app.config import settings

router = APIRouter()


# Temporary token storage for admin setup (in-memory, resets on restart)
_admin_setup_tokens = set()


def verify_admin_setup_token(token: str) -> bool:
    """Verify if a token is a valid admin setup token."""
    return token in _admin_setup_tokens


def create_admin_setup_token() -> str:
    """Create a temporary token for admin setup (valid for 5 minutes)."""
    token = create_access_token(
        data={"type": "admin_setup"},
        expires_delta=timedelta(minutes=5)
    )
    _admin_setup_tokens.add(token)
    return token


@router.post("/admin-verify", response_model=AdminSetupResponse)
async def admin_verify(
    request: AdminSetupRequest
):
    """
    Verify the master admin password and return a temporary token.
    This token can be used to create users (valid for 5 minutes).
    """
    # Verify master password
    if not AuthService.verify_admin_password(request.admin_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Parola de administrator incorecta"
        )

    # Create temporary token for user creation
    temp_token = create_admin_setup_token()

    return AdminSetupResponse(
        success=True,
        message="Autentificare de administrator reusita. Puteti crea utilizatori.",
        temp_token=temp_token
    )


@router.post("/create-user", response_model=CreateUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: CreateUserRequest,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user. Requires a valid temp token from /admin-verify endpoint.
    The temp token must be provided in the Authorization header as: Bearer <temp_token>
    Maximum 2 users allowed.
    """
    # Extract token from Authorization header
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorizare necesar. Folositi Authorization: Bearer <temp_token>"
        )

    temp_token = authorization.replace("Bearer ", "")

    # Verify temporary token
    if not verify_admin_setup_token(temp_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid sau expirat. Reincercati /admin-verify."
        )

    # Check max users
    user_count = UserJSONService.get_user_count()
    if user_count >= 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Numarul maxim de utilizatori a fost atins"
        )

    try:
        # Create user in JSON storage
        json_user = AuthService.create_json_user(user_data)

        # Sync to database
        await AuthService.sync_user_to_db(json_user, db)

        # Remove the used token
        _admin_setup_tokens.discard(temp_token)

        # Auto-create relationship if we now have 2 users
        new_user_count = UserJSONService.get_user_count()
        if new_user_count == 2:
            from sqlalchemy import select as sa_select
            from app.models.relationship import Relationship
            from datetime import date as date_type

            rel_result = await db.execute(sa_select(Relationship))
            existing_rel = rel_result.scalar_one_or_none()

            if not existing_rel:
                all_users_result = await db.execute(sa_select(User))
                all_users = all_users_result.scalars().all()

                if len(all_users) >= 2:
                    relationship = Relationship(
                        partner1_id=all_users[0].id,
                        partner2_id=all_users[1].id,
                        relationship_name="Noi",
                        start_date=date_type.today()
                    )
                    db.add(relationship)
                    await db.commit()

        return CreateUserResponse(
            id=json_user["id"],
            username=json_user["username"],
            role=json_user["role"],
            must_change_password=json_user["must_change_password"],
            created_at=json_user["created_at"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint (OAuth2 form data)."""
    login_data = UserLogin(username=form_data.username, password=form_data.password)
    user, access_token, refresh_token = await AuthService.authenticate_user(db, login_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(user)
    )


@router.post("/login/json", response_model=Token)
async def login_json(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """Login endpoint (JSON body)."""
    user, access_token, refresh_token = await AuthService.authenticate_user(db, login_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(user)
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Logout endpoint - invalidates current session."""
    # Get token from request - this is simplified
    # In production, you'd extract the token from the Authorization header
    await AuthService.logout_all_sessions(db, current_user.id)
    return {"message": "V-ati deconectat cu succes"}


@router.post("/refresh", response_model=Token)
async def refresh_token(
    token_data: RefreshToken,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    access_token, refresh_token = await AuthService.refresh_access_token(
        db, token_data.refresh_token
    )

    # Get user for response
    payload = verify_token(access_token)
    user_id = payload.get("sub")

    # Get user from JSON storage
    json_user = AuthService.get_json_user_by_id(user_id)
    if not json_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizator inexistent"
        )

    # Get db user for response
    db_user = await AuthService.get_db_user_by_id(db, user_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilizator inexistent"
        )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.from_orm(db_user)
    )


@router.post("/change-password")
async def change_password(
    password_data: ChangePassword,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password."""
    user = await AuthService.change_password(db, current_user, password_data)
    return {
        "message": "Parola a fost schimbata cu succes",
        "force_password_change": user.force_password_change,
        "user": UserResponse.from_orm(user)
    }


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """Get current user information."""
    return UserResponse.from_orm(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile."""
    user = await AuthService.update_user(
        db, current_user, update_data.display_name, update_data.birthday, update_data.avatar_path
    )
    return UserResponse.from_orm(user)


@router.get("/setup-status")
async def get_setup_status():
    """Check if the application has been set up with users."""
    user_count = UserJSONService.get_user_count()
    return {
        "is_setup": user_count > 0,
        "user_count": user_count,
        "max_users": 2
    }
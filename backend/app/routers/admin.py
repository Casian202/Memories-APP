"""
Admin routes.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.event import Event
from app.models.photo import Photo
from app.models.surprise import Surprise
from app.models.motivation import Motivation
from app.models.relationship import Relationship
from app.schemas.user import UserResponse
from app.utils.security import get_admin_user, get_password_hash
from pydantic import BaseModel, Field

router = APIRouter()


@router.get("/users")
async def get_users(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)."""
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [UserResponse.from_orm(u) for u in users]


class AdminUserUpdate(BaseModel):
    """Schema for admin user update."""
    display_name: Optional[str] = None
    birthday: Optional[str] = None
    is_admin: Optional[bool] = None


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    update_data: AdminUserUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a user (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu a fost găsit"
        )
    
    if update_data.display_name is not None:
        user.display_name = update_data.display_name
    
    if update_data.birthday is not None:
        try:
            user.birthday = datetime.strptime(update_data.birthday, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format dată invalid"
            )
    
    if update_data.is_admin is not None:
        user.is_admin = update_data.is_admin
    
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.from_orm(user)


class ResetPasswordRequest(BaseModel):
    """Schema for admin password reset."""
    new_password: str = Field(..., min_length=8)


@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: int,
    password_data: ResetPasswordRequest,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Reset a user's password (admin only)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilizatorul nu a fost găsit"
        )
    
    user.password_hash = get_password_hash(password_data.new_password)
    user.force_password_change = True
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Parola a fost resetată"}


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get application statistics (admin only)."""
    # Count events
    events_result = await db.execute(select(func.count(Event.id)))
    events_count = events_result.scalar()
    
    # Count photos
    photos_result = await db.execute(select(func.count(Photo.id)))
    photos_count = photos_result.scalar()
    
    # Count surprises
    surprises_result = await db.execute(select(func.count(Surprise.id)))
    surprises_count = surprises_result.scalar()
    
    # Count motivations
    motivations_result = await db.execute(select(func.count(Motivation.id)))
    motivations_count = motivations_result.scalar()
    
    # Get storage usage
    import os
    from app.config import settings
    
    photos_dir = os.path.join(settings.UPLOAD_DIR, "events")
    storage_used = 0
    if os.path.exists(photos_dir):
        for root, dirs, files in os.walk(photos_dir):
            for f in files:
                storage_used += os.path.getsize(os.path.join(root, f))
    
    return {
        "events_count": events_count,
        "photos_count": photos_count,
        "surprises_count": surprises_count,
        "motivations_count": motivations_count,
        "storage_used_mb": round(storage_used / (1024 * 1024), 2)
    }


class AdminRelationshipUpdate(BaseModel):
    """Schema for admin relationship update."""
    start_date: Optional[str] = None
    anniversary_date: Optional[str] = None
    relationship_name: Optional[str] = None


@router.put("/relationship")
async def update_relationship(
    data: AdminRelationshipUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update relationship info (admin only)."""
    result = await db.execute(select(Relationship))
    relationship = result.scalar_one_or_none()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nu există o relație înregistrată"
        )
    
    if data.start_date is not None:
        try:
            relationship.start_date = datetime.strptime(data.start_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format dată invalid pentru start_date"
            )
    
    if data.anniversary_date is not None:
        try:
            relationship.anniversary_date = datetime.strptime(data.anniversary_date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Format dată invalid pentru anniversary_date"
            )
    
    if data.relationship_name is not None:
        relationship.relationship_name = data.relationship_name
    
    await db.commit()
    await db.refresh(relationship)
    
    return relationship


@router.post("/backup")
async def create_backup(
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a backup (admin only)."""
    import json
    import os
    from datetime import datetime
    from app.config import settings
    
    backup_dir = os.path.join(settings.BACKUP_DIR)
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"backup_{timestamp}.json")
    
    # Gather data
    backup_data = {
        "timestamp": timestamp,
        "users": [],
        "relationship": None,
        "events": [],
        "themes": []
    }
    
    # Users
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    for user in users:
        backup_data["users"].append({
            "id": user.id,
            "username": user.username,
            "display_name": user.display_name,
            "birthday": str(user.birthday) if user.birthday else None,
            "is_admin": user.is_admin
        })
    
    # Relationship
    rel_result = await db.execute(select(Relationship))
    rel = rel_result.scalar_one_or_none()
    if rel:
        backup_data["relationship"] = {
            "partner1_id": rel.partner1_id,
            "partner2_id": rel.partner2_id,
            "relationship_name": rel.relationship_name,
            "start_date": str(rel.start_date),
            "anniversary_date": str(rel.anniversary_date) if rel.anniversary_date else None
        }
    
    # Events
    events_result = await db.execute(select(Event))
    events = events_result.scalars().all()
    for event in events:
        backup_data["events"].append({
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "location": event.location,
            "event_date": str(event.event_date),
            "event_type": event.event_type
        })
    
    # Write backup file
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(backup_data, f, ensure_ascii=False, indent=2)
    
    return {
        "message": "Backup creat cu succes",
        "file": f"backup_{timestamp}.json",
        "timestamp": timestamp
    }


@router.get("/logs")
async def get_logs(
    limit: int = 100,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Get audit logs (admin only)."""
    from app.models.theme import AuditLog
    
    result = await db.execute(
        select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    
    return logs
"""
Surprise routes.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.surprise import Surprise
from app.schemas.surprise import SurpriseCreate, SurpriseUpdate, SurpriseResponse
from app.services.surprise_service import SurpriseService
from app.utils.security import get_current_user

router = APIRouter()


def _surprise_to_dict(surprise) -> dict:
    """Convert a Surprise ORM object to a safe dict for JSON serialization."""
    return {
        "id": surprise.id,
        "from_user_id": surprise.from_user_id,
        "to_user_id": surprise.to_user_id,
        "title": surprise.title,
        "description": surprise.description,
        "surprise_type": surprise.surprise_type,
        "content_path": surprise.content_path,
        "message": surprise.message,
        "reveal_type": surprise.reveal_type,
        "reveal_date": str(surprise.reveal_date) if surprise.reveal_date else None,
        "reveal_time": str(surprise.reveal_time) if surprise.reveal_time else None,
        "reveal_clicks": surprise.reveal_clicks,
        "current_clicks": surprise.current_clicks,
        "click_cooldown": surprise.click_cooldown,
        "is_revealed": surprise.is_revealed,
        "revealed_at": surprise.revealed_at.isoformat() if surprise.revealed_at else None,
        "last_click_at": surprise.last_click_at.isoformat() if surprise.last_click_at else None,
        "created_at": surprise.created_at.isoformat() if surprise.created_at else None,
        "can_reveal": getattr(surprise, 'can_reveal', False),
        "progress_percentage": getattr(surprise, 'progress_percentage', 0.0),
        "from_user_name": surprise.from_user_name if hasattr(surprise, 'from_user_name') else "Partener",
    }


@router.get("/received")
async def get_received_surprises(
    include_revealed: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get surprises received by the current user."""
    surprises = await SurpriseService.get_received_surprises(
        db, current_user.id, include_revealed
    )
    return [_surprise_to_dict(s) for s in surprises]


@router.get("/sent")
async def get_sent_surprises(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get surprises sent by the current user."""
    surprises = await SurpriseService.get_sent_surprises(db, current_user.id)
    return [_surprise_to_dict(s) for s in surprises]


@router.get("/{surprise_id}", response_model=SurpriseResponse)
async def get_surprise(
    surprise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a single surprise by ID."""
    surprise = await SurpriseService.get_surprise_by_id(db, surprise_id, current_user.id)
    if not surprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surpriza nu a fost găsită"
        )
    return SurpriseResponse.from_orm(surprise)


@router.post("", response_model=SurpriseResponse, status_code=status.HTTP_201_CREATED)
async def create_surprise(
    surprise_data: SurpriseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new surprise."""
    from sqlalchemy import select as sa_select
    from app.models.relationship import Relationship

    # Auto-detect partner if to_user_id not provided
    if not surprise_data.to_user_id:
        rel_query = sa_select(Relationship).where(
            (Relationship.partner1_id == current_user.id) | 
            (Relationship.partner2_id == current_user.id)
        )
        rel_result = await db.execute(rel_query)
        relationship = rel_result.scalar_one_or_none()

        if not relationship:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nu aveți un partener înregistrat"
            )

        partner_id = relationship.partner2_id if relationship.partner1_id == current_user.id else relationship.partner1_id
        surprise_data = surprise_data.copy(update={"to_user_id": partner_id})
    
    try:
        surprise = await SurpriseService.create_surprise(
            db, surprise_data, current_user.id, None
        )
        return SurpriseResponse.from_orm(surprise)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/{surprise_id}", response_model=SurpriseResponse)
async def update_surprise(
    surprise_id: int,
    surprise_data: SurpriseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a surprise (only if not revealed)."""
    surprise = await SurpriseService.get_surprise_by_id(db, surprise_id, current_user.id)
    if not surprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surpriza nu a fost găsită"
        )
    
    if surprise.from_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nu aveți permisiunea de a modifica această surpriză"
        )
    
    try:
        surprise = await SurpriseService.update_surprise(db, surprise, surprise_data)
        return SurpriseResponse.from_orm(surprise)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{surprise_id}")
async def delete_surprise(
    surprise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a surprise."""
    surprise = await SurpriseService.get_surprise_by_id(db, surprise_id, current_user.id)
    if not surprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surpriza nu a fost găsită"
        )
    
    if surprise.from_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nu aveți permisiunea de a șterge această surpriză"
        )
    
    await SurpriseService.delete_surprise(db, surprise)
    return {"message": "Surpriza a fost ștearsă cu succes"}


@router.post("/{surprise_id}/click")
async def register_click(
    surprise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Register a click on a surprise."""
    surprise = await SurpriseService.get_surprise_by_id(db, surprise_id, current_user.id)
    if not surprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surpriza nu a fost găsită"
        )
    
    try:
        surprise = await SurpriseService.register_click(db, surprise, current_user.id)
        return {
            "current_clicks": surprise.current_clicks,
            "required_clicks": surprise.reveal_clicks,
            "progress": surprise.progress_percentage,
            "is_revealed": surprise.is_revealed
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{surprise_id}/reveal")
async def reveal_surprise(
    surprise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reveal a surprise if conditions are met."""
    surprise = await SurpriseService.get_surprise_by_id(db, surprise_id, current_user.id)
    if not surprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surpriza nu a fost găsită"
        )
    
    try:
        surprise = await SurpriseService.reveal_surprise(db, surprise, current_user.id)
        return SurpriseResponse.from_orm(surprise)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{surprise_id}/dismiss-notification")
async def dismiss_surprise_notification(
    surprise_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Dismiss the notification for a surprise so it won't pop up again."""
    surprise = await SurpriseService.get_surprise_by_id(db, surprise_id, current_user.id)
    if not surprise:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Surpriza nu a fost găsită"
        )
    
    if surprise.to_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Nu aveți permisiunea"
        )
    
    # Mark notification as dismissed
    from sqlalchemy import update
    await db.execute(
        update(Surprise).where(Surprise.id == surprise_id).values(notification_dismissed=True)
    )
    await db.commit()
    
    return {"message": "Notificarea a fost ascunsă"}
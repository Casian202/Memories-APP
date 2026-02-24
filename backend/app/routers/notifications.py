"""
Notification routes - check for unread motivations and new surprises.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.motivation import Motivation
from app.models.surprise import Surprise
from app.utils.security import get_current_user

router = APIRouter()


@router.get("/unread")
async def get_unread_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get unread motivations and new surprises for popup notifications."""
    
    # Get unread motivations with sender info
    mot_query = select(Motivation).where(
        Motivation.to_user_id == current_user.id,
        Motivation.is_read == False
    ).options(selectinload(Motivation.sender)).order_by(desc(Motivation.created_at))
    
    mot_result = await db.execute(mot_query)
    unread_motivations = mot_result.scalars().all()
    
    # Get unseen surprises (not revealed AND notification not dismissed)
    surp_query = select(Surprise).where(
        Surprise.to_user_id == current_user.id,
        Surprise.is_revealed == False,
        or_(Surprise.notification_dismissed == False, Surprise.notification_dismissed.is_(None))
    ).options(selectinload(Surprise.sender)).order_by(desc(Surprise.created_at))
    
    surp_result = await db.execute(surp_query)
    new_surprises = surp_result.scalars().all()
    
    return {
        "unread_motivations": [
            {
                "id": m.id,
                "message": m.message,
                "from_user_name": m.sender.display_name or m.sender.username if m.sender else "Partener",
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in unread_motivations
        ],
        "new_surprises": [
            {
                "id": s.id,
                "title": s.title,
                "from_user_name": s.sender.display_name or s.sender.username if s.sender else "Partener",
                "surprise_type": s.surprise_type,
                "reveal_type": s.reveal_type,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in new_surprises
        ],
        "unread_motivations_count": len(unread_motivations),
        "new_surprises_count": len(new_surprises),
    }

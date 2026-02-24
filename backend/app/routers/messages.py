"""
Daily message routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.message import DailyMessage
from app.utils.security import get_current_user

router = APIRouter()


class SendMessageRequest(BaseModel):
    """Schema for sending a daily message."""
    message: str
    to_user_id: Optional[int] = None


@router.get("/pending")
async def get_pending_message(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get the pending (unread) daily message for the current user."""
    query = select(DailyMessage).where(
        DailyMessage.to_user_id == current_user.id,
        DailyMessage.is_read == False
    ).order_by(desc(DailyMessage.created_at)).limit(1)
    
    result = await db.execute(query)
    message = result.scalar_one_or_none()
    
    if not message:
        return None
    
    # Get sender name
    sender_result = await db.execute(select(User).where(User.id == message.from_user_id))
    sender = sender_result.scalar_one_or_none()
    
    return {
        "id": message.id,
        "message": message.message,
        "from_user_id": message.from_user_id,
        "from_user_name": sender.display_name or sender.username if sender else "Partener",
        "created_at": message.created_at
    }


@router.post("")
async def send_daily_message(
    msg_data: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a daily message to partner."""
    # Verify recipient is partner
    from app.models.relationship import Relationship
    
    rel_query = select(Relationship).where(
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
    
    # Auto-detect partner if to_user_id not provided
    to_user_id = msg_data.to_user_id if msg_data.to_user_id else partner_id
    
    if to_user_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Puteți trimite mesaje doar partenerului"
        )
    
    daily_message = DailyMessage(
        from_user_id=current_user.id,
        to_user_id=to_user_id,
        message=msg_data.message
    )
    
    db.add(daily_message)
    await db.commit()
    await db.refresh(daily_message)
    
    return {"message": "Mesajul a fost trimis", "id": daily_message.id}


@router.put("/{message_id}/read")
async def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a daily message as read."""
    from datetime import datetime
    
    query = select(DailyMessage).where(
        DailyMessage.id == message_id,
        DailyMessage.to_user_id == current_user.id
    )
    result = await db.execute(query)
    message = result.scalar_one_or_none()
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mesajul nu a fost găsit"
        )
    
    message.is_read = True
    message.shown_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Mesajul a fost marcat ca citit"}


@router.get("/history")
async def get_message_history(
    limit: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get message history."""
    query = select(DailyMessage).where(
        (DailyMessage.from_user_id == current_user.id) |
        (DailyMessage.to_user_id == current_user.id)
    ).order_by(desc(DailyMessage.created_at)).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    return messages
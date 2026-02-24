"""
Motivation routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models.user import User
from app.models.motivation import Motivation
from app.schemas.motivation import MotivationCreate, MotivationResponse
from app.utils.security import get_current_user

router = APIRouter()


@router.get("/received")
async def get_received_motivations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get motivations received by the current user."""
    from sqlalchemy.orm import selectinload
    
    query = select(Motivation).where(
        Motivation.to_user_id == current_user.id
    ).options(selectinload(Motivation.sender)).order_by(desc(Motivation.created_at))
    
    result = await db.execute(query)
    motivations = result.scalars().all()
    
    # Build response with sender name
    return [
        {
            "id": m.id,
            "from_user_id": m.from_user_id,
            "to_user_id": m.to_user_id,
            "message": m.message,
            "is_read": m.is_read,
            "read_at": m.read_at,
            "created_at": m.created_at,
            "from_user_name": m.sender.display_name or m.sender.username if m.sender else "Partener",
        }
        for m in motivations
    ]


@router.post("", response_model=MotivationResponse, status_code=status.HTTP_201_CREATED)
async def create_motivation(
    motivation_data: MotivationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Send a motivation to partner."""
    # Verify the recipient exists and is the partner
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
    
    # Get partner ID - auto-detect if not provided
    partner_id = relationship.partner2_id if relationship.partner1_id == current_user.id else relationship.partner1_id
    
    # If to_user_id is provided, verify it matches partner
    target_id = motivation_data.to_user_id if motivation_data.to_user_id else partner_id
    
    if target_id != partner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Puteți trimite motivații doar partenerului"
        )
    
    motivation = Motivation(
        from_user_id=current_user.id,
        to_user_id=partner_id,
        message=motivation_data.message
    )
    
    db.add(motivation)
    await db.commit()
    await db.refresh(motivation)
    
    return motivation


@router.put("/{motivation_id}/read")
async def mark_motivation_read(
    motivation_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Mark a motivation as read."""
    from datetime import datetime
    
    query = select(Motivation).where(
        Motivation.id == motivation_id,
        Motivation.to_user_id == current_user.id
    )
    result = await db.execute(query)
    motivation = result.scalar_one_or_none()
    
    if not motivation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Motivația nu a fost găsită"
        )
    
    motivation.is_read = True
    motivation.read_at = datetime.utcnow()
    await db.commit()
    
    return {"message": "Motivația a fost marcată ca citită"}
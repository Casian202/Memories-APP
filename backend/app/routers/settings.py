"""
Settings routes.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.relationship import Relationship
from app.utils.security import get_current_active_user, get_admin_user

router = APIRouter()


class RelationshipResponse(BaseModel):
    """Schema for relationship response."""
    id: int
    partner1_id: int
    partner2_id: int
    partner1_name: Optional[str]
    partner2_name: Optional[str]
    relationship_name: Optional[str]
    start_date: date
    anniversary_date: Optional[date]
    
    class Config:
        from_attributes = True


class RelationshipUpdate(BaseModel):
    """Schema for updating relationship."""
    relationship_name: Optional[str] = None
    start_date: Optional[date] = None
    anniversary_date: Optional[date] = None


@router.get("/relationship", response_model=RelationshipResponse)
async def get_relationship(
    db: AsyncSession = Depends(get_db)
):
    """Get the relationship info (public for basic info)."""
    result = await db.execute(select(Relationship))
    relationship = result.scalar_one_or_none()
    
    if not relationship:
        # Return default values if no relationship exists
        return RelationshipResponse(
            id=0,
            partner1_id=1,
            partner2_id=2,
            partner1_name="Partener 1",
            partner2_name="Partener 2",
            relationship_name="Cuplul nostru",
            start_date=date.today(),
            anniversary_date=None
        )
    
    # Get partner names
    partner1_result = await db.execute(select(User).where(User.id == relationship.partner1_id))
    partner1 = partner1_result.scalar_one_or_none()
    
    partner2_result = await db.execute(select(User).where(User.id == relationship.partner2_id))
    partner2 = partner2_result.scalar_one_or_none()
    
    return RelationshipResponse(
        id=relationship.id,
        partner1_id=relationship.partner1_id,
        partner2_id=relationship.partner2_id,
        partner1_name=partner1.display_name if partner1 else "Partener 1",
        partner2_name=partner2.display_name if partner2 else "Partener 2",
        relationship_name=relationship.relationship_name,
        start_date=relationship.start_date,
        anniversary_date=relationship.anniversary_date
    )


@router.put("/relationship", response_model=RelationshipResponse)
async def update_relationship(
    data: RelationshipUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update relationship info (admin only)."""
    result = await db.execute(select(Relationship))
    relationship = result.scalar_one_or_none()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Relația nu a fost găsită"
        )
    
    if data.relationship_name is not None:
        relationship.relationship_name = data.relationship_name
    if data.start_date is not None:
        relationship.start_date = data.start_date
    if data.anniversary_date is not None:
        relationship.anniversary_date = data.anniversary_date
    
    await db.commit()
    await db.refresh(relationship)
    
    # Get partner names
    partner1_result = await db.execute(select(User).where(User.id == relationship.partner1_id))
    partner1 = partner1_result.scalar_one_or_none()
    
    partner2_result = await db.execute(select(User).where(User.id == relationship.partner2_id))
    partner2 = partner2_result.scalar_one_or_none()
    
    return RelationshipResponse(
        id=relationship.id,
        partner1_id=relationship.partner1_id,
        partner2_id=relationship.partner2_id,
        partner1_name=partner1.display_name if partner1 else "Partener 1",
        partner2_name=partner2.display_name if partner2 else "Partener 2",
        relationship_name=relationship.relationship_name,
        start_date=relationship.start_date,
        anniversary_date=relationship.anniversary_date
    )
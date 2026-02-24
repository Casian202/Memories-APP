"""
Motivation schemas for request/response validation.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MotivationBase(BaseModel):
    """Base motivation schema."""
    message: str = Field(..., min_length=1, max_length=500)


class MotivationCreate(MotivationBase):
    """Schema for creating a motivation."""
    to_user_id: Optional[int] = None


class MotivationResponse(MotivationBase):
    """Schema for motivation response."""
    id: int
    from_user_id: int
    to_user_id: int
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime
    
    # Sender info for display
    sender_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class MotivationListResponse(BaseModel):
    """Schema for motivation list response."""
    motivations: list[MotivationResponse]
    total: int
    unread_count: int


class DailyMessageBase(BaseModel):
    """Base daily message schema."""
    message: str = Field(..., min_length=1, max_length=1000)


class DailyMessageCreate(DailyMessageBase):
    """Schema for creating a daily message."""
    to_user_id: int


class DailyMessageResponse(DailyMessageBase):
    """Schema for daily message response."""
    id: int
    from_user_id: int
    to_user_id: int
    is_read: bool
    shown_at: Optional[datetime]
    created_at: datetime
    
    # Sender info for display
    sender_name: Optional[str] = None
    
    class Config:
        from_attributes = True
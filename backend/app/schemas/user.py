"""
User schemas for request/response validation.
"""
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, date
import re


class UserBase(BaseModel):
    """Base user schema."""
    username: str = Field(..., min_length=3, max_length=50)
    display_name: Optional[str] = Field(None, max_length=100)


class UserCreate(UserBase):
    """Schema for creating a user."""
    password: str = Field(..., min_length=8)
    birthday: Optional[date] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Parola trebuie să aibă cel puțin 8 caractere')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Parola trebuie să conțină cel puțin o majusculă')
        if not re.search(r'\d', v):
            raise ValueError('Parola trebuie să conțină cel puțin un număr')
        return v
    
    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username poate conține doar litere, numere și underscore')
        return v.lower()


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    display_name: Optional[str] = Field(None, max_length=100)
    birthday: Optional[date] = None
    avatar_path: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login."""
    username: str
    password: str


class ChangePassword(BaseModel):
    """Schema for password change."""
    current_password: str
    new_password: str = Field(..., min_length=8)
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Parola trebuie să aibă cel puțin 8 caractere')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Parola trebuie să conțină cel puțin o majusculă')
        if not re.search(r'\d', v):
            raise ValueError('Parola trebuie să conțină cel puțin un număr')
        return v


class UserResponse(UserBase):
    """Schema for user response."""
    id: int
    avatar_path: Optional[str]
    birthday: Optional[date]
    is_admin: bool
    force_password_change: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class TokenData(BaseModel):
    """Schema for token payload data."""
    user_id: Optional[int] = None
    username: Optional[str] = None
    is_admin: bool = False


class RefreshToken(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str


class AdminSetupRequest(BaseModel):
    """Schema for admin setup request."""
    admin_password: str = Field(..., min_length=1)


class AdminSetupResponse(BaseModel):
    """Schema for admin setup response."""
    success: bool
    message: str
    temp_token: Optional[str] = None


class CreateUserRequest(BaseModel):
    """Schema for creating a user via admin."""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    role: str = Field(default="user", pattern="^(admin|user)$")
    display_name: Optional[str] = Field(None, max_length=100)

    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Parola trebuie sa aiba cel putin 8 caractere')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Parola trebuie sa contina cel putin o majuscula')
        if not re.search(r'\d', v):
            raise ValueError('Parola trebuie sa contina cel putin un numar')
        return v

    @validator('username')
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_]+$', v):
            raise ValueError('Username poate contine doar litere, numere si underscore')
        return v.lower()


class UserJSONResponse(BaseModel):
    """Schema for user response from JSON storage."""
    id: int
    username: str
    display_name: Optional[str]
    role: str
    is_admin: bool
    must_change_password: bool
    avatar_path: Optional[str]
    birthday: Optional[str]
    created_at: str
    updated_at: str


class CreateUserResponse(BaseModel):
    """Schema for create user response - matches the JSON storage structure."""
    id: int
    username: str
    role: str
    must_change_password: bool
    created_at: str
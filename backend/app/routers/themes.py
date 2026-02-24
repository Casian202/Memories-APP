"""
Theme routes.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.theme import Theme
from app.schemas.theme import ThemeCreate, ThemeUpdate, ThemeResponse
from app.services.theme_service import ThemeService
from app.utils.security import get_current_user, get_admin_user

router = APIRouter()


@router.get("", response_model=List[ThemeResponse])
async def get_themes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all themes."""
    themes = await ThemeService.get_all_themes(db)
    return themes


@router.get("/active")
async def get_active_theme(
    db: AsyncSession = Depends(get_db)
):
    """Get the currently active theme (public endpoint for login page)."""
    from app.models.relationship import Relationship
    from app.utils.date_helpers import get_relationship_time
    
    # Get all users for birthday checks
    users_result = await db.execute(select(User))
    users = users_result.scalars().all()
    
    # Get relationship
    rel_result = await db.execute(select(Relationship))
    relationship = rel_result.scalar_one_or_none()
    
    theme = await ThemeService.determine_active_theme(db, users, relationship)
    
    if not theme:
        # Return default theme
        theme = await ThemeService.get_theme_by_slug(db, "default")
    
    response = ThemeResponse.from_orm(theme) if theme else None
    
    # Add relationship info if available
    if relationship:
        rel_time = get_relationship_time(relationship.start_date)
        return {
            "theme": response,
            "relationship": {
                "start_date": relationship.start_date,
                "anniversary_date": relationship.anniversary_date,
                "time_together": rel_time
            }
        }
    
    return {"theme": response, "relationship": None}


@router.get("/{theme_id}", response_model=ThemeResponse)
async def get_theme(
    theme_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a theme by ID."""
    theme = await ThemeService.get_theme_by_id(db, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tema nu a fost găsită"
        )
    return theme


@router.post("/{theme_id}/activate", response_model=ThemeResponse)
async def activate_theme(
    theme_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate a theme (admin only)."""
    try:
        theme = await ThemeService.activate_theme(db, theme_id)
        return theme
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post("/custom", response_model=ThemeResponse, status_code=status.HTTP_201_CREATED)
async def create_custom_theme(
    theme_data: ThemeCreate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a custom theme (admin only)."""
    try:
        theme = await ThemeService.create_theme(db, theme_data)
        return theme
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/custom/{theme_id}", response_model=ThemeResponse)
async def update_custom_theme(
    theme_id: int,
    theme_data: ThemeUpdate,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a custom theme (admin only)."""
    theme = await ThemeService.get_theme_by_id(db, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tema nu a fost găsită"
        )
    
    try:
        theme = await ThemeService.update_theme(db, theme, theme_data)
        return theme
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/custom/{theme_id}")
async def delete_custom_theme(
    theme_id: int,
    current_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a custom theme (admin only)."""
    theme = await ThemeService.get_theme_by_id(db, theme_id)
    if not theme:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tema nu a fost găsită"
        )
    
    try:
        await ThemeService.delete_theme(db, theme)
        return {"message": "Tema a fost ștearsă cu succes"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
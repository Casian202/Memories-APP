"""
Theme service for managing UI themes.
"""
from datetime import date
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.theme import Theme
from app.models.user import User
from app.models.relationship import Relationship
from app.schemas.theme import ThemeCreate, ThemeUpdate


class ThemeService:
    """Service for managing themes."""
    
    @staticmethod
    async def get_all_themes(db: AsyncSession) -> List[Theme]:
        """Get all themes."""
        query = select(Theme).order_by(Theme.is_system.desc(), Theme.name)
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_theme_by_id(db: AsyncSession, theme_id: int) -> Optional[Theme]:
        """Get a theme by ID."""
        query = select(Theme).where(Theme.id == theme_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_theme_by_slug(db: AsyncSession, slug: str) -> Optional[Theme]:
        """Get a theme by slug."""
        query = select(Theme).where(Theme.slug == slug)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_active_theme(db: AsyncSession) -> Optional[Theme]:
        """Get the currently active theme."""
        query = select(Theme).where(Theme.is_active == True)
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def activate_theme(db: AsyncSession, theme_id: int) -> Theme:
        """Activate a theme by ID."""
        # Deactivate all themes
        result = await db.execute(select(Theme))
        themes = result.scalars().all()
        for theme in themes:
            theme.is_active = False
        
        # Activate selected theme
        theme = await ThemeService.get_theme_by_id(db, theme_id)
        if not theme:
            raise ValueError("Tema nu a fost găsită")
        
        theme.is_active = True
        await db.commit()
        await db.refresh(theme)
        
        return theme
    
    @staticmethod
    async def create_theme(db: AsyncSession, theme_data: ThemeCreate) -> Theme:
        """Create a new custom theme."""
        # Check if slug exists
        existing = await ThemeService.get_theme_by_slug(db, theme_data.slug)
        if existing:
            raise ValueError("Slug-ul există deja")
        
        theme = Theme(
            name=theme_data.name,
            slug=theme_data.slug,
            description=theme_data.description,
            primary_color=theme_data.primary_color,
            secondary_color=theme_data.secondary_color,
            accent_color=theme_data.accent_color,
            background_color=theme_data.background_color,
            text_color=theme_data.text_color,
            card_background=theme_data.card_background,
            font_heading=theme_data.font_heading,
            font_body=theme_data.font_body,
            border_radius=theme_data.border_radius,
            custom_css=theme_data.custom_css,
            is_seasonal=theme_data.is_seasonal,
            seasonal_start_month=theme_data.seasonal_start_month,
            seasonal_start_day=theme_data.seasonal_start_day,
            seasonal_end_month=theme_data.seasonal_end_month,
            seasonal_end_day=theme_data.seasonal_end_day,
            trigger_event_type=theme_data.trigger_event_type,
            preview_image=theme_data.preview_image,
            is_system=False,
            is_active=False
        )
        
        db.add(theme)
        await db.commit()
        await db.refresh(theme)
        
        return theme
    
    @staticmethod
    async def update_theme(
        db: AsyncSession,
        theme: Theme,
        theme_data: ThemeUpdate
    ) -> Theme:
        """Update a custom theme."""
        # Re-query the theme to ensure it's attached to the current session
        db_theme = await ThemeService.get_theme_by_id(db, theme.id)
        if not db_theme:
            raise ValueError("Tema nu a fost găsită")

        if db_theme.is_system:
            raise ValueError("Temele de sistem nu pot fi modificate")

        update_data = theme_data.dict(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                setattr(db_theme, field, value)

        await db.commit()
        await db.refresh(db_theme)

        return db_theme
    
    @staticmethod
    async def delete_theme(db: AsyncSession, theme: Theme) -> None:
        """Delete a custom theme."""
        if theme.is_system:
            raise ValueError("Temele de sistem nu pot fi șterse")
        
        if theme.is_active:
            raise ValueError("Nu puteți șterge tema activă")
        
        await db.delete(theme)
        await db.commit()
    
    @staticmethod
    async def determine_active_theme(
        db: AsyncSession,
        users: List[User],
        relationship: Optional[Relationship]
    ) -> Theme:
        """
        Determine the active theme based on current date and events.
        Priority:
        1. Manual override (is_active = True)
        2. Birthday themes (if today is a birthday)
        3. Anniversary theme (if today is anniversary)
        4. Seasonal themes (Christmas, Valentine, New Year)
        5. Default theme
        """
        today = date.today()
        
        # Check for manually activated theme
        active_theme = await ThemeService.get_active_theme(db)
        if active_theme:
            return active_theme
        
        # Check for birthday themes
        for user in users:
            if user.birthday:
                if (today.month == user.birthday.month and 
                    today.day == user.birthday.day):
                    # Determine which birthday theme to use
                    trigger = 'birthday_her' if not user.is_admin else 'birthday_him'
                    query = select(Theme).where(
                        Theme.trigger_event_type == trigger
                    )
                    result = await db.execute(query)
                    birthday_theme = result.scalar_one_or_none()
                    if birthday_theme:
                        return birthday_theme
        
        # Check for anniversary
        if relationship and relationship.anniversary_date:
            if (today.month == relationship.anniversary_date.month and
                today.day == relationship.anniversary_date.day):
                query = select(Theme).where(
                    Theme.trigger_event_type == 'anniversary'
                )
                result = await db.execute(query)
                anniversary_theme = result.scalar_one_or_none()
                if anniversary_theme:
                    return anniversary_theme
        
        # Check for seasonal themes
        seasonal_themes = await ThemeService._check_seasonal_themes(db, today)
        if seasonal_themes:
            return seasonal_themes
        
        # Return default theme
        default_theme = await ThemeService.get_theme_by_slug(db, 'default')
        return default_theme
    
    @staticmethod
    async def _check_seasonal_themes(db: AsyncSession, today: date) -> Optional[Theme]:
        """Check if any seasonal theme should be active."""
        # Valentine's Day (Feb 14)
        if today.month == 2 and today.day == 14:
            query = select(Theme).where(Theme.trigger_event_type == 'valentine')
            result = await db.execute(query)
            theme = result.scalar_one_or_none()
            if theme:
                return theme
        
        # Christmas (Dec 20-26)
        if today.month == 12 and 20 <= today.day <= 26:
            query = select(Theme).where(Theme.trigger_event_type == 'christmas')
            result = await db.execute(query)
            theme = result.scalar_one_or_none()
            if theme:
                return theme
        
        # New Year (Dec 31 - Jan 2)
        if (today.month == 12 and today.day >= 31) or \
           (today.month == 1 and today.day <= 2):
            query = select(Theme).where(Theme.trigger_event_type == 'new_year')
            result = await db.execute(query)
            theme = result.scalar_one_or_none()
            if theme:
                return theme
        
        # Check custom seasonal periods
        query = select(Theme).where(
            Theme.is_seasonal == True,
            Theme.seasonal_start_month.isnot(None)
        )
        result = await db.execute(query)
        seasonal_themes = result.scalars().all()
        
        for theme in seasonal_themes:
            if ThemeService._is_in_seasonal_period(today, theme):
                return theme
        
        return None
    
    @staticmethod
    def _is_in_seasonal_period(today: date, theme: Theme) -> bool:
        """Check if today falls within a theme's seasonal period."""
        if not theme.seasonal_start_month or not theme.seasonal_start_day:
            return False
        
        start_date = date(today.year, theme.seasonal_start_month, theme.seasonal_start_day)
        
        end_month = theme.seasonal_end_month or theme.seasonal_start_month
        end_day = theme.seasonal_end_day or theme.seasonal_start_day
        
        # Handle year wrap
        if (end_month < theme.seasonal_start_month or
            (end_month == theme.seasonal_start_month and end_day < theme.seasonal_start_day)):
            # Period crosses year boundary
            end_date = date(today.year + 1, end_month, end_day)
            if today.month >= theme.seasonal_start_month:
                start_date = date(today.year, theme.seasonal_start_month, theme.seasonal_start_day)
            else:
                start_date = date(today.year - 1, theme.seasonal_start_month, theme.seasonal_start_day)
        else:
            end_date = date(today.year, end_month, end_day)
        
        return start_date <= today <= end_date
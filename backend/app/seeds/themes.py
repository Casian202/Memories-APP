"""
Theme seed data.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.theme import Theme


DEFAULT_THEMES = [
    {
        "name": "Default",
        "slug": "default",
        "description": "Tema implicită, modernă și curată",
        "primary_color": "#8B5CF6",
        "secondary_color": "#6366F1",
        "accent_color": "#A78BFA",
        "background_color": "#FAFAFA",
        "text_color": "#1F2937",
        "card_background": "#FFFFFF",
        "font_heading": "Inter",
        "font_body": "Inter",
        "border_radius": 12,
        "is_system": True,
        "is_active": True
    },
    {
        "name": "Slytherin",
        "slug": "slytherin",
        "description": "Tema pentru ziua ei - Slytherin House",
        "primary_color": "#1A472A",
        "secondary_color": "#5D5D5D",
        "accent_color": "#2E8B57",
        "background_color": "#0D1B0F",
        "text_color": "#E8E8E8",
        "card_background": "#1A2F1A",
        "font_heading": "Cinzel",
        "font_body": "Inter",
        "border_radius": 8,
        "is_system": True,
        "trigger_event_type": "birthday_her"
    },
    {
        "name": "Gryffindor",
        "slug": "gryffindor",
        "description": "Tema pentru ziua ta - Gryffindor House",
        "primary_color": "#740001",
        "secondary_color": "#D3A625",
        "accent_color": "#AE0001",
        "background_color": "#1A0505",
        "text_color": "#F5F5F5",
        "card_background": "#2A0F0F",
        "font_heading": "Cinzel Decorative",
        "font_body": "Inter",
        "border_radius": 8,
        "is_system": True,
        "trigger_event_type": "birthday_him"
    },
    {
        "name": "Valentine",
        "slug": "valentine",
        "description": "Tema de Ziua Îndrăgostiților",
        "primary_color": "#FF6B6B",
        "secondary_color": "#FFE5E5",
        "accent_color": "#FF8E8E",
        "background_color": "#FFF5F5",
        "text_color": "#4A1A1A",
        "card_background": "#FFFFFF",
        "font_heading": "Playfair Display",
        "font_body": "Inter",
        "border_radius": 16,
        "is_system": True,
        "is_seasonal": True,
        "seasonal_start_month": 2,
        "seasonal_start_day": 10,
        "seasonal_end_month": 2,
        "seasonal_end_day": 16,
        "trigger_event_type": "valentine"
    },
    {
        "name": "Christmas",
        "slug": "christmas",
        "description": "Tema de Crăciun",
        "primary_color": "#C41E3A",
        "secondary_color": "#228B22",
        "accent_color": "#FFD700",
        "background_color": "#0A1A0A",
        "text_color": "#F5F5F5",
        "card_background": "#1A2A1A",
        "font_heading": "Mountains of Christmas",
        "font_body": "Inter",
        "border_radius": 8,
        "is_system": True,
        "is_seasonal": True,
        "seasonal_start_month": 12,
        "seasonal_start_day": 20,
        "seasonal_end_month": 12,
        "seasonal_end_day": 26,
        "trigger_event_type": "christmas"
    },
    {
        "name": "New Year",
        "slug": "new_year",
        "description": "Tema de Anul Nou",
        "primary_color": "#FFD700",
        "secondary_color": "#C0C0C0",
        "accent_color": "#4169E1",
        "background_color": "#0A0A14",
        "text_color": "#F5F5F5",
        "card_background": "#1A1A2A",
        "font_heading": "Playfair Display",
        "font_body": "Inter",
        "border_radius": 12,
        "is_system": True,
        "is_seasonal": True,
        "seasonal_start_month": 12,
        "seasonal_start_day": 31,
        "seasonal_end_month": 1,
        "seasonal_end_day": 2,
        "trigger_event_type": "new_year"
    },
    {
        "name": "Anniversary",
        "slug": "anniversary",
        "description": "Tema pentru aniversarea relației",
        "primary_color": "#C9A227",
        "secondary_color": "#FFE4E1",
        "accent_color": "#D4AF37",
        "background_color": "#FFFAF0",
        "text_color": "#2C1810",
        "card_background": "#FFFFFF",
        "font_heading": "Great Vibes",
        "font_body": "Inter",
        "border_radius": 12,
        "is_system": True,
        "trigger_event_type": "anniversary"
    },
    {
        "name": "Vacation Ski",
        "slug": "vacation_ski",
        "description": "Tema pentru vacanța la schi",
        "primary_color": "#A5D8FF",
        "secondary_color": "#E9ECEF",
        "accent_color": "#4DABF7",
        "background_color": "#F8FAFC",
        "text_color": "#1A365D",
        "card_background": "#FFFFFF",
        "font_heading": "Inter",
        "font_body": "Inter",
        "border_radius": 12,
        "is_system": True,
        "trigger_event_type": "vacation_ski"
    },
    {
        "name": "Vacation Beach",
        "slug": "vacation_beach",
        "description": "Tema pentru vacanța la mare",
        "primary_color": "#40E0D0",
        "secondary_color": "#F4D03F",
        "accent_color": "#FF6B6B",
        "background_color": "#E0F7FA",
        "text_color": "#1A365D",
        "card_background": "#FFFFFF",
        "font_heading": "Pacifico",
        "font_body": "Inter",
        "border_radius": 16,
        "is_system": True,
        "trigger_event_type": "vacation_beach"
    }
]


async def seed_themes(db: AsyncSession):
    """Seed default themes."""
    for theme_data in DEFAULT_THEMES:
        # Check if theme exists
        result = await db.execute(
            select(Theme).where(Theme.slug == theme_data["slug"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            theme = Theme(**theme_data)
            db.add(theme)
    
    await db.commit()
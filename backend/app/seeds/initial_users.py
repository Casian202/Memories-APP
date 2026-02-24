"""
Initial users seed.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.relationship import Relationship
from app.utils.security import get_password_hash


async def seed_initial_users(db: AsyncSession):
    """Seed initial users if they don't exist."""
    # Check if users already exist
    result = await db.execute(select(User))
    existing_users = result.scalars().all()
    
    if len(existing_users) >= 2:
        return
    
    # Create default users - hubby (admin) and wifey
    default_users = [
        {
            "username": "hubby",
            "password": "memories2024",
            "display_name": "Hubby",
            "is_admin": True
        },
        {
            "username": "wifey",
            "password": "memories2024", 
            "display_name": "Wifey",
            "is_admin": False
        }
    ]
    
    created_users = []
    
    for user_data in default_users:
        # Check if this username exists
        result = await db.execute(
            select(User).where(User.username == user_data["username"])
        )
        existing = result.scalar_one_or_none()
        
        if not existing:
            user = User(
                username=user_data["username"],
                password_hash=get_password_hash(user_data["password"]),
                display_name=user_data["display_name"],
                is_admin=user_data["is_admin"],
                force_password_change=True
            )
            db.add(user)
            await db.flush()
            created_users.append(user)
    
    await db.commit()
    
    # Refresh to get IDs
    for user in created_users:
        await db.refresh(user)
    
    # Create relationship if we have 2 users
    all_users = (await db.execute(select(User))).scalars().all()
    
    if len(all_users) >= 2:
        # Check if relationship exists
        rel_result = await db.execute(select(Relationship))
        existing_rel = rel_result.scalar_one_or_none()
        
        if not existing_rel:
            from datetime import date
            relationship = Relationship(
                partner1_id=all_users[0].id,
                partner2_id=all_users[1].id,
                relationship_name="Noi",
                start_date=date.today()
            )
            db.add(relationship)
            await db.commit()
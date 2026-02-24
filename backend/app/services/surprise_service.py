"""
Surprise service for managing surprises between partners.
"""
from datetime import datetime, date
from typing import List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from sqlalchemy.orm import selectinload
import os

from app.models.surprise import Surprise
from app.models.user import User
from app.schemas.surprise import SurpriseCreate, SurpriseUpdate
from app.utils.image_processor import validate_image, generate_filename, process_image, save_image
from app.config import settings


class SurpriseService:
    """Service for managing surprises."""
    
    @staticmethod
    async def get_received_surprises(
        db: AsyncSession,
        user_id: int,
        include_revealed: bool = True
    ) -> List[Surprise]:
        """Get surprises received by user."""
        query = select(Surprise).where(
            Surprise.to_user_id == user_id
        ).options(selectinload(Surprise.sender))
        
        if not include_revealed:
            query = query.where(Surprise.is_revealed == False)
        
        query = query.order_by(desc(Surprise.created_at))
        
        result = await db.execute(query)
        surprises = result.scalars().all()
        
        # Calculate reveal status
        for surprise in surprises:
            surprise.can_reveal = SurpriseService._can_reveal(surprise)
            surprise.progress_percentage = SurpriseService._calculate_progress(surprise)
        
        return surprises
    
    @staticmethod
    async def get_sent_surprises(db: AsyncSession, user_id: int) -> List[Surprise]:
        """Get surprises sent by user."""
        query = select(Surprise).where(
            Surprise.from_user_id == user_id
        ).options(selectinload(Surprise.recipient))
        query = query.order_by(desc(Surprise.created_at))
        
        result = await db.execute(query)
        surprises = result.scalars().all()
        
        return surprises
    
    @staticmethod
    async def get_surprise_by_id(
        db: AsyncSession,
        surprise_id: int,
        user_id: int
    ) -> Optional[Surprise]:
        """Get a surprise by ID if user is sender or receiver."""
        query = select(Surprise).where(
            Surprise.id == surprise_id,
            or_(
                Surprise.from_user_id == user_id,
                Surprise.to_user_id == user_id
            )
        ).options(selectinload(Surprise.sender), selectinload(Surprise.recipient))
        
        result = await db.execute(query)
        surprise = result.scalar_one_or_none()
        
        if surprise:
            surprise.can_reveal = SurpriseService._can_reveal(surprise)
            surprise.progress_percentage = SurpriseService._calculate_progress(surprise)
        
        return surprise
    
    @staticmethod
    async def create_surprise(
        db: AsyncSession,
        surprise_data: SurpriseCreate,
        from_user_id: int,
        content_file = None
    ) -> Surprise:
        """Create a new surprise."""
        surprise = Surprise(
            from_user_id=from_user_id,
            to_user_id=surprise_data.to_user_id,
            title=surprise_data.title,
            description=surprise_data.description,
            surprise_type=surprise_data.surprise_type.value,
            message=surprise_data.message,
            reveal_type=surprise_data.reveal_type.value,
            reveal_date=surprise_data.reveal_date,
            reveal_time=surprise_data.reveal_time,
            reveal_clicks=surprise_data.reveal_clicks,
            click_cooldown=surprise_data.click_cooldown,
            current_clicks=0,
            is_revealed=False
        )
        
        # Handle file upload for photo/video types
        if content_file and surprise_data.surprise_type.value in ['photo', 'video']:
            content = await content_file.read()
            filename = generate_filename(content_file.filename)
            subfolder = "surprises"
            file_path = await save_image(content, filename, subfolder)
            surprise.content_path = file_path
        
        db.add(surprise)
        await db.commit()
        await db.refresh(surprise)
        
        return surprise
    
    @staticmethod
    async def update_surprise(
        db: AsyncSession,
        surprise: Surprise,
        surprise_data: SurpriseUpdate
    ) -> Surprise:
        """Update a surprise (only if not revealed)."""
        # Re-query the surprise to ensure it's attached to the current session
        db_surprise = await SurpriseService.get_surprise_by_id(db, surprise.id, surprise.from_user_id)
        if not db_surprise:
            raise ValueError("Surpriza nu a fost găsită")

        if db_surprise.is_revealed:
            raise ValueError("Nu puteți modifica o surpriză deja revelată")

        update_data = surprise_data.dict(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                setattr(db_surprise, field, value)

        await db.commit()
        await db.refresh(db_surprise)

        return db_surprise
    
    @staticmethod
    async def delete_surprise(db: AsyncSession, surprise: Surprise) -> None:
        """Delete a surprise."""
        # Delete content file if exists
        if surprise.content_path:
            file_path = os.path.join(settings.UPLOAD_DIR, surprise.content_path)
            if os.path.exists(file_path):
                os.remove(file_path)
        
        await db.delete(surprise)
        await db.commit()
    
    @staticmethod
    async def register_click(
        db: AsyncSession,
        surprise: Surprise,
        user_id: int
    ) -> Surprise:
        """Register a click on a surprise."""
        # Re-query the surprise to ensure it's attached to the current session
        db_surprise = await SurpriseService.get_surprise_by_id(db, surprise.id, user_id)
        if not db_surprise:
            raise ValueError("Surpriza nu a fost găsită")

        if user_id != db_surprise.to_user_id:
            raise ValueError("Doar destinatarul poate da click pe surpriză")

        if db_surprise.is_revealed:
            raise ValueError("Surpriza este deja revelată")

        if db_surprise.reveal_type not in ['clicks', 'both']:
            raise ValueError("Această surpriză nu se deblochează prin click-uri")

        # Check cooldown
        now = datetime.utcnow()
        if db_surprise.last_click_at:
            elapsed = (now - db_surprise.last_click_at).total_seconds() * 1000
            if elapsed < db_surprise.click_cooldown:
                raise ValueError(f"Așteptați {db_surprise.click_cooldown - int(elapsed)}ms înainte de următorul click")

        # Register click
        db_surprise.current_clicks += 1
        db_surprise.last_click_at = now

        # Check if should be revealed
        if db_surprise.current_clicks >= db_surprise.reveal_clicks:
            if db_surprise.reveal_type == 'clicks':
                db_surprise.is_revealed = True
                db_surprise.revealed_at = now
            elif db_surprise.reveal_type == 'both' and db_surprise.reveal_date:
                if date.today() >= db_surprise.reveal_date:
                    db_surprise.is_revealed = True
                    db_surprise.revealed_at = now

        await db.commit()
        await db.refresh(db_surprise)

        db_surprise.can_reveal = SurpriseService._can_reveal(db_surprise)
        db_surprise.progress_percentage = SurpriseService._calculate_progress(db_surprise)

        return db_surprise
    
    @staticmethod
    async def reveal_surprise(
        db: AsyncSession,
        surprise: Surprise,
        user_id: int
    ) -> Surprise:
        """Manually reveal a surprise if conditions are met."""
        # Re-query the surprise to ensure it's attached to the current session
        db_surprise = await SurpriseService.get_surprise_by_id(db, surprise.id, user_id)
        if not db_surprise:
            raise ValueError("Surpriza nu a fost găsită")

        if user_id != db_surprise.to_user_id:
            raise ValueError("Doar destinatarul poate revela surpriza")

        if db_surprise.is_revealed:
            raise ValueError("Surpriza este deja revelată")

        if not SurpriseService._can_reveal(db_surprise):
            raise ValueError("Condițiile de revelare nu sunt îndeplinite")

        db_surprise.is_revealed = True
        db_surprise.revealed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(db_surprise)

        return db_surprise
    
    @staticmethod
    def _can_reveal(surprise: Surprise) -> bool:
        """Check if surprise can be revealed."""
        if surprise.is_revealed:
            return True
        
        if surprise.reveal_type == 'date':
            return date.today() >= surprise.reveal_date if surprise.reveal_date else False
        
        if surprise.reveal_type == 'clicks':
            return surprise.current_clicks >= surprise.reveal_clicks
        
        if surprise.reveal_type == 'both':
            date_condition = date.today() >= surprise.reveal_date if surprise.reveal_date else False
            click_condition = surprise.current_clicks >= surprise.reveal_clicks
            return date_condition and click_condition
        
        return False
    
    @staticmethod
    def _calculate_progress(surprise: Surprise) -> float:
        """Calculate reveal progress percentage."""
        if surprise.is_revealed:
            return 100.0
        
        if surprise.reveal_type == 'date':
            return 100.0 if date.today() >= surprise.reveal_date else 0.0
        
        if surprise.reveal_type == 'clicks':
            return min(100.0, (surprise.current_clicks / surprise.reveal_clicks) * 100)
        
        if surprise.reveal_type == 'both':
            click_progress = (surprise.current_clicks / surprise.reveal_clicks) * 100
            date_progress = 100.0 if date.today() >= surprise.reveal_date else 0.0
            return min(click_progress, date_progress)
        
        return 0.0
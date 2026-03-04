"""
Background video transcoding service.
Runs ffmpeg transcoding in a background thread to avoid blocking HTTP requests.
"""
import asyncio
import logging
import os
from app.database import async_session
from app.models.photo import Photo
from app.models.coming_soon import ComingSoonPhoto
from app.utils.image_processor import transcode_video_if_needed, needs_transcoding
from app.config import settings
from sqlalchemy import select

logger = logging.getLogger(__name__)


async def background_transcode(photo_id: int, file_path: str, subfolder: str):
    """
    Transcode a video in the background and update the DB record when done.
    This runs as an asyncio task, not blocking the HTTP response.
    """
    try:
        logger.info(f"Background transcode starting for photo {photo_id}: {file_path}")
        
        # Update status to processing
        async with async_session() as db:
            result = await db.execute(select(Photo).where(Photo.id == photo_id))
            photo = result.scalar_one_or_none()
            if photo:
                photo.transcoding_status = "processing"
                await db.commit()
        
        # Run transcoding (this is CPU-intensive, run in thread pool)
        loop = asyncio.get_event_loop()
        new_path, was_transcoded = await loop.run_in_executor(
            None, _sync_transcode, file_path, subfolder
        )
        
        # Update DB record
        async with async_session() as db:
            result = await db.execute(select(Photo).where(Photo.id == photo_id))
            photo = result.scalar_one_or_none()
            if photo:
                if was_transcoded:
                    photo.file_path = new_path
                    photo.filename = os.path.basename(new_path)
                    full_path = os.path.join(settings.UPLOAD_DIR, new_path)
                    if os.path.exists(full_path):
                        photo.file_size = os.path.getsize(full_path)
                    photo.mime_type = "video/mp4"
                    photo.transcoding_status = "done"
                    logger.info(f"Transcoding complete for photo {photo_id}: {new_path}")
                else:
                    photo.transcoding_status = "done"
                    logger.info(f"No transcoding needed for photo {photo_id}")
                await db.commit()
    except Exception as e:
        logger.error(f"Background transcoding failed for photo {photo_id}: {e}")
        try:
            async with async_session() as db:
                result = await db.execute(select(Photo).where(Photo.id == photo_id))
                photo = result.scalar_one_or_none()
                if photo:
                    photo.transcoding_status = "failed"
                    await db.commit()
        except Exception:
            pass


def _sync_transcode(file_path: str, subfolder: str):
    """Synchronous wrapper for transcode_video_if_needed (for thread pool)."""
    import asyncio
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(transcode_video_if_needed(file_path, subfolder))
    finally:
        loop.close()


def start_background_transcode(photo_id: int, file_path: str, subfolder: str):
    """
    Launch background transcoding as an asyncio task.
    Call this from request handlers after saving the video to DB.
    """
    loop = asyncio.get_event_loop()
    loop.create_task(background_transcode(photo_id, file_path, subfolder))


async def background_transcode_coming_soon(photo_id: int, file_path: str, subfolder: str):
    """
    Transcode a Coming Soon video in the background and update the DB record when done.
    Same logic as background_transcode but uses ComingSoonPhoto model.
    """
    try:
        logger.info(f"Background transcode starting for coming_soon photo {photo_id}: {file_path}")

        # Update status to processing
        async with async_session() as db:
            result = await db.execute(select(ComingSoonPhoto).where(ComingSoonPhoto.id == photo_id))
            photo = result.scalar_one_or_none()
            if photo:
                photo.transcoding_status = "processing"
                await db.commit()

        # Run transcoding (CPU-intensive, run in thread pool)
        loop = asyncio.get_event_loop()
        new_path, was_transcoded = await loop.run_in_executor(
            None, _sync_transcode, file_path, subfolder
        )

        # Update DB record
        async with async_session() as db:
            result = await db.execute(select(ComingSoonPhoto).where(ComingSoonPhoto.id == photo_id))
            photo = result.scalar_one_or_none()
            if photo:
                if was_transcoded:
                    photo.file_path = new_path
                    photo.filename = os.path.basename(new_path)
                    full_path = os.path.join(settings.UPLOAD_DIR, new_path)
                    if os.path.exists(full_path):
                        photo.file_size = os.path.getsize(full_path)
                    photo.mime_type = "video/mp4"
                    photo.transcoding_status = "done"
                    logger.info(f"Transcoding complete for coming_soon photo {photo_id}: {new_path}")
                else:
                    photo.transcoding_status = "done"
                    logger.info(f"No transcoding needed for coming_soon photo {photo_id}")
                await db.commit()
    except Exception as e:
        logger.error(f"Background transcoding failed for coming_soon photo {photo_id}: {e}")
        try:
            async with async_session() as db:
                result = await db.execute(select(ComingSoonPhoto).where(ComingSoonPhoto.id == photo_id))
                photo = result.scalar_one_or_none()
                if photo:
                    photo.transcoding_status = "failed"
                    await db.commit()
        except Exception:
            pass


def start_coming_soon_background_transcode(photo_id: int, file_path: str, subfolder: str):
    """
    Launch background transcoding for a Coming Soon video.
    """
    loop = asyncio.get_event_loop()
    loop.create_task(background_transcode_coming_soon(photo_id, file_path, subfolder))

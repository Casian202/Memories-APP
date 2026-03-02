"""
One-time script to transcode all existing H.265/HEVC videos to H.264.
Run inside the backend container:
    python -m app.utils.transcode_existing
"""
import os
import sys
import asyncio
import logging

# Add parent dirs to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from app.utils.image_processor import get_video_codec, transcode_to_h264, ALLOWED_VIDEO_TYPES
from app.config import settings
from app.database import async_session
from sqlalchemy import select, update
from app.models.photo import Photo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

VIDEO_EXTENSIONS = {f".{ext}" for ext in ALLOWED_VIDEO_TYPES.values()}


async def transcode_all():
    """Find and transcode all H.265 videos in the upload directory."""
    upload_dir = settings.UPLOAD_DIR
    logger.info(f"Scanning {upload_dir} for H.265 videos...")
    
    hevc_videos = []
    
    # Walk through all files
    for root, dirs, files in os.walk(upload_dir):
        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in VIDEO_EXTENSIONS:
                full_path = os.path.join(root, filename)
                codec = get_video_codec(full_path)
                if codec and codec.lower() in {"hevc", "h265", "hev1"}:
                    rel_path = os.path.relpath(full_path, upload_dir)
                    hevc_videos.append((full_path, rel_path))
                    logger.info(f"  Found H.265: {rel_path} (codec: {codec})")
                else:
                    logger.info(f"  OK: {os.path.relpath(full_path, upload_dir)} (codec: {codec})")
    
    if not hevc_videos:
        logger.info("No H.265 videos found. Nothing to do.")
        return
    
    logger.info(f"\nFound {len(hevc_videos)} H.265 video(s) to transcode.")
    
    async with async_session() as db:
        for full_path, rel_path in hevc_videos:
            logger.info(f"\nTranscoding: {rel_path}")
            
            base, _ = os.path.splitext(full_path)
            output_path = base + "_h264.mp4"
            
            success = transcode_to_h264(full_path, output_path)
            
            if success and os.path.isfile(output_path):
                # Calculate new relative path
                new_filename = os.path.basename(base) + ".mp4"
                final_path = os.path.join(os.path.dirname(full_path), new_filename)
                
                # Remove original
                old_size = os.path.getsize(full_path)
                os.remove(full_path)
                
                # Rename transcoded
                os.rename(output_path, final_path)
                new_size = os.path.getsize(final_path)
                
                new_rel_path = os.path.relpath(final_path, upload_dir)
                
                logger.info(f"  Done: {old_size // 1024}KB -> {new_size // 1024}KB")
                logger.info(f"  Path: {rel_path} -> {new_rel_path}")
                
                # Update database record
                # Use forward slashes for consistency
                old_db_path = rel_path.replace("\\", "/")
                new_db_path = new_rel_path.replace("\\", "/")
                
                result = await db.execute(
                    update(Photo)
                    .where(Photo.file_path == old_db_path)
                    .values(
                        file_path=new_db_path,
                        filename=new_filename,
                        file_size=new_size,
                        mime_type="video/mp4"
                    )
                )
                if result.rowcount > 0:
                    logger.info(f"  Updated {result.rowcount} DB record(s)")
                else:
                    logger.warning(f"  No DB record found for path: {old_db_path}")
            else:
                logger.error(f"  FAILED to transcode: {rel_path}")
                if os.path.exists(output_path):
                    os.remove(output_path)
        
        await db.commit()
    
    logger.info("\nTranscoding complete!")


if __name__ == "__main__":
    asyncio.run(transcode_all())

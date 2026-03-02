"""
Image and video processing utilities.
"""
import os
import uuid
from io import BytesIO
from PIL import Image, ImageOps
from typing import Tuple, Optional
import aiofiles

from app.config import settings


# Allowed image types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}

# Allowed video types
ALLOWED_VIDEO_TYPES = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
    "video/3gpp": "3gp",
    "video/3gpp2": "3g2",
    "video/x-m4v": "m4v",
    "video/mpeg": "mpeg",
    "video/ogg": "ogv",
    "video/x-ms-wmv": "wmv",
    "video/MP2T": "ts",
}

# Combined allowed types
ALLOWED_TYPES = {**ALLOWED_IMAGE_TYPES, **ALLOWED_VIDEO_TYPES}

# Maximum dimensions
MAX_WIDTH = 1920
MAX_HEIGHT = 1920
THUMBNAIL_SIZE = (300, 300)
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB


def validate_image(content_type: str) -> bool:
    """Check if content type is an allowed image."""
    return content_type in ALLOWED_IMAGE_TYPES


def validate_video(content_type: str) -> bool:
    """Check if content type is an allowed video."""
    return content_type in ALLOWED_VIDEO_TYPES


def validate_media(content_type: str) -> bool:
    """Check if content type is an allowed image or video."""
    return content_type in ALLOWED_TYPES


def is_video(content_type: str) -> bool:
    """Check if content type is a video."""
    return content_type in ALLOWED_VIDEO_TYPES


def generate_filename(original_filename: str) -> str:
    """Generate a unique filename."""
    ext = os.path.splitext(original_filename)[1].lower()
    if not ext:
        ext = ".jpg"
    return f"{uuid.uuid4()}{ext}"


async def process_image(
    image_data: bytes,
    filename: str,
    max_width: int = MAX_WIDTH,
    max_height: int = MAX_HEIGHT,
    quality: int = 85
) -> Tuple[bytes, int, int]:
    """
    Process an image: resize if needed and compress.
    Returns processed image data, width, and height.
    """
    img = Image.open(BytesIO(image_data))
    
    # Apply EXIF orientation (fixes phone photo rotation)
    img = ImageOps.exif_transpose(img)
    
    # Convert RGBA to RGB for JPEG
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = background
    
    # Resize if needed
    width, height = img.size
    if width > max_width or height > max_height:
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        width, height = img.size
    
    # Save to bytes
    output = BytesIO()
    img.save(output, format="JPEG", quality=quality, optimize=True)
    output.seek(0)
    
    return output.read(), width, height


async def create_thumbnail(
    image_data: bytes,
    size: Tuple[int, int] = THUMBNAIL_SIZE,
    quality: int = 75
) -> bytes:
    """
    Create a thumbnail from image data.
    """
    img = Image.open(BytesIO(image_data))
    
    # Apply EXIF orientation
    img = ImageOps.exif_transpose(img)
    
    # Convert RGBA to RGB
    if img.mode in ("RGBA", "LA", "P"):
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
        img = background
    
    # Create thumbnail
    img.thumbnail(size, Image.Resampling.LANCZOS)
    
    # Save to bytes
    output = BytesIO()
    img.save(output, format="JPEG", quality=quality, optimize=True)
    output.seek(0)
    
    return output.read()


async def save_image(
    image_data: bytes,
    filename: str,
    subfolder: str = ""
) -> str:
    """
    Save image to the upload directory.
    Returns the file path relative to upload directory.
    """
    # Ensure upload directory exists
    upload_dir = settings.UPLOAD_DIR
    if subfolder:
        upload_dir = os.path.join(upload_dir, subfolder)
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, filename)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(image_data)
    
    # Return relative path
    return os.path.join(subfolder, filename) if subfolder else filename


async def save_video(
    video_data: bytes,
    filename: str,
    subfolder: str = ""
) -> str:
    """
    Save video to the upload directory.
    Returns the file path relative to upload directory.
    """
    upload_dir = settings.UPLOAD_DIR
    if subfolder:
        upload_dir = os.path.join(upload_dir, subfolder)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, filename)
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(video_data)

    return os.path.join(subfolder, filename) if subfolder else filename


async def save_video_streaming(
    upload_file,
    filename: str,
    subfolder: str = "",
    max_size: int = 0
) -> tuple:
    """
    Save video from UploadFile using streaming chunks to avoid memory issues.
    Returns (relative file path, file size).
    """
    upload_dir = settings.UPLOAD_DIR
    if subfolder:
        upload_dir = os.path.join(upload_dir, subfolder)
    os.makedirs(upload_dir, exist_ok=True)

    file_path = os.path.join(upload_dir, filename)
    total_size = 0
    chunk_size = 1024 * 1024  # 1MB chunks

    try:
        async with aiofiles.open(file_path, "wb") as f:
            while True:
                chunk = await upload_file.read(chunk_size)
                if not chunk:
                    break
                total_size += len(chunk)
                if max_size and total_size > max_size:
                    # Will clean up in finally-like block after context manager exits
                    raise ValueError(f"Fișier prea mare. Maxim {max_size // (1024*1024)}MB")
                await f.write(chunk)
    except ValueError:
        # Clean up partial file on size exceeded
        if os.path.exists(file_path):
            os.remove(file_path)
        raise

    rel_path = os.path.join(subfolder, filename) if subfolder else filename
    return rel_path, total_size


def get_image_url(file_path: str) -> str:
    """Get the URL for an image or video file."""
    return f"/photos/{file_path}"
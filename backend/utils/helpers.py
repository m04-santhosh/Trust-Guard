"""
Shared utilities for TrustGuard backend.
"""
import uuid
import os
from datetime import datetime, timezone


def generate_media_id() -> str:
    """Generate a unique media ID (UUID v4)."""
    return str(uuid.uuid4())


def generate_case_id() -> str:
    """Generate a case ID in TG-YYYY-MM-DD-XXXX format."""
    now = datetime.now(timezone.utc)
    date_part = now.strftime("%Y-%m-%d")
    random_part = uuid.uuid4().hex[:4].upper()
    return f"TG-{date_part}-{random_part}"


def get_timestamp() -> str:
    """Return current UTC timestamp in ISO format."""
    return datetime.now(timezone.utc).isoformat()


def ensure_dir(path: str) -> str:
    """Ensure a directory exists, creating it if necessary. Returns the path."""
    os.makedirs(path, exist_ok=True)
    return path


# Upload directory for temporary media processing
UPLOAD_DIR = ensure_dir(os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads"))
FRAMES_DIR = ensure_dir(os.path.join(UPLOAD_DIR, "frames"))
AUDIO_DIR = ensure_dir(os.path.join(UPLOAD_DIR, "audio"))

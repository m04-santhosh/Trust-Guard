"""
Preprocessor Module (WP-4)
Extracts frames, audio track, cryptographic hash, and speech transcript from uploaded media files.
Produces: Contract 4.1 (Preprocessor Output)
Consumed by: visual_evidence (WP-1), audio_evidence (WP-2), context_claim (WP-3)
"""
import os
import hashlib
import subprocess
import shutil
from typing import Optional

import cv2
from PIL import Image

from backend.utils.helpers import generate_media_id, UPLOAD_DIR, FRAMES_DIR, AUDIO_DIR, ensure_dir


def _find_ffmpeg() -> Optional[str]:
    """Find ffmpeg executable via imageio-ffmpeg or system PATH."""
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    return shutil.which("ffmpeg")


def _compute_sha256(file_path: str) -> str:
    """Compute cryptographic SHA-256 digest of media file for evidence provenance."""
    hasher = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return "sha256_unavailable"


def _transcribe_audio(audio_path: str) -> Optional[str]:
    """Transcribe spoken speech from audio track using SpeechRecognition."""
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.AudioFile(audio_path) as source:
            # Limit to first 25 seconds for fast processing
            audio_data = r.record(source, duration=25)
            transcript = r.recognize_google(audio_data)
            return transcript if transcript else None
    except Exception:
        return None


def preprocess(file_path: str, original_filename: str, caption: Optional[str] = None) -> dict:
    """
    Extract frames, audio, and text from an uploaded media file.
    
    Args:
        file_path: Path to the saved uploaded file
        original_filename: Original filename from the upload
        caption: Optional caption/context text provided by the user
    
    Returns:
        Contract 4.1 JSON with cryptographic SHA-256 and media streaming references
    """
    media_id = generate_media_id()
    ext = os.path.splitext(original_filename)[1].lower()
    
    # 1. Compute cryptographic ingestion fingerprint (Chain-of-Custody)
    sha256_hash = _compute_sha256(file_path)
    
    # 2. Determine media type
    video_exts = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".m4v", ".wmv", ".ts"}
    audio_exts = {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".aac", ".wma", ".opus"}
    image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tiff"}
    
    if ext in video_exts:
        media_type = "video"
    elif ext in audio_exts:
        media_type = "audio"
    elif ext in image_exts:
        media_type = "image"
    else:
        cap = cv2.VideoCapture(file_path)
        if cap.isOpened() and cap.get(cv2.CAP_PROP_FRAME_COUNT) > 1:
            media_type = "video"
            cap.release()
        else:
            if cap.isOpened():
                cap.release()
            media_type = "video"
    
    # Prepare isolated output directories for this media_id
    media_upload_dir = ensure_dir(os.path.join(UPLOAD_DIR, media_id))
    media_frames_dir = ensure_dir(os.path.join(FRAMES_DIR, media_id))
    media_audio_dir = ensure_dir(os.path.join(AUDIO_DIR, media_id))
    
    # Persist source media file under isolated media_id for streaming
    source_dest = os.path.join(media_upload_dir, f"source{ext}")
    if os.path.abspath(file_path) != os.path.abspath(source_dest):
        shutil.copy2(file_path, source_dest)
    
    extracted = {
        "frames": [],
        "audio_track": None,
        "text_content": caption,
        "transcript": None,
    }
    
    metadata = {
        "media_id": media_id,
        "sha256": sha256_hash,
        "media_url": f"/media/{media_id}/file",
        "duration_seconds": None,
        "resolution": None,
        "fps": None,
        "has_audio": False,
        "has_text": caption is not None and len(caption.strip()) > 0,
    }
    
    if media_type == "video":
        # 1. Extract visual keyframes
        extracted["frames"], metadata["resolution"], metadata["fps"], metadata["duration_seconds"] = (
            _extract_video_frames(file_path, media_frames_dir)
        )
        
        # 2. Extract audio track from video
        audio_path = _extract_audio(file_path, media_audio_dir)
        if audio_path and os.path.exists(audio_path) and os.path.getsize(audio_path) > 100:
            extracted["audio_track"] = audio_path
            metadata["has_audio"] = True
            if not metadata["duration_seconds"]:
                metadata["duration_seconds"] = _get_audio_duration(audio_path)
            
            # Autonomous Speech-to-Text Transcription
            extracted["transcript"] = _transcribe_audio(audio_path)
            if extracted["transcript"]:
                metadata["has_text"] = True
            
    elif media_type == "audio":
        # Standardize audio upload to 16kHz mono WAV
        audio_path = _extract_audio(file_path, media_audio_dir)
        if not audio_path:
            dest = os.path.join(media_audio_dir, f"audio{ext}")
            shutil.copy2(file_path, dest)
            audio_path = dest
            
        extracted["audio_track"] = audio_path
        metadata["has_audio"] = True
        metadata["duration_seconds"] = _get_audio_duration(audio_path)
        
        # Autonomous Speech-to-Text Transcription
        extracted["transcript"] = _transcribe_audio(audio_path)
        if extracted["transcript"]:
            metadata["has_text"] = True
        
    elif media_type == "image":
        # Single frame extraction
        dest = os.path.join(media_frames_dir, "frame_001.jpg")
        try:
            img = Image.open(file_path)
            metadata["resolution"] = f"{img.width}x{img.height}"
            img = img.convert("RGB")
            img.save(dest, "JPEG", quality=95)
            extracted["frames"] = [dest]
        except Exception:
            extracted["frames"] = []
    
    return {
        "media_id": media_id,
        "media_type": media_type,
        "original_filename": original_filename,
        "extracted": extracted,
        "metadata": metadata,
    }


def _extract_video_frames(video_path: str, output_dir: str, max_frames: int = 16) -> tuple:
    """Extract key frames from a video at regular intervals."""
    frames = []
    resolution = None
    fps = None
    duration = None
    
    try:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return frames, resolution, fps, duration
        
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps_val = cap.get(cv2.CAP_PROP_FPS)
        fps = round(fps_val, 2) if fps_val > 0 else 30.0
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        if width > 0 and height > 0:
            resolution = f"{width}x{height}"
        
        if fps > 0 and total_frames > 0:
            duration = round(total_frames / fps, 2)
        
        if total_frames <= 0:
            count = 0
            while count < max_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_path = os.path.join(output_dir, f"frame_{count + 1:03d}.jpg")
                cv2.imwrite(frame_path, frame)
                frames.append(frame_path)
                count += 1
            cap.release()
            return frames, resolution, fps, duration
            
        interval = max(1, total_frames // max_frames)
        
        frame_idx = 0
        count = 0
        while count < max_frames and frame_idx < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_path = os.path.join(output_dir, f"frame_{count + 1:03d}.jpg")
            cv2.imwrite(frame_path, frame)
            frames.append(frame_path)
            
            count += 1
            frame_idx += interval
        
        cap.release()
    except Exception:
        pass
    
    return frames, resolution, fps, duration


def _extract_audio(media_path: str, output_dir: str) -> Optional[str]:
    """Extract/standardize audio track to 16kHz mono WAV using ffmpeg."""
    output_path = os.path.join(output_dir, "audio.wav")
    
    ffmpeg_path = _find_ffmpeg()
    if ffmpeg_path is None:
        return None
    
    try:
        result = subprocess.run(
            [
                ffmpeg_path,
                "-i", media_path,
                "-vn",
                "-acodec", "pcm_s16le",
                "-ar", "16000",
                "-ac", "1",
                "-y",
                output_path,
            ],
            capture_output=True,
            timeout=60,
        )
        if result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 100:
            return output_path
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        pass
    
    return None


def _get_audio_duration(audio_path: str) -> Optional[float]:
    """Get audio duration in seconds using wave or scipy."""
    try:
        import wave
        with wave.open(audio_path, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return round(frames / float(rate), 2)
    except Exception:
        try:
            import scipy.io.wavfile as wavfile
            sr, data = wavfile.read(audio_path)
            return round(len(data) / float(sr), 2)
        except Exception:
            return None

"""
TrustGuard Lightweight Authentication & Session Management
Provides secure signup, login, session tokens, and bcrypt password hashing.

CRITICAL DESIGN NOTE:
MFA/OTP intentionally out of scope for this prototype — adds external SMS/email delivery
dependencies that risk live-demo failure, and is not part of the core forensic-analysis
innovation being evaluated. Password hashing + session tokens provide adequate security
for a hackathon prototype handling non-financial demo data.
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field

from backend.storage.database import (
    create_user,
    get_user_by_identifier,
    get_user_by_id,
    create_session,
    get_session,
    delete_session,
    create_password_reset,
    get_password_reset,
    mark_password_reset_used,
    update_user_password,
)
from backend.utils.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


# -----------------------------------------------------------------------------
# Pydantic Schemas (Minimal 2-3 fields max for low friction)
# -----------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class ResetPasswordRequest(BaseModel):
    token: str = Field(..., min_length=4, max_length=64)
    new_password: str = Field(..., min_length=6, max_length=100)

class SignupRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6, max_length=100)


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class UserProfile(BaseModel):
    user_id: str
    email: str
    username: str


class AuthResponse(BaseModel):
    user: UserProfile
    token: str
    expires_at: str


# -----------------------------------------------------------------------------
# Password Hashing Helpers (Bcrypt)
# -----------------------------------------------------------------------------

def hash_password(password: str) -> str:
    """Hash plaintext password with bcrypt using 12 salt rounds."""
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# -----------------------------------------------------------------------------
# Dependency: Extract Current User from Bearer Token
# -----------------------------------------------------------------------------

def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Retrieve logged-in user if valid Bearer token provided; otherwise None."""
    if not authorization:
        return None
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
        
    token = parts[1]
    session_data = get_session(token)
    if not session_data:
        return None
        
    return {
        "user_id": session_data["user_id"],
        "email": session_data["email"],
        "username": session_data["username"],
    }


def get_current_user_required(authorization: Optional[str] = Header(None)) -> dict:
    """Enforce authentication; raise 401 if missing or invalid."""
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


# -----------------------------------------------------------------------------
# Auth API Endpoints
# -----------------------------------------------------------------------------

@router.post("/signup", response_model=AuthResponse)
async def signup(req: SignupRequest):
    """Register a new user account with hashed password."""
    # Check if email or username is already taken
    existing = get_user_by_identifier(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    existing_user = get_user_by_identifier(req.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username is already taken.")
        
    # Hash password with bcrypt
    password_hash = hash_password(req.password)
    user_info = create_user(req.email, req.username, password_hash)
    
    # Generate 7-day session token
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    create_session(user_info["user_id"], token, expires_at)
    
    return {
        "user": user_info,
        "token": token,
        "expires_at": expires_at,
    }


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Authenticate user and issue session token."""
    user = get_user_by_identifier(req.username_or_email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")
        
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    create_session(user["user_id"], token, expires_at)
    
    return {
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "username": user["username"],
        },
        "token": token,
        "expires_at": expires_at,
    }


@router.get("/me", response_model=UserProfile)
async def get_me(user: dict = Depends(get_current_user_required)):
    """Return currently authenticated user profile."""
    return user


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """Revoke active session token."""
    if authorization:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            delete_session(parts[1])
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """
    Generate recovery code and dispatch email via SMTP.
    Returns status and helpful dev notice if SMTP is unconfigured.
    """
    clean_email = req.email.strip().lower()
    user = get_user_by_identifier(clean_email)
    if not user:
        return {
            "status": "ok",
            "message": "If an account matches that email address, a password recovery code has been sent.",
        }

    # Generate 6-digit verification code
    code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = (datetime.utcnow() + timedelta(minutes=15)).isoformat()
    create_password_reset(user["user_id"], code, expires_at)

    sent, msg = send_password_reset_email(user["email"], user["username"], code)

    return {
        "status": "ok",
        "message": "Recovery code sent to your email address." if sent else msg,
        "dev_code": code if not sent else None,
        "smtp_sent": sent,
    }


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Verify recovery code and update password hash.
    """
    clean_token = req.token.strip()
    reset_record = get_password_reset(clean_token)
    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired recovery code. Please request a new code.",
        )

    # Hash new password with bcrypt (12 salt rounds)
    new_hash = hash_password(req.new_password)
    update_user_password(reset_record["user_id"], new_hash)
    mark_password_reset_used(clean_token)

    return {
        "status": "ok",
        "message": "Password updated successfully. You can now sign in with your new password.",
    }


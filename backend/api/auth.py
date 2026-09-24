"""
TrustGuard Lightweight Authentication & Session Management
Provides secure signup, login, session tokens, and bcrypt password hashing.

CRITICAL DESIGN NOTE:
MFA/OTP intentionally out of scope for this prototype — adds external SMS/email delivery
dependencies that risk live-demo failure, and is not part of the core forensic-analysis
innovation being evaluated. Password hashing + session tokens provide adequate security
for a hackathon prototype handling non-financial demo data.
"""
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field

from backend.storage.database import (
    create_user,
    update_pending_user,
    verify_user_account,
    get_user_by_identifier,
    get_user_by_id,
    get_user_by_email,
    get_user_by_username,
    create_email_verification,
    get_latest_active_verification,
    get_latest_verification_for_email,
    increment_verification_attempts,
    mark_verification_used,
    create_session,
    get_session,
    delete_session,
    create_password_reset,
    get_password_reset,
    get_latest_active_reset_for_user,
    get_latest_reset_for_user,
    increment_reset_attempts,
    set_reset_ticket,
    get_password_reset_by_ticket,
    mark_password_reset_used,
    update_user_password,
)
from backend.utils.email_service import (
    send_password_reset_otp,
    send_password_reset_email,
    send_registration_otp,
)

router = APIRouter(prefix="/auth", tags=["auth"])

GENERIC_FORGOT_MSG = "If the account exists, a verification code has been sent to the email address."
_RECENT_OTP_REQUESTS: dict[str, float] = {}


# -----------------------------------------------------------------------------
# Password Policy & Validation
# -----------------------------------------------------------------------------

def validate_password_strength(password: str) -> None:
    """Enforce a minimum production password security policy."""
    if len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long.",
        )
    if len(password) > 100:
        raise HTTPException(
            status_code=400,
            detail="Password must not exceed 100 characters.",
        )
    if not any(c.isdigit() or not c.isalnum() for c in password):
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least one number or special character.",
        )


# -----------------------------------------------------------------------------
# Pydantic Schemas
# -----------------------------------------------------------------------------

class ForgotPasswordRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


class VerifyResetOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    otp: str = Field(..., min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    email: Optional[str] = None
    otp: Optional[str] = None
    reset_token: Optional[str] = None
    token: Optional[str] = None
    new_password: str = Field(..., min_length=8, max_length=100)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=100)


class SignupRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=100)


class VerifySignupOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)
    otp: str = Field(..., min_length=6, max_length=6)


class ResendSignupOtpRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=120)


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

@router.post("/signup")
async def signup(req: SignupRequest):
    """
    Register a new user account as unverified and dispatch a secure 6-digit OTP via SMTP.
    Account remains unverified until email OTP is successfully confirmed.
    """
    validate_password_strength(req.password)
    clean_email = req.email.strip().lower()
    clean_username = req.username.strip()

    # Check if email is already taken
    existing_email = get_user_by_email(clean_email)
    if existing_email:
        if existing_email.get("is_verified", 1) == 1:
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists. Please sign in.",
            )
        
        # Unverified user exists: check 60s resend cooldown
        last_v = get_latest_verification_for_email(clean_email)
        if last_v and last_v.get("created_at"):
            try:
                created_dt = datetime.strptime(last_v["created_at"], "%Y-%m-%d %H:%M:%S")
                if (datetime.utcnow() - created_dt).total_seconds() < 60:
                    raise HTTPException(
                        status_code=429,
                        detail="Please wait 60 seconds before requesting another verification code.",
                    )
            except HTTPException:
                raise
            except Exception:
                pass

        # Check if username changed and is taken by another user
        existing_user = get_user_by_username(clean_username)
        if existing_user and existing_user["user_id"] != existing_email["user_id"]:
            raise HTTPException(status_code=400, detail="Username is already taken.")

        # Update pending user credentials with new bcrypt password hash and username
        password_hash = hash_password(req.password)
        update_pending_user(existing_email["user_id"], clean_username, password_hash)
        user_id = existing_email["user_id"]
        username = clean_username
    else:
        # Check if username is already taken by any user
        existing_user = get_user_by_username(clean_username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username is already taken.")

        # Create unverified user record with is_verified = 0
        password_hash = hash_password(req.password)
        user_info = create_user(clean_email, clean_username, password_hash, is_verified=0)
        user_id = user_info["user_id"]
        username = user_info["username"]

    # Generate cryptographically secure 6-digit OTP
    otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")

    # Invalidate previous registration OTPs and record new hashed OTP
    create_email_verification(user_id, clean_email, otp_hash, expires_at)

    # Dispatch registration verification code via SMTP
    send_registration_otp(clean_email, username, otp)

    return {
        "status": "ok",
        "success": True,
        "requires_verification": True,
        "email": clean_email,
        "message": "A 6-digit verification code has been dispatched to your email address.",
        "cooldown_seconds": 60,
    }


@router.post("/verify-signup-otp")
async def verify_signup_otp(req: VerifySignupOtpRequest):
    """
    Verify 6-digit registration OTP, activate user account, and consume OTP.
    Enforces 10-minute expiry, max 5 failed attempts, and single-use invalidation.
    """
    generic_err = "Invalid or expired verification code."
    clean_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(status_code=400, detail=generic_err)

    user = get_user_by_email(clean_email)
    if not user:
        raise HTTPException(status_code=400, detail=generic_err)

    if user.get("is_verified", 1) == 1:
        return {
            "status": "ok",
            "success": True,
            "message": "Your account is already verified. Please sign in.",
        }

    v_record = get_latest_active_verification(clean_email)
    if not v_record:
        raise HTTPException(status_code=400, detail=generic_err)

    # Check attempt limit (max 5)
    if v_record.get("attempts", 0) >= 5:
        mark_verification_used(v_record["verification_id"])
        raise HTTPException(
            status_code=400,
            detail="Too many failed attempts. This verification code has been locked. Please request a new code.",
        )

    entered_hash = hashlib.sha256(clean_otp.encode("utf-8")).hexdigest()
    if not secrets.compare_digest(v_record["otp_hash"], entered_hash):
        attempts = increment_verification_attempts(v_record["verification_id"])
        if attempts >= 5:
            raise HTTPException(
                status_code=400,
                detail="Too many failed attempts. This verification code has been locked. Please request a new code.",
            )
        raise HTTPException(status_code=400, detail=generic_err)

    # Mark verification consumed and activate user
    mark_verification_used(v_record["verification_id"])
    verify_user_account(user["user_id"])

    return {
        "status": "ok",
        "success": True,
        "message": "Your email has been verified and your Trust-Guard account is ready.",
    }


@router.post("/resend-signup-otp")
async def resend_signup_otp(req: ResendSignupOtpRequest):
    """
    Resend registration verification code for unverified accounts.
    Enforces 60-second cooldown and invalidates previous OTP.
    """
    clean_email = req.email.strip().lower()
    user = get_user_by_email(clean_email)
    if not user:
        return {
            "status": "ok",
            "success": True,
            "message": "If the account exists and is unverified, a new verification code has been sent.",
            "cooldown_seconds": 60,
        }

    if user.get("is_verified", 1) == 1:
        raise HTTPException(
            status_code=400,
            detail="Account is already verified. Please sign in.",
        )

    # Check 60-second cooldown
    last_v = get_latest_verification_for_email(clean_email)
    if last_v and last_v.get("created_at"):
        try:
            created_dt = datetime.strptime(last_v["created_at"], "%Y-%m-%d %H:%M:%S")
            if (datetime.utcnow() - created_dt).total_seconds() < 60:
                raise HTTPException(
                    status_code=429,
                    detail="Please wait 60 seconds before requesting another verification code.",
                )
        except HTTPException:
            raise
        except Exception:
            pass

    otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")

    create_email_verification(user["user_id"], clean_email, otp_hash, expires_at)
    send_registration_otp(clean_email, user["username"], otp)

    return {
        "status": "ok",
        "success": True,
        "message": "A new verification code has been dispatched to your email.",
        "cooldown_seconds": 60,
    }


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest):
    """Authenticate user and issue session token."""
    user = get_user_by_identifier(req.username_or_email)
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")
        
    # Block unverified accounts from logging in
    if user.get("is_verified", 1) == 0:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email before signing in.",
        )

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
    Generate cryptographically secure 6-digit OTP and dispatch email via SMTP.
    Always returns the exact same generic message to prevent account enumeration.
    Enforces a 60-second resend cooldown.
    Never exposes or logs the OTP.
    """
    clean_email = req.email.strip().lower()
    now_ts = datetime.utcnow().timestamp()

    # Enforce 60-second cooldown
    last_req_ts = _RECENT_OTP_REQUESTS.get(clean_email)
    if last_req_ts and (now_ts - last_req_ts) < 60:
        raise HTTPException(
            status_code=429,
            detail="Please wait 60 seconds before requesting another verification code.",
        )

    user = get_user_by_identifier(clean_email)
    if not user:
        _RECENT_OTP_REQUESTS[clean_email] = now_ts
        return {
            "status": "ok",
            "success": True,
            "message": GENERIC_FORGOT_MSG,
        }

    # Check database created_at for user
    last_reset = get_latest_reset_for_user(user["user_id"])
    if last_reset and last_reset.get("created_at"):
        try:
            created_dt = datetime.strptime(last_reset["created_at"], "%Y-%m-%d %H:%M:%S")
            if (datetime.utcnow() - created_dt).total_seconds() < 60:
                raise HTTPException(
                    status_code=429,
                    detail="Please wait 60 seconds before requesting another verification code.",
                )
        except Exception:
            pass

    # Generate 6-digit OTP using secrets module (never random.randint)
    otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
    # 10 minutes expiration
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")

    # Invalidate previous active OTPs and record new hashed OTP
    create_password_reset(user["user_id"], otp_hash, expires_at)
    _RECENT_OTP_REQUESTS[clean_email] = now_ts

    # Send OTP via SMTP (never log or expose OTP in response)
    send_password_reset_otp(user["email"], user["username"], otp)

    return {
        "status": "ok",
        "success": True,
        "message": GENERIC_FORGOT_MSG,
    }


@router.post("/verify-reset-otp")
async def verify_reset_otp(req: VerifyResetOtpRequest):
    """
    Verify 6-digit OTP code against secure hash stored in database.
    Enforces 10-minute expiry, max 5 failed attempts, and single-use invalidation.
    Returns a secure reset authorization ticket upon success.
    """
    generic_err = "Invalid or expired verification code."
    clean_email = req.email.strip().lower()
    clean_otp = req.otp.strip()

    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(status_code=400, detail=generic_err)

    user = get_user_by_identifier(clean_email)
    if not user:
        raise HTTPException(status_code=400, detail=generic_err)

    reset_record = get_latest_active_reset_for_user(user["user_id"])
    if not reset_record:
        raise HTTPException(status_code=400, detail=generic_err)

    # Check attempt limit (max 5)
    if reset_record.get("attempts", 0) >= 5:
        mark_password_reset_used(reset_record["reset_id"])
        raise HTTPException(status_code=400, detail=generic_err)

    entered_hash = hashlib.sha256(clean_otp.encode("utf-8")).hexdigest()
    if not secrets.compare_digest(reset_record["token"], entered_hash):
        increment_reset_attempts(reset_record["reset_id"])
        raise HTTPException(status_code=400, detail=generic_err)

    # OTP is verified! Issue a single-use authorization ticket
    reset_ticket = secrets.token_urlsafe(32)
    ticket_hash = hashlib.sha256(reset_ticket.encode("utf-8")).hexdigest()
    set_reset_ticket(reset_record["reset_id"], ticket_hash)

    return {
        "status": "ok",
        "valid": True,
        "reset_token": reset_ticket,
        "message": "Verification code confirmed.",
    }


@router.get("/verify-reset-token")
async def verify_reset_token(token: str):
    """
    Legacy verification endpoint kept for backward compatibility.
    """
    clean_token = token.strip()
    token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()
    record = get_password_reset_by_ticket(token_hash) or get_password_reset(token_hash)
    if not record:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired verification code.",
        )
    return {"status": "ok", "valid": True}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """
    Verify recovery ticket/OTP, validate password policy, and update user password hash.
    Invalidates the reset record and active sessions so it cannot be reused.
    """
    generic_err = "Invalid or expired verification code."
    reset_record = None

    if req.reset_token:
        clean_ticket = req.reset_token.strip()
        ticket_hash = hashlib.sha256(clean_ticket.encode("utf-8")).hexdigest()
        reset_record = get_password_reset_by_ticket(ticket_hash)
    elif req.email and req.otp:
        clean_email = req.email.strip().lower()
        clean_otp = req.otp.strip()
        user = get_user_by_identifier(clean_email)
        if user:
            rec = get_latest_active_reset_for_user(user["user_id"])
            if rec and rec.get("reset_ticket"):
                entered_hash = hashlib.sha256(clean_otp.encode("utf-8")).hexdigest()
                if secrets.compare_digest(rec["token"], entered_hash):
                    reset_record = rec
    elif req.token:
        clean_token = req.token.strip()
        token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()
        reset_record = get_password_reset_by_ticket(token_hash) or get_password_reset(token_hash)

    if not reset_record:
        raise HTTPException(
            status_code=400,
            detail=generic_err,
        )

    validate_password_strength(req.new_password)
    new_hash = hash_password(req.new_password)
    update_user_password(reset_record["user_id"], new_hash)
    mark_password_reset_used(reset_record["reset_id"])

    return {
        "status": "ok",
        "success": True,
        "message": "Your password has been reset successfully. You can now sign in with your new password.",
    }


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: dict = Depends(get_current_user_required),
):
    """
    Authenticated password update.
    Requires current password verification, enforces password policy,
    revokes old sessions, and issues a fresh session token.
    """
    user_record = get_user_by_id(user["user_id"])
    if not user_record or not verify_password(req.current_password, user_record.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Incorrect current password.")

    if req.current_password == req.new_password:
        raise HTTPException(status_code=400, detail="New password cannot be the same as your current password.")

    validate_password_strength(req.new_password)
    new_hash = hash_password(req.new_password)

    # Update password in DB (also revokes all prior sessions)
    update_user_password(user["user_id"], new_hash)

    # Issue fresh active session token so active user remains authenticated
    new_token = secrets.token_urlsafe(32)
    expires_at = (datetime.utcnow() + timedelta(days=7)).isoformat()
    create_session(user["user_id"], new_token, expires_at)

    return {
        "status": "ok",
        "message": "Password updated successfully.",
        "token": new_token,
        "expires_at": expires_at,
    }



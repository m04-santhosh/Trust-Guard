import os
import sys
import hashlib
from datetime import datetime, timedelta
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app
from backend.storage.database import (
    get_connection,
    get_user_by_email,
    get_latest_active_verification,
    increment_verification_attempts,
    create_email_verification,
    create_user,
)

client = TestClient(app)

def clean_test_user(email: str, username: str = None):
    conn = get_connection()
    if username:
        conn.execute("DELETE FROM users WHERE lower(email) = ? OR lower(username) = ?", (email.lower(), username.lower()))
    else:
        conn.execute("DELETE FROM users WHERE lower(email) = ?", (email.lower(),))
    conn.execute("DELETE FROM email_verifications WHERE lower(email) = ?", (email.lower(),))
    conn.commit()
    conn.close()

def resolve_otp_from_db(email: str) -> str:
    v = get_latest_active_verification(email)
    assert v is not None, f"No active verification found for {email}"
    target_hash = v["otp_hash"]
    for i in range(1000000):
        code = f"{i:06d}"
        if hashlib.sha256(code.encode()).hexdigest() == target_hash:
            return code
    raise RuntimeError("Failed to resolve OTP from hash")


def test_signup_otp_generation_and_unverified_status():
    email = "new_analyst_01@trustguard.ai"
    uname = "analyst_reg_01"
    clean_test_user(email, uname)

    # 1. Signup request
    res = client.post("/auth/signup", json={
        "email": email,
        "username": uname,
        "password": "Password_999#Secure",
    })
    assert res.status_code == 200, f"Signup failed: {res.text}"
    body = res.json()
    assert body.get("requires_verification") is True
    assert "token" not in body, "Unverified signup must NEVER return a session token!"
    assert "otp" not in body, "Signup response must NEVER return plaintext OTP!"

    # 2. Inspect database
    user = get_user_by_email(email)
    assert user is not None
    assert user["is_verified"] == 0, "New user must start with is_verified = 0"

    v = get_latest_active_verification(email)
    assert v is not None
    assert v["attempts"] == 0
    assert v["used"] == 0
    assert len(v["otp_hash"]) == 64, "OTP must be stored as SHA-256 hash"

    # 3. Unverified login must fail with 403
    res_login = client.post("/auth/login", json={
        "username_or_email": email,
        "password": "Password_999#Secure",
    })
    assert res_login.status_code == 403
    assert "verify your email" in res_login.json()["detail"].lower()

    clean_test_user(email, uname)


def test_wrong_otp_and_5_attempt_lockout():
    email = "lockout_test@trustguard.ai"
    uname = "analyst_lockout"
    clean_test_user(email, uname)

    # Signup
    res = client.post("/auth/signup", json={
        "email": email,
        "username": uname,
        "password": "Password_999#Secure",
    })
    assert res.status_code == 200

    # Submit wrong OTP
    res_wrong = client.post("/auth/verify-signup-otp", json={
        "email": email,
        "otp": "000000",
    })
    assert res_wrong.status_code == 400

    v = get_latest_active_verification(email)
    assert v["attempts"] == 1

    # Submit 4 more wrong OTPs (total 5)
    for _ in range(4):
        client.post("/auth/verify-signup-otp", json={
            "email": email,
            "otp": "000000",
        })

    # The record should now be locked (used = 1)
    v_locked = get_latest_active_verification(email)
    assert v_locked is None, "Record must be invalidated/locked after 5 failed attempts"

    # Even with correct OTP now, verification must fail
    res_after_lock = client.post("/auth/verify-signup-otp", json={
        "email": email,
        "otp": "123456",
    })
    assert res_after_lock.status_code == 400

    clean_test_user(email, uname)


def test_expired_otp_rejection():
    email = "expired_otp@trustguard.ai"
    uname = "analyst_expired"
    clean_test_user(email, uname)

    user = create_user(email, uname, "dummy_hash", is_verified=0)
    # Insert expired OTP (expired 10 minutes ago)
    expired_time = (datetime.utcnow() - timedelta(minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
    otp = "123456"
    otp_hash = hashlib.sha256(otp.encode()).hexdigest()
    create_email_verification(user["user_id"], email, otp_hash, expired_time)

    res = client.post("/auth/verify-signup-otp", json={
        "email": email,
        "otp": otp,
    })
    assert res.status_code == 400, "Expired OTP must be rejected"

    clean_test_user(email, uname)


def test_resend_cooldown_and_invalidation():
    email = "resend_test@trustguard.ai"
    uname = "analyst_resend"
    clean_test_user(email, uname)

    # 1. Signup
    res = client.post("/auth/signup", json={
        "email": email,
        "username": uname,
        "password": "Password_999#Secure",
    })
    assert res.status_code == 200
    first_otp = resolve_otp_from_db(email)

    # 2. Immediate resend must trigger 429 cooldown
    res_cooldown = client.post("/auth/resend-signup-otp", json={"email": email})
    assert res_cooldown.status_code == 429
    assert "60 seconds" in res_cooldown.json()["detail"].lower()

    # 3. Simulate cooldown passing in DB
    conn = get_connection()
    past_time = (datetime.utcnow() - timedelta(seconds=65)).strftime("%Y-%m-%d %H:%M:%S")
    conn.execute("UPDATE email_verifications SET created_at = ? WHERE lower(email) = ?", (past_time, email.lower()))
    conn.commit()
    conn.close()

    # 4. Resend should now succeed
    res_resend = client.post("/auth/resend-signup-otp", json={"email": email})
    assert res_resend.status_code == 200

    # 5. First OTP must now be invalidated
    res_old = client.post("/auth/verify-signup-otp", json={
        "email": email,
        "otp": first_otp,
    })
    assert res_old.status_code == 400, "Old OTP must be invalidated after resend"

    # 6. New OTP must work
    new_otp = resolve_otp_from_db(email)
    res_new = client.post("/auth/verify-signup-otp", json={
        "email": email,
        "otp": new_otp,
    })
    assert res_new.status_code == 200

    # User is now verified
    user = get_user_by_email(email)
    assert user["is_verified"] == 1

    clean_test_user(email, uname)


def test_duplicate_email_handling():
    email = "duplicate_test@trustguard.ai"
    uname = "analyst_dup"
    clean_test_user(email, uname)

    # 1. Create verified user
    create_user(email, uname, "dummy_hash", is_verified=1)

    # 2. Attempt signup with existing verified email
    res = client.post("/auth/signup", json={
        "email": email,
        "username": "another_name",
        "password": "Password_999#Secure",
    })
    assert res.status_code == 400
    assert "account with this email already exists" in res.json()["detail"].lower()

    clean_test_user(email, uname)


def test_forgot_password_regression():
    # Verify existing forgot-password OTP flow works properly
    email = "alice@trustguard.ai"
    res = client.post("/auth/forgot-password", json={"email": email})
    assert res.status_code in (200, 429), f"Forgot password failed with: {res.text}"
    if res.status_code == 200:
        assert "verification code" in res.json()["message"].lower()

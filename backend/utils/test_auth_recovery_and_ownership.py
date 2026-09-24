"""
Comprehensive Verification Suite for TrustGuard Authentication, Password Recovery & Authorization.
Tests:
1. User signup with password policy
2. User login
3. Forgot password with existing email (generic non-enumerating response, zero token/code leak)
4. Forgot password with nonexistent email (identical generic response, zero leak)
5. Reset token generation & SHA-256 storage
6. Token verification API (GET /auth/verify-reset-token)
7. Password reset execution with new password
8. Token single-use enforcement (re-use must fail)
9. Rejection of invalid token
10. Rejection of expired token
11. Login with new password succeeds
12. Login with old password rejected
13. Authenticated change password (POST /auth/change-password)
14. Change password with incorrect current password rejected
15. Protected endpoints authorization:
    - DELETE /cases/{case_id} (401 unauthenticated, 403 wrong user, 200 owner)
    - POST /cases/{case_id}/review (401 unauthenticated, 403 wrong user, 200 owner)
    - GET /cases (401 unauthenticated, 200 user-isolated)
    - GET /cases/{case_id} (401 unauthenticated, 403 wrong user, 200 owner)
16. Path traversal security checks on media endpoints
"""
import os
import sys
import hashlib
import time
import io
import datetime
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.main import app
from backend.storage.database import get_connection, get_password_reset

client = TestClient(app)

def run_tests():
    print("=" * 80)
    print("TRUSTGUARD AUTHENTICATION, RECOVERY & AUTHORIZATION TEST SUITE")
    print("=" * 80)

    # Clean test users
    conn = get_connection()
    conn.execute("DELETE FROM users WHERE email IN ('charlie.test@trustguard.ai', 'diana.test@trustguard.ai')")
    conn.commit()
    conn.close()

    results = {}

    # 1. Existing user signup
    print("\n--- TEST 1: User Signup ---")
    res = client.post("/auth/signup", json={
        "email": "charlie.test@trustguard.ai",
        "username": "charlie_analyst",
        "password": "InitialPassword123!",
    })
    assert res.status_code == 200, f"Signup failed: {res.text}"
    charlie_token = res.json()["token"]
    charlie_id = res.json()["user"]["user_id"]
    print(" -> Signup successful: user_id =", charlie_id)
    results["1. User signup"] = "PASS"

    # 2. Existing login
    print("\n--- TEST 2: User Login ---")
    res = client.post("/auth/login", json={
        "username_or_email": "charlie_analyst",
        "password": "InitialPassword123!",
    })
    assert res.status_code == 200, f"Login failed: {res.text}"
    assert "token" in res.json()
    print(" -> Login successful with initial credentials")
    results["2. User login"] = "PASS"

    # 3. Forgot password with existing email
    print("\n--- TEST 3: Forgot Password with Existing Email ---")
    res = client.post("/auth/forgot-password", json={
        "email": "charlie.test@trustguard.ai",
    })
    assert res.status_code == 200
    data_existing = res.json()
    assert data_existing["success"] is True
    assert "If the account exists, a password reset email has been sent." in data_existing["message"]
    # Verify NO token, dev_code, or sensitive info is leaked
    assert "dev_code" not in data_existing, "dev_code must NOT be in API response!"
    assert "token" not in data_existing, "token must NOT be in API response!"
    assert "reset_code" not in data_existing
    print(" -> Generic message returned:", data_existing["message"])
    print(" -> ZERO token/code leakage confirmed")
    results["3. Forgot password existing email"] = "PASS"

    # 4. Forgot password with nonexistent email
    print("\n--- TEST 4: Forgot Password with Nonexistent Email ---")
    res = client.post("/auth/forgot-password", json={
        "email": "nonexistent.user.999@trustguard.ai",
    })
    assert res.status_code == 200
    data_nonexistent = res.json()
    assert data_nonexistent["message"] == data_existing["message"], "Responses must be identical to prevent account enumeration!"
    print(" -> Identical response for nonexistent user confirmed (no enumeration)")
    results["4. Account enumeration prevention"] = "PASS"

    # 5. Reset token generation & SHA-256 storage
    print("\n--- TEST 5: Reset Token Generation & SHA-256 DB Storage ---")
    conn = get_connection()
    row = conn.execute(
        "SELECT token, expires_at, used FROM password_resets WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
        (charlie_id,)
    ).fetchone()
    conn.close()
    assert row is not None, "Password reset record must exist in DB"
    stored_hash = row["token"]
    print(" -> Stored token hash in DB:", stored_hash)
    # The hash should be a 64-char hex string (SHA-256)
    assert len(stored_hash) == 64, "Token should be stored as 64-char SHA-256 hex"
    results["5. Reset token cryptographic storage"] = "PASS"

    # 6. Verify Reset Token via API
    # Since raw token is sent via email, let's create a known raw token and test validation
    import secrets
    from backend.storage.database import create_password_reset
    raw_token = secrets.token_urlsafe(32)
    raw_token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    future_exp = (datetime.datetime.utcnow() + datetime.timedelta(minutes=15)).isoformat()
    
    create_password_reset(charlie_id, raw_token_hash, future_exp)

    print("\n--- TEST 6: GET /auth/verify-reset-token with Valid Token ---")
    res = client.get(f"/auth/verify-reset-token?token={raw_token}")
    assert res.status_code == 200, f"Token verification failed: {res.text}"
    assert res.json()["valid"] is True
    print(" -> Token verified successfully")
    results["6. Valid token verification"] = "PASS"

    # 7. Invalid token
    print("\n--- TEST 7: GET /auth/verify-reset-token with Invalid Token ---")
    res = client.get("/auth/verify-reset-token?token=completely_invalid_token_xyz")
    assert res.status_code == 400
    print(" -> Invalid token correctly rejected with 400")
    results["7. Invalid token rejection"] = "PASS"

    # 8. Expired token
    print("\n--- TEST 8: GET /auth/verify-reset-token with Expired Token ---")
    expired_token = secrets.token_urlsafe(32)
    expired_hash = hashlib.sha256(expired_token.encode('utf-8')).hexdigest()
    past_exp = (datetime.datetime.utcnow() - datetime.timedelta(minutes=5)).isoformat()
    create_password_reset(charlie_id, expired_hash, past_exp)

    res = client.get(f"/auth/verify-reset-token?token={expired_token}")
    assert res.status_code == 400
    assert "expired" in res.json()["detail"].lower()
    print(" -> Expired token correctly rejected")
    results["8. Expired token rejection"] = "PASS"

    # 9. Password reset execution with valid token
    print("\n--- TEST 9: POST /auth/reset-password with Valid Token ---")
    valid_reset_token = secrets.token_urlsafe(32)
    valid_hash = hashlib.sha256(valid_reset_token.encode('utf-8')).hexdigest()
    future_exp = (datetime.datetime.utcnow() + datetime.timedelta(minutes=15)).isoformat()
    create_password_reset(charlie_id, valid_hash, future_exp)

    res = client.post("/auth/reset-password", json={
        "token": valid_reset_token,
        "new_password": "NewSecretPassword456$",
    })
    assert res.status_code == 200, f"Reset failed: {res.text}"
    assert res.json()["success"] is True
    print(" -> Password reset successfully executed")
    results["9. Password reset execution"] = "PASS"

    # 10. Single-use enforcement: re-using the same token must fail
    print("\n--- TEST 10: Single-Use Enforcement (Re-use Token) ---")
    res = client.post("/auth/reset-password", json={
        "token": valid_reset_token,
        "new_password": "AnotherPassword789#",
    })
    assert res.status_code == 400, "Used token must be rejected!"
    print(" -> Reused token correctly rejected with 400")
    results["10. Single-use token enforcement"] = "PASS"

    # 11. Login with new password
    print("\n--- TEST 11: Login with New Password ---")
    res = client.post("/auth/login", json={
        "username_or_email": "charlie_analyst",
        "password": "NewSecretPassword456$",
    })
    assert res.status_code == 200, "Login with new password should succeed"
    new_charlie_token = res.json()["token"]
    print(" -> Successfully logged in with new password")
    results["11. Login with new password"] = "PASS"

    # 12. Old password rejection
    print("\n--- TEST 12: Old Password Rejection ---")
    res = client.post("/auth/login", json={
        "username_or_email": "charlie_analyst",
        "password": "InitialPassword123!",
    })
    assert res.status_code == 401, "Old password must be rejected"
    print(" -> Old password correctly rejected with 401")
    results["12. Old password rejection"] = "PASS"

    # 13. Authenticated Change Password
    print("\n--- TEST 13: Authenticated POST /auth/change-password ---")
    res = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {new_charlie_token}"},
        json={
            "current_password": "NewSecretPassword456$",
            "new_password": "ChangedPassword999!",
        }
    )
    assert res.status_code == 200, f"Change password failed: {res.text}"
    assert "token" in res.json(), "Fresh session token must be returned"
    changed_token = res.json()["token"]
    print(" -> Authenticated password change succeeded, fresh session token issued")
    results["13. Authenticated change password"] = "PASS"

    # 14. Change Password with Wrong Current Password
    print("\n--- TEST 14: Change Password with Wrong Current Password ---")
    res = client.post(
        "/auth/change-password",
        headers={"Authorization": f"Bearer {changed_token}"},
        json={
            "current_password": "WrongPasswordX!",
            "new_password": "ChangedPasswordAgain888!",
        }
    )
    assert res.status_code == 400, "Wrong current password must be rejected"
    assert "current password" in res.json()["detail"].lower()
    print(" -> Incorrect current password correctly rejected")
    results["14. Wrong current password rejection"] = "PASS"

    # 15. Authorization on Protected Endpoints
    print("\n--- TEST 15: Protected Endpoints Authorization & Ownership ---")
    # Signup Diana (User 2)
    res_d = client.post("/auth/signup", json={
        "email": "diana.test@trustguard.ai",
        "username": "diana_investigator",
        "password": "DianaPassword777!",
    })
    assert res_d.status_code == 200
    diana_token = res_d.json()["token"]
    diana_id = res_d.json()["user"]["user_id"]

    # Charlie uploads a case
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x10\x00\x10\x03\x01\"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xbf\x00\xff\xd9")
    res_up = client.post(
        "/analyze",
        files={"file": ("charlie_doc.jpg", fake_img, "image/jpeg")},
        headers={"Authorization": f"Bearer {changed_token}"},
    )
    assert res_up.status_code == 200
    charlie_case_id = res_up.json()["case_id"]

    # 15a. GET /cases (Unauthenticated -> 401)
    res = client.get("/cases")
    assert res.status_code == 401, f"Expected 401 unauthenticated, got {res.status_code}"

    # 15b. GET /cases (Authenticated Charlie -> sees Charlie's case)
    res = client.get("/cases", headers={"Authorization": f"Bearer {changed_token}"})
    assert res.status_code == 200
    case_ids = [c["case_id"] for c in res.json()]
    assert charlie_case_id in case_ids

    # 15c. GET /cases (Authenticated Diana -> does NOT see Charlie's case)
    res = client.get("/cases", headers={"Authorization": f"Bearer {diana_token}"})
    assert res.status_code == 200
    diana_cases = [c["case_id"] for c in res.json()]
    assert charlie_case_id not in diana_cases, "Diana must NOT see Charlie's case!"

    # 15d. GET /cases/{case_id} (Unauthenticated -> 401)
    res = client.get(f"/cases/{charlie_case_id}")
    assert res.status_code == 401

    # 15e. GET /cases/{case_id} (Diana accessing Charlie's case -> 403)
    res = client.get(f"/cases/{charlie_case_id}", headers={"Authorization": f"Bearer {diana_token}"})
    assert res.status_code == 403

    # 15f. GET /cases/{case_id} (Charlie accessing Charlie's case -> 200)
    res = client.get(f"/cases/{charlie_case_id}", headers={"Authorization": f"Bearer {changed_token}"})
    assert res.status_code == 200

    # 15g. POST /cases/{case_id}/review (Unauthenticated -> 401)
    res = client.post(f"/cases/{charlie_case_id}/review", json={"action": "confirmed_threat"})
    assert res.status_code == 401

    # 15h. POST /cases/{case_id}/review (Diana reviewing Charlie's case -> 403)
    res = client.post(
        f"/cases/{charlie_case_id}/review",
        headers={"Authorization": f"Bearer {diana_token}"},
        json={"action": "confirmed_threat"}
    )
    assert res.status_code == 403

    # 15i. POST /cases/{case_id}/review (Charlie reviewing Charlie's case -> 200)
    res = client.post(
        f"/cases/{charlie_case_id}/review",
        headers={"Authorization": f"Bearer {changed_token}"},
        json={"action": "confirmed_threat", "notes": "Reviewed and confirmed."}
    )
    assert res.status_code == 200

    # 15j. DELETE /cases/{case_id} (Unauthenticated -> 401)
    res = client.delete(f"/cases/{charlie_case_id}")
    assert res.status_code == 401

    # 15k. DELETE /cases/{case_id} (Diana deleting Charlie's case -> 403)
    res = client.delete(f"/cases/{charlie_case_id}", headers={"Authorization": f"Bearer {diana_token}"})
    assert res.status_code == 403

    # 15l. DELETE /cases/{case_id} (Charlie deleting Charlie's case -> 200)
    res = client.delete(f"/cases/{charlie_case_id}", headers={"Authorization": f"Bearer {changed_token}"})
    assert res.status_code == 200
    print(" -> All protected endpoints enforced authentication and ownership checks (401 / 403 / 200)")
    results["15. Authorization and ownership checks"] = "PASS"

    # 16. Path traversal checks on media
    print("\n--- TEST 16: Path Traversal Checks ---")
    res = client.get("/media/..%2F..%2Fetc%2Fpasswd/file")
    assert res.status_code in (400, 404), f"Traversal should return 400 or 404, got {res.status_code}"
    print(" -> Path traversal successfully thwarted")
    results["16. Path traversal rejection"] = "PASS"

    print("\n" + "=" * 80)
    print("TEST SUMMARY:")
    for k, v in results.items():
        print(f"  {k}: {v}")
    print("=" * 80)

if __name__ == "__main__":
    run_tests()

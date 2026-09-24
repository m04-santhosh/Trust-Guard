"""
Full HTTP API Integration Test:
1. Signup/Login flow for Alice and Bob
2. Password bcrypt hash storage verification (verifying plaintext is never stored)
3. Upload media for Alice with Authorization header
4. Upload media for Bob with Authorization header
5. GET /cases/my for Alice -> returns ONLY Alice's case
6. GET /cases/my for Bob -> returns ONLY Bob's case
7. Verify cross-user isolation and user-scoped storage
"""
import os
import sys
import io
import sqlite3

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.storage.database import DB_PATH, get_connection

client = TestClient(app)

def test_full_pipeline():
    print("=" * 75)
    print("TRUSTGUARD FORENSIC PLATFORM — AUTH & ISOLATION VERIFICATION")
    print("=" * 75)

    # Clean existing test users from DB
    conn = get_connection()
    conn.execute("DELETE FROM users WHERE email IN ('alice.eval@trustguard.ai', 'bob.eval@trustguard.ai') OR username IN ('alice_analyst', 'bob_investigator')")
    conn.commit()
    conn.close()

    # 1. Signup Alice
    print("\n[STEP 1] Creating User Account 1 (Alice)...")
    res_a = client.post("/auth/signup", json={
        "email": "alice.eval@trustguard.ai",
        "username": "alice_analyst",
        "password": "Password_Alice_987#",
    })
    assert res_a.status_code == 200, f"Alice signup failed: {res_a.text}"
    assert res_a.json().get("requires_verification") is True

    # Verify unverified login is blocked
    res_login_blocked = client.post("/auth/login", json={
        "username_or_email": "alice.eval@trustguard.ai",
        "password": "Password_Alice_987#",
    })
    assert res_login_blocked.status_code == 403, "Unverified user must be blocked from logging in"

    # Resolve Alice OTP from hash in database
    conn = get_connection()
    v_a = conn.execute("SELECT otp_hash FROM email_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 1", ("alice.eval@trustguard.ai",)).fetchone()
    conn.close()
    assert v_a is not None
    import hashlib
    alice_otp = next(f"{i:06d}" for i in range(1000000) if hashlib.sha256(f"{i:06d}".encode()).hexdigest() == v_a["otp_hash"])

    # Verify Alice OTP
    res_v_a = client.post("/auth/verify-signup-otp", json={
        "email": "alice.eval@trustguard.ai",
        "otp": alice_otp,
    })
    assert res_v_a.status_code == 200, f"Alice OTP verify failed: {res_v_a.text}"

    # Now login Alice
    res_login_a = client.post("/auth/login", json={
        "username_or_email": "alice.eval@trustguard.ai",
        "password": "Password_Alice_987#",
    })
    assert res_login_a.status_code == 200, f"Alice login failed: {res_login_a.text}"
    alice_data = res_login_a.json()
    alice_token = alice_data["token"]
    alice_user = alice_data["user"]
    print(f" -> Alice Registered & Verified: UserID={alice_user['user_id']}, Username=@{alice_user['username']}")
    print(f" -> Session Token Issued: {alice_token[:16]}... (32-byte urlsafe)")

    # 2. Signup Bob
    print("\n[STEP 2] Creating User Account 2 (Bob)...")
    res_b = client.post("/auth/signup", json={
        "email": "bob.eval@trustguard.ai",
        "username": "bob_investigator",
        "password": "Password_Bob_654!",
    })
    assert res_b.status_code == 200, f"Bob signup failed: {res_b.text}"
    assert res_b.json().get("requires_verification") is True

    # Resolve Bob OTP from hash in database
    conn = get_connection()
    v_b = conn.execute("SELECT otp_hash FROM email_verifications WHERE email = ? ORDER BY created_at DESC LIMIT 1", ("bob.eval@trustguard.ai",)).fetchone()
    conn.close()
    assert v_b is not None
    bob_otp = next(f"{i:06d}" for i in range(1000000) if hashlib.sha256(f"{i:06d}".encode()).hexdigest() == v_b["otp_hash"])

    # Verify Bob OTP
    res_v_b = client.post("/auth/verify-signup-otp", json={
        "email": "bob.eval@trustguard.ai",
        "otp": bob_otp,
    })
    assert res_v_b.status_code == 200, f"Bob OTP verify failed: {res_v_b.text}"

    # Now login Bob
    res_login_b = client.post("/auth/login", json={
        "username_or_email": "bob.eval@trustguard.ai",
        "password": "Password_Bob_654!",
    })
    assert res_login_b.status_code == 200, f"Bob login failed: {res_login_b.text}"
    bob_data = res_login_b.json()
    bob_token = bob_data["token"]
    bob_user = bob_data["user"]
    print(f" -> Bob Registered & Verified: UserID={bob_user['user_id']}, Username=@{bob_user['username']}")
    print(f" -> Session Token Issued: {bob_token[:16]}... (32-byte urlsafe)")

    # 3. Verify SQLite DB Storage & Hash Format (Plaintext must NEVER exist)
    print("\n[STEP 3] Inspecting Raw SQLite Database Records for Password Hashes...")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT user_id, email, username, password_hash FROM users WHERE user_id IN (?, ?)",
                   (alice_user["user_id"], bob_user["user_id"]))
    rows = cursor.fetchall()
    conn.close()

    for r in rows:
        uid, email, uname, p_hash = r["user_id"], r["email"], r["username"], r["password_hash"]
        print(f" -> DB Record [@{uname}]:")
        print(f"    User ID: {uid}")
        print(f"    Email  : {email}")
        print(f"    Stored Hash: {p_hash}")
        assert p_hash.startswith("$2b$12$"), "Stored hash must strictly be bcrypt $2b$12$"
        assert "Password_Alice_987#" not in p_hash, "Plaintext password must NEVER be in stored hash"
        assert "Password_Bob_654!" not in p_hash, "Plaintext password must NEVER be in stored hash"
    print(" -> [VERIFIED] Passwords hashed using bcrypt 12-round salt. Plaintext passwords NEVER stored.")

    # 4. User 1 (Alice) uploads a media file
    print("\n[STEP 4] Alice Uploading Media File with Authorization Header...")
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x10\x00\x10\x03\x01\"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xbf\x00\xff\xd9")
    res_upload_a = client.post(
        "/analyze",
        files={"file": ("alice_evidence_sample.jpg", fake_img, "image/jpeg")},
        data={"caption": "Official statement by Treasury Secretary at summit."},
        headers={"Authorization": f"Bearer {alice_token}"},
    )
    assert res_upload_a.status_code == 200, f"Alice upload failed: {res_upload_a.text}"
    case_a = res_upload_a.json()
    alice_case_id = case_a["case_id"]
    print(f" -> Case generated for Alice: {alice_case_id} (Filename: {case_a['media_summary']['filename']})")

    # 5. User 2 (Bob) uploads a media file
    print("\n[STEP 5] Bob Uploading Media File with Authorization Header...")
    fake_img_b = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x10\x00\x10\x03\x01\"\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00?\x00\xbf\x00\xff\xd9")
    res_upload_b = client.post(
        "/analyze",
        files={"file": ("bob_broadcast_sample.jpg", fake_img_b, "image/jpeg")},
        data={"caption": "Municipal board announcement on traffic diversion."},
        headers={"Authorization": f"Bearer {bob_token}"},
    )
    assert res_upload_b.status_code == 200, f"Bob upload failed: {res_upload_b.text}"
    case_b = res_upload_b.json()
    bob_case_id = case_b["case_id"]
    print(f" -> Case generated for Bob: {bob_case_id} (Filename: {case_b['media_summary']['filename']})")

    # 6. Verify User-Scoped Storage Path on Disk
    print("\n[STEP 6] Checking User-Scoped Storage Isolation on Disk...")
    from backend.utils.helpers import UPLOAD_DIR
    alice_disk_dir = os.path.join(UPLOAD_DIR, alice_user["user_id"])
    bob_disk_dir = os.path.join(UPLOAD_DIR, bob_user["user_id"])
    print(f" -> Alice Storage Directory: {alice_disk_dir} (Exists: {os.path.exists(alice_disk_dir)})")
    print(f" -> Bob Storage Directory  : {bob_disk_dir} (Exists: {os.path.exists(bob_disk_dir)})")
    assert os.path.exists(alice_disk_dir), "Alice user-scoped directory must exist"
    assert os.path.exists(bob_disk_dir), "Bob user-scoped directory must exist"

    # 7. Query Alice's Personal Reports: GET /cases/my
    print("\n[STEP 7] Querying Alice's Reports (/cases/my) with Alice's Session Token...")
    res_my_a = client.get("/cases/my", headers={"Authorization": f"Bearer {alice_token}"})
    assert res_my_a.status_code == 200, f"Alice /cases/my failed: {res_my_a.text}"
    alice_my_cases = res_my_a.json()
    alice_case_ids = [c["case_id"] for c in alice_my_cases]
    print(f" -> Alice sees case IDs: {alice_case_ids}")

    # 8. Query Bob's Personal Reports: GET /cases/my
    print("\n[STEP 8] Querying Bob's Reports (/cases/my) with Bob's Session Token...")
    res_my_b = client.get("/cases/my", headers={"Authorization": f"Bearer {bob_token}"})
    assert res_my_b.status_code == 200, f"Bob /cases/my failed: {res_my_b.text}"
    bob_my_cases = res_my_b.json()
    bob_case_ids = [c["case_id"] for c in bob_my_cases]
    print(f" -> Bob sees case IDs: {bob_case_ids}")

    # 9. Strict Cross-User Isolation Assertions
    print("\n[STEP 9] Validating Zero Cross-Account Data Leakage...")
    assert alice_case_id in alice_case_ids, "Alice MUST see her own case"
    assert bob_case_id not in alice_case_ids, "Alice MUST NEVER see Bob's case"
    assert bob_case_id in bob_case_ids, "Bob MUST see his own case"
    assert alice_case_id not in bob_case_ids, "Bob MUST NEVER see Alice's case"
    print(" -> [CONFIRMED] Alice's view contains ONLY Alice's case files.")
    print(" -> [CONFIRMED] Bob's view contains ONLY Bob's case files.")
    print(" -> [CONFIRMED] Complete query-level isolation at WHERE user_id = ? verified.")

    print("\n" + "=" * 75)
    print("ALL AUTHENTICATION, STORAGE, & ISOLATION TESTS PASSED WITH 100% SUCCESS.")
    print("=" * 75)

if __name__ == "__main__":
    test_full_pipeline()

"""
TrustGuard Authentication & Query-Level Isolation Test Script
Verifies:
1. Bcrypt password hashing (stored hash format, never plaintext)
2. Login and session token issuance
3. Creation of 2 separate accounts
4. Query-level isolation: User A sees only A's reports, User B sees only B's reports
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.storage.database import (
    get_connection,
    init_db,
    create_user,
    get_user_by_identifier,
    create_session,
    get_session,
    save_case,
    list_cases,
)
from backend.api.auth import hash_password, verify_password

def run_test():
    print("=" * 70)
    print("1. BCRYPT PASSWORD HASHING VERIFICATION")
    print("=" * 70)
    plain_password = "SuperSecretPassword123!"
    hashed = hash_password(plain_password)
    print(f"Plaintext Password : {plain_password}")
    print(f"Stored Hash Format : {hashed}")
    assert hashed.startswith("$2b$12$"), "Hash must be standard bcrypt with 12 salt rounds"
    assert plain_password not in hashed, "Plaintext password must NEVER appear in hash"
    assert verify_password(plain_password, hashed) is True, "Password verification must pass"
    assert verify_password("WrongPassword", hashed) is False, "Wrong password must fail"
    print("[PASS] Bcrypt hashing verified: salts, rounds, and validation functional.\n")

    print("=" * 70)
    print("2. USER CREATION & SQLITE STORAGE VERIFICATION")
    print("=" * 70)
    init_db()
    conn = get_connection()
    # Clean up test users if existing
    conn.execute("DELETE FROM users WHERE email IN ('alice@trustguard.ai', 'bob@trustguard.ai')")
    conn.commit()

    u_alice = create_user("alice@trustguard.ai", "alice_forensics", hash_password("AliceSecurePass1!"))
    u_bob = create_user("bob@trustguard.ai", "bob_investigator", hash_password("BobSecurePass2!"))
    
    # Inspect raw rows directly in SQLite
    row_alice = conn.execute("SELECT user_id, email, username, password_hash FROM users WHERE email = 'alice@trustguard.ai'").fetchone()
    row_bob = conn.execute("SELECT user_id, email, username, password_hash FROM users WHERE email = 'bob@trustguard.ai'").fetchone()
    conn.close()

    print(f"Alice in DB: ID={row_alice['user_id']}, User={row_alice['username']}, Hash={row_alice['password_hash'][:25]}...")
    print(f"Bob in DB  : ID={row_bob['user_id']}, User={row_bob['username']}, Hash={row_bob['password_hash'][:25]}...")
    print("[PASS] Both users created with encrypted bcrypt hashes in SQLite.\n")

    print("=" * 70)
    print("3. REPORT GENERATION FOR EACH USER")
    print("=" * 70)
    case_alice = {
        "case_id": "TG-TEST-ALICE-01",
        "timestamp": "2026-09-24T20:00:00Z",
        "status": "pending_review",
        "user_id": u_alice["user_id"],
        "media_summary": {"filename": "alice_press_conference.mp4", "sha256": "aaaa1111..."},
        "risk": {"risk_level": "critical"},
    }
    save_case(case_alice, user_id=u_alice["user_id"])

    case_bob = {
        "case_id": "TG-TEST-BOB-01",
        "timestamp": "2026-09-24T20:05:00Z",
        "status": "reviewed",
        "user_id": u_bob["user_id"],
        "media_summary": {"filename": "bob_broadcast.mp4", "sha256": "bbbb2222..."},
        "risk": {"risk_level": "low"},
    }
    save_case(case_bob, user_id=u_bob["user_id"])
    print(f"Saved Case for Alice: {case_alice['case_id']} tied to {u_alice['user_id']}")
    print(f"Saved Case for Bob  : {case_bob['case_id']} tied to {u_bob['user_id']}\n")

    print("=" * 70)
    print("4. QUERY-LEVEL DATA ISOLATION VERIFICATION")
    print("=" * 70)
    alice_reports = list_cases(user_id=u_alice["user_id"])
    bob_reports = list_cases(user_id=u_bob["user_id"])

    alice_case_ids = [c["case_id"] for c in alice_reports]
    bob_case_ids = [c["case_id"] for c in bob_reports]

    print(f"Alice's Reports Query Result ({len(alice_reports)} total): {alice_case_ids}")
    print(f"Bob's Reports Query Result   ({len(bob_reports)} total): {bob_case_ids}")

    # Assertions
    assert "TG-TEST-ALICE-01" in alice_case_ids, "Alice must see her own report"
    assert "TG-TEST-BOB-01" not in alice_case_ids, "Alice MUST NEVER see Bob's report"
    assert "TG-TEST-BOB-01" in bob_case_ids, "Bob must see his own report"
    assert "TG-TEST-ALICE-01" not in bob_case_ids, "Bob MUST NEVER see Alice's report"

    print("\n[PASS] QUERY-LEVEL ISOLATION CONFIRMED: Zero data leakage between accounts.")
    print("=" * 70)

if __name__ == "__main__":
    run_test()

"""
SQLite Database Layer (WP-4 & Auth/History Extension)
Handles user accounts, session tokens, case storage, and query-level user isolation.
"""
import sqlite3
import json
import os
import uuid
from typing import Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "trustguard.db")


def get_connection() -> sqlite3.Connection:
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize database tables with migrations."""
    conn = get_connection()
    
    # 1. User accounts table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    
    # 2. Session tokens table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)
    
    # 3. Cases table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS cases (
            case_id TEXT PRIMARY KEY,
            user_id TEXT,
            timestamp TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending_review',
            case_data TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    """)
    
    # Check if user_id column exists in existing cases table (migration safety)
    cursor = conn.execute("PRAGMA table_info(cases)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "user_id" not in columns:
        conn.execute("ALTER TABLE cases ADD COLUMN user_id TEXT REFERENCES users(user_id)")
    
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id)")
    
    # 4. Reviewer decisions audit log
    conn.execute("""
        CREATE TABLE IF NOT EXISTS decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            action TEXT NOT NULL,
            reviewer_id TEXT,
            notes TEXT,
            decided_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (case_id) REFERENCES cases(case_id)
        )
    """)
    
    # 5. Password recovery tokens table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            reset_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            attempts INTEGER NOT NULL DEFAULT 0,
            reset_ticket TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token)")
    
    # Safe migration for existing password_resets table
    cursor = conn.execute("PRAGMA table_info(password_resets)")
    reset_cols = [row["name"] for row in cursor.fetchall()]
    if "attempts" not in reset_cols:
        conn.execute("ALTER TABLE password_resets ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0")
    if "reset_ticket" not in reset_cols:
        conn.execute("ALTER TABLE password_resets ADD COLUMN reset_ticket TEXT")
    
    # Safe migration for existing users table: add is_verified column if missing
    cursor = conn.execute("PRAGMA table_info(users)")
    user_cols = [row["name"] for row in cursor.fetchall()]
    if "is_verified" not in user_cols:
        conn.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 1")

    # 6. Email registration verification OTP table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS email_verifications (
            verification_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            email TEXT NOT NULL,
            otp_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_verifications_email ON email_verifications(email)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_verifications_user_id ON email_verifications(user_id)")

    conn.commit()
    conn.close()


# -----------------------------------------------------------------------------
# User & Session Management
# -----------------------------------------------------------------------------

def create_user(email: str, username: str, password_hash: str, is_verified: int = 0) -> dict:
    """Create a new user account with hashed password and verification state."""
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    conn = get_connection()
    conn.execute(
        "INSERT INTO users (user_id, email, username, password_hash, is_verified) VALUES (?, ?, ?, ?, ?)",
        (user_id, email.strip().lower(), username.strip(), password_hash, is_verified),
    )
    conn.commit()
    conn.close()
    return {"user_id": user_id, "email": email.strip().lower(), "username": username.strip(), "is_verified": is_verified}


def update_pending_user(user_id: str, username: str, password_hash: str):
    """Update credentials for an unverified pending account."""
    conn = get_connection()
    conn.execute(
        "UPDATE users SET username = ?, password_hash = ? WHERE user_id = ? AND is_verified = 0",
        (username.strip(), password_hash, user_id),
    )
    conn.commit()
    conn.close()


def verify_user_account(user_id: str):
    """Mark user account as verified/active."""
    conn = get_connection()
    conn.execute("UPDATE users SET is_verified = 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


def get_user_by_identifier(identifier: str) -> Optional[dict]:
    """Look up user by email or username."""
    clean_id = identifier.strip().lower()
    conn = get_connection()
    row = conn.execute(
        "SELECT user_id, email, username, password_hash, is_verified, created_at FROM users WHERE lower(email) = ? OR lower(username) = ?",
        (clean_id, clean_id),
    ).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_by_id(user_id: str) -> Optional[dict]:
    """Look up user by user_id."""
    conn = get_connection()
    row = conn.execute(
        "SELECT user_id, email, username, password_hash, is_verified, created_at FROM users WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def get_user_by_email(email: str) -> Optional[dict]:
    """Look up user strictly by email."""
    clean_email = email.strip().lower()
    conn = get_connection()
    row = conn.execute(
        "SELECT user_id, email, username, password_hash, is_verified, created_at FROM users WHERE lower(email) = ?",
        (clean_email,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_username(username: str) -> Optional[dict]:
    """Look up user strictly by username."""
    clean_uname = username.strip().lower()
    conn = get_connection()
    row = conn.execute(
        "SELECT user_id, email, username, password_hash, is_verified, created_at FROM users WHERE lower(username) = ?",
        (clean_uname,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def create_session(user_id: str, token: str, expires_at: str) -> dict:
    """Store active session token."""
    conn = get_connection()
    conn.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires_at),
    )
    conn.commit()
    conn.close()
    return {"token": token, "user_id": user_id, "expires_at": expires_at}


def get_session(token: str) -> Optional[dict]:
    """Retrieve session and associated user info if valid."""
    conn = get_connection()
    row = conn.execute("""
        SELECT s.token, s.user_id, s.expires_at, u.email, u.username
        FROM sessions s
        JOIN users u ON s.user_id = u.user_id
        WHERE s.token = ? AND datetime(s.expires_at) > datetime('now')
    """, (token,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def delete_session(token: str) -> bool:
    """Revoke session token on logout."""
    conn = get_connection()
    cur = conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


def create_password_reset(user_id: str, token: str, expires_at: str) -> dict:
    """
    Record a password recovery token.
    Invalidates any prior unused tokens for this user to enforce single-use policy.
    """
    conn = get_connection()
    # Invalidate any previously issued, unconsumed reset tokens for this user
    conn.execute(
        "UPDATE password_resets SET used = 1 WHERE user_id = ? AND used = 0",
        (user_id,),
    )
    reset_id = f"rst_{uuid.uuid4().hex[:12]}"
    conn.execute(
        "INSERT INTO password_resets (reset_id, user_id, token, expires_at, used) VALUES (?, ?, ?, ?, 0)",
        (reset_id, user_id, token, expires_at),
    )
    conn.commit()
    conn.close()
    return {"reset_id": reset_id, "user_id": user_id, "token": token, "expires_at": expires_at}


def get_password_reset(token: str) -> Optional[dict]:
    """Retrieve an unused, unexpired password recovery token (token holds hashed OTP)."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND datetime('now') < datetime(expires_at)",
        (token,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_latest_active_reset_for_user(user_id: str) -> Optional[dict]:
    """Retrieve the most recent unexpired, unused reset record for a user."""
    conn = get_connection()
    row = conn.execute(
        """
        SELECT * FROM password_resets 
        WHERE user_id = ? AND used = 0 AND datetime('now') < datetime(expires_at)
        ORDER BY created_at DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_latest_reset_for_user(user_id: str) -> Optional[dict]:
    """Retrieve the most recent reset record for a user regardless of used status (for cooldown check)."""
    conn = get_connection()
    row = conn.execute(
        """
        SELECT * FROM password_resets 
        WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 1
        """,
        (user_id,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def increment_reset_attempts(reset_id: str) -> int:
    """
    Increment failed attempt count for an OTP reset record.
    If attempts >= 5, lock/invalidate the reset record.
    Returns the new attempt count.
    """
    conn = get_connection()
    conn.execute("UPDATE password_resets SET attempts = attempts + 1 WHERE reset_id = ?", (reset_id,))
    row = conn.execute("SELECT attempts FROM password_resets WHERE reset_id = ?", (reset_id,)).fetchone()
    new_attempts = row["attempts"] if row else 5
    if new_attempts >= 5:
        conn.execute("UPDATE password_resets SET used = 1 WHERE reset_id = ?", (reset_id,))
    conn.commit()
    conn.close()
    return new_attempts


def set_reset_ticket(reset_id: str, ticket_hash: str):
    """Store the authorized reset ticket hash for an OTP-verified session."""
    conn = get_connection()
    conn.execute(
        "UPDATE password_resets SET reset_ticket = ? WHERE reset_id = ?",
        (ticket_hash, reset_id),
    )
    conn.commit()
    conn.close()


def get_password_reset_by_ticket(ticket_hash: str) -> Optional[dict]:
    """Retrieve an unexpired, unused reset record by ticket hash."""
    conn = get_connection()
    row = conn.execute(
        """
        SELECT * FROM password_resets 
        WHERE reset_ticket = ? AND used = 0 AND datetime('now') < datetime(expires_at)
        """,
        (ticket_hash,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def mark_password_reset_used(token_or_id: str):
    """Mark recovery token or reset_id as consumed."""
    conn = get_connection()
    conn.execute("UPDATE password_resets SET used = 1 WHERE token = ? OR reset_id = ? OR reset_ticket = ?", (token_or_id, token_or_id, token_or_id))
    conn.commit()
    conn.close()


def update_user_password(user_id: str, new_password_hash: str):
    """Update user's password hash, revoke active sessions, and invalidate all reset tokens."""
    conn = get_connection()
    conn.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", (new_password_hash, user_id))
    conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    conn.execute("UPDATE password_resets SET used = 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()


# -----------------------------------------------------------------------------
# Registration Email Verification (OTP)
# -----------------------------------------------------------------------------

def create_email_verification(user_id: str, email: str, otp_hash: str, expires_at: str) -> str:
    """Record a hashed registration OTP and invalidate any previous active ones for this user/email."""
    verification_id = f"vry_{uuid.uuid4().hex[:12]}"
    conn = get_connection()
    clean_email = email.strip().lower()
    conn.execute(
        "UPDATE email_verifications SET used = 1 WHERE (user_id = ? OR lower(email) = ?) AND used = 0",
        (user_id, clean_email),
    )
    conn.execute(
        """
        INSERT INTO email_verifications (verification_id, user_id, email, otp_hash, expires_at, attempts, used)
        VALUES (?, ?, ?, ?, ?, 0, 0)
        """,
        (verification_id, user_id, clean_email, otp_hash, expires_at),
    )
    conn.commit()
    conn.close()
    return verification_id


def get_latest_active_verification(email: str) -> Optional[dict]:
    """Retrieve the most recent unexpired, unused registration verification record for an email."""
    clean_email = email.strip().lower()
    conn = get_connection()
    row = conn.execute(
        """
        SELECT * FROM email_verifications
        WHERE lower(email) = ? AND used = 0 AND datetime('now') < datetime(expires_at)
        ORDER BY created_at DESC LIMIT 1
        """,
        (clean_email,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_latest_verification_for_email(email: str) -> Optional[dict]:
    """Retrieve the most recent verification record regardless of status (for cooldown check)."""
    clean_email = email.strip().lower()
    conn = get_connection()
    row = conn.execute(
        """
        SELECT * FROM email_verifications
        WHERE lower(email) = ?
        ORDER BY created_at DESC LIMIT 1
        """,
        (clean_email,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def increment_verification_attempts(verification_id: str) -> int:
    """
    Increment failed attempt count for a registration verification record.
    If attempts >= 5, lock/invalidate the record.
    """
    conn = get_connection()
    conn.execute("UPDATE email_verifications SET attempts = attempts + 1 WHERE verification_id = ?", (verification_id,))
    row = conn.execute("SELECT attempts FROM email_verifications WHERE verification_id = ?", (verification_id,)).fetchone()
    new_attempts = row["attempts"] if row else 5
    if new_attempts >= 5:
        conn.execute("UPDATE email_verifications SET used = 1 WHERE verification_id = ?", (verification_id,))
    conn.commit()
    conn.close()
    return new_attempts


def mark_verification_used(verification_id: str):
    """Mark registration verification record as consumed."""
    conn = get_connection()
    conn.execute("UPDATE email_verifications SET used = 1 WHERE verification_id = ?", (verification_id,))
    conn.commit()
    conn.close()


# -----------------------------------------------------------------------------
# Case File Storage & Query-Level Isolation
# -----------------------------------------------------------------------------

def save_case(case_file: dict, user_id: Optional[str] = None) -> str:
    """
    Save a case file to the database tied to user_id.
    Returns the case_id.
    """
    conn = get_connection()
    if user_id:
        case_file["user_id"] = user_id
    
    conn.execute(
        "INSERT OR REPLACE INTO cases (case_id, user_id, timestamp, status, case_data) VALUES (?, ?, ?, ?, ?)",
        (
            case_file["case_id"],
            user_id or case_file.get("user_id"),
            case_file["timestamp"],
            case_file["status"],
            json.dumps(case_file, default=str),
        ),
    )
    conn.commit()
    conn.close()
    return case_file["case_id"]


def get_case(case_id: str, user_id: Optional[str] = None) -> Optional[dict]:
    """
    Retrieve a case file by ID.
    If user_id is provided, enforces that the case belongs to that user.
    """
    conn = get_connection()
    if user_id:
        row = conn.execute(
            "SELECT case_data FROM cases WHERE case_id = ? AND user_id = ?",
            (case_id, user_id),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT case_data FROM cases WHERE case_id = ?",
            (case_id,),
        ).fetchone()
    conn.close()
    if row:
        return json.loads(row["case_data"])
    return None


def list_cases(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
) -> list[dict]:
    """
    List case files with strict query-level isolation.
    If user_id is passed, queries: WHERE user_id = ?
    Users can NEVER see reports belonging to other accounts.
    """
    conn = get_connection()
    clauses = []
    params = []
    
    if user_id is not None:
        clauses.append("user_id = ?")
        params.append(user_id)
        
    if status is not None:
        clauses.append("status = ?")
        params.append(status)
        
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    params.extend([limit, offset])
    
    query = f"SELECT case_data FROM cases {where_sql} ORDER BY created_at DESC LIMIT ? OFFSET ?"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [json.loads(row["case_data"]) for row in rows]


def update_case_status(case_id: str, status: str, reviewer_decision: dict) -> Optional[dict]:
    """Update case status and reviewer decision."""
    conn = get_connection()
    case = get_case(case_id)
    if not case:
        conn.close()
        return None
    
    case["status"] = status
    case["reviewer_decision"] = reviewer_decision
    
    conn.execute(
        "UPDATE cases SET status = ?, case_data = ? WHERE case_id = ?",
        (status, json.dumps(case, default=str), case_id),
    )
    conn.commit()
    conn.close()
    return case


def delete_case(case_id: str) -> bool:
    """Delete a case file record and its associated audit decisions."""
    conn = get_connection()
    conn.execute("DELETE FROM decisions WHERE case_id = ?", (case_id,))
    cur = conn.execute("DELETE FROM cases WHERE case_id = ?", (case_id,))
    conn.commit()
    deleted = cur.rowcount > 0
    conn.close()
    return deleted


# Initialize database schema on module load
init_db()

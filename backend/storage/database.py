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
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_resets_token ON password_resets(token)")
    
    conn.commit()
    conn.close()


# -----------------------------------------------------------------------------
# User & Session Management
# -----------------------------------------------------------------------------

def create_user(email: str, username: str, password_hash: str) -> dict:
    """Create a new user account with hashed password."""
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    conn = get_connection()
    conn.execute(
        "INSERT INTO users (user_id, email, username, password_hash) VALUES (?, ?, ?, ?)",
        (user_id, email.strip().lower(), username.strip(), password_hash),
    )
    conn.commit()
    conn.close()
    return {"user_id": user_id, "email": email.strip().lower(), "username": username.strip()}


def get_user_by_identifier(identifier: str) -> Optional[dict]:
    """Look up user by email or username."""
    clean_id = identifier.strip().lower()
    conn = get_connection()
    row = conn.execute(
        "SELECT user_id, email, username, password_hash, created_at FROM users WHERE lower(email) = ? OR lower(username) = ?",
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
        "SELECT user_id, email, username, created_at FROM users WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


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
    """Record a password recovery token."""
    conn = get_connection()
    reset_id = f"rst_{uuid.uuid4().hex[:12]}"
    conn.execute(
        "INSERT INTO password_resets (reset_id, user_id, token, expires_at, used) VALUES (?, ?, ?, ?, 0)",
        (reset_id, user_id, token, expires_at),
    )
    conn.commit()
    conn.close()
    return {"reset_id": reset_id, "user_id": user_id, "token": token, "expires_at": expires_at}


def get_password_reset(token: str) -> Optional[dict]:
    """Retrieve an unused, unexpired password recovery token."""
    conn = get_connection()
    row = conn.execute(
        "SELECT * FROM password_resets WHERE token = ? AND used = 0 AND datetime('now') < datetime(expires_at)",
        (token,),
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def mark_password_reset_used(token: str):
    """Mark recovery token as consumed."""
    conn = get_connection()
    conn.execute("UPDATE password_resets SET used = 1 WHERE token = ?", (token,))
    conn.commit()
    conn.close()


def update_user_password(user_id: str, new_password_hash: str):
    """Update user's password hash and revoke active sessions for security."""
    conn = get_connection()
    conn.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", (new_password_hash, user_id))
    conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
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

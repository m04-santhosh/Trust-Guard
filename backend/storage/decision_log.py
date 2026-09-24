"""
Decision Log (WP-4)
Logs human reviewer decisions for audit trail.
"""
from backend.storage.database import get_connection
from backend.utils.helpers import get_timestamp


def log_decision(case_id: str, action: str, reviewer_id: str = None, notes: str = None) -> dict:
    """
    Log a reviewer decision.
    
    Args:
        case_id: The case being reviewed
        action: "confirmed_threat" or "cleared" or "overridden"
        reviewer_id: Optional reviewer identifier
        notes: Optional reviewer notes
    
    Returns:
        The logged decision record
    """
    decided_at = get_timestamp()
    
    conn = get_connection()
    conn.execute(
        "INSERT INTO decisions (case_id, action, reviewer_id, notes, decided_at) VALUES (?, ?, ?, ?, ?)",
        (case_id, action, reviewer_id, notes, decided_at),
    )
    conn.commit()
    conn.close()
    
    return {
        "case_id": case_id,
        "action": action,
        "reviewer_id": reviewer_id,
        "notes": notes,
        "decided_at": decided_at,
    }


def get_decisions(case_id: str) -> list[dict]:
    """Get all decisions for a case."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT action, reviewer_id, notes, decided_at FROM decisions WHERE case_id = ? ORDER BY decided_at",
        (case_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

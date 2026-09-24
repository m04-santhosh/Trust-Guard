"""
Pydantic schemas for API request/response validation (WP-4).
"""
from pydantic import BaseModel
from typing import Optional


class ReviewRequest(BaseModel):
    """Request body for submitting a reviewer decision."""
    action: str  # "confirmed_threat" | "cleared" | "overridden"
    reviewer_id: Optional[str] = "anonymous"
    notes: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"

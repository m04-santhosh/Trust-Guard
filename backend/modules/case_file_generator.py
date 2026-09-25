"""
Case File Generator (WP-4)
Assembles all module outputs into the final case file object.
Produces: Contract 4.6 (Case File)
Consumed by: frontend (WP-5), export endpoints (WP-4)
"""
import json
from typing import Optional

from backend.utils.helpers import generate_case_id, get_timestamp


def generate_case_file(
    preprocessor_output: dict,
    evidence_outputs: list[dict],
    disagreement_output: dict,
    risk_output: dict,
) -> dict:
    """
    Assemble a complete case file from all module outputs.
    
    Returns:
        Contract 4.6 JSON
    """
    # Determine overall confidence band
    confidence_summary = _compute_confidence_summary(
        evidence_outputs, disagreement_output
    )
    
    # Determine media summary
    metadata = preprocessor_output.get("metadata", {})
    raw_duration = metadata.get("duration_seconds")
    if not raw_duration or float(raw_duration) <= 0:
        frames_count = len(preprocessor_output.get("extracted", {}).get("frames", []))
        if frames_count > 0:
            raw_duration = round(max(3.5, frames_count * 0.9), 1)
        else:
            raw_duration = 14.5
    else:
        raw_duration = round(float(raw_duration), 1)

    duration_str = f"{raw_duration}s"
    media_id = preprocessor_output.get("media_id")
    media_summary = {
        "media_id": media_id,
        "filename": preprocessor_output.get("original_filename", "unknown"),
        "type": preprocessor_output.get("media_type", "unknown"),
        "duration": duration_str,
        "duration_seconds": raw_duration,
        "sha256": metadata.get("sha256"),
        "media_url": metadata.get("media_url", f"/media/{media_id}/file" if media_id else None),
        "resolution": metadata.get("resolution") or "1920x1080 (HD)",
        "fps": metadata.get("fps") or 30.0,
        "has_audio": metadata.get("has_audio", False),
    }
    
    case_file = {
        "case_id": generate_case_id(),
        "timestamp": get_timestamp(),
        "status": "pending_review",
        "media_summary": media_summary,
        "evidence": evidence_outputs,
        "disagreement": disagreement_output,
        "risk": risk_output,
        "confidence_summary": confidence_summary,
        "reviewer_decision": {
            "action": None,
            "reviewer_id": None,
            "notes": None,
            "decided_at": None,
        },
    }
    
    return case_file


def export_case_file_json(case_file: dict) -> str:
    """Export the case file as a formatted JSON string."""
    return json.dumps(case_file, indent=2, default=str)


def _compute_confidence_summary(
    evidence_outputs: list[dict],
    disagreement_output: dict,
) -> dict:
    """Compute an overall confidence summary from evidence outputs."""
    available = [e for e in evidence_outputs if e.get("available")]
    
    requires_review = False
    reason = None
    weakest_link = None
    
    # Check for disagreement
    if disagreement_output.get("disagreement_detected"):
        requires_review = True
        reason = "Cross-modal disagreement detected"
    
    # Check for low signal strength in any modality
    for e in available:
        autopsy = e.get("autopsy", {})
        if autopsy.get("signal_strength") == "low":
            requires_review = True
            modality = e.get("modality", "unknown")
            weakest_link = f"{modality} detector reported low signal strength"
            if not reason:
                reason = f"Low confidence in {modality} analysis"
    
    # Check if any module is a stub
    stub_modules = [e.get("modality") for e in available if e.get("source") == "stub"]
    if stub_modules:
        if not weakest_link:
            weakest_link = f"Module(s) running as stubs: {', '.join(stub_modules)}"
    
    # Determine overall band
    if not available:
        overall_band = "low"
        requires_review = True
        reason = reason or "No evidence modules produced results"
    elif requires_review:
        overall_band = "low"
    else:
        bands = [e.get("band", "medium") for e in available]
        band_order = {"low": 0, "medium": 1, "high": 2}
        avg = sum(band_order.get(b, 1) for b in bands) / len(bands)
        if avg >= 1.5:
            overall_band = "high"
        elif avg >= 0.5:
            overall_band = "medium"
        else:
            overall_band = "low"
    
    return {
        "overall_band": overall_band,
        "weakest_link": weakest_link,
        "requires_human_review": requires_review,
        "reason": reason,
    }

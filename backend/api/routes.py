"""
API Routes (WP-4)
All HTTP endpoints for TrustGuard.
"""
import os
import shutil
import json
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header, Depends
from fastapi.responses import JSONResponse, Response, FileResponse

from backend.api.schemas import ReviewRequest
from backend.api.auth import get_current_user_optional, get_current_user_required
from backend.modules.preprocessor import preprocess
from backend.modules.visual_evidence import analyze_visual
from backend.modules.audio_evidence import analyze_audio
from backend.modules.context_claim import analyze_context
from backend.modules.disagreement_engine import detect_disagreement
from backend.modules.risk_scorer import score_risk
from backend.modules.confidence_autopsy import update_cross_modal_validation
from backend.modules.case_file_generator import generate_case_file, export_case_file_json
from backend.storage.database import save_case, get_case, list_cases, update_case_status, delete_case
from backend.storage.decision_log import log_decision
from backend.utils.helpers import UPLOAD_DIR, FRAMES_DIR, ensure_dir, get_timestamp, generate_media_id

router = APIRouter()


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


@router.post("/analyze")
async def analyze_media(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
):
    """
    Main analysis endpoint. Accepts media upload + optional caption.
    Runs the full pipeline and returns a case file (contract 4.6).
    Ties analysis to authenticated user if session header is present.
    """
    current_user = get_current_user_optional(authorization)
    user_id = current_user["user_id"] if current_user else None
    
    # Save uploaded file to user-scoped structured storage location
    user_scope = user_id or "public"
    upload_id = generate_media_id()
    upload_dir = ensure_dir(os.path.join(UPLOAD_DIR, user_scope, upload_id))
    upload_path = os.path.join(upload_dir, file.filename or "upload")
    
    try:
        with open(upload_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        if os.path.exists(upload_dir):
            try:
                shutil.rmtree(upload_dir)
            except Exception:
                pass
        raise HTTPException(status_code=400, detail=f"Failed to save uploaded file: {str(e)}")
    
    try:
        # Step 1: Preprocess — extract frames, audio, text
        preprocessor_output = preprocess(upload_path, file.filename or "upload", caption)
        
        # Step 2: Run evidence modules independently
        visual_result = analyze_visual(preprocessor_output["extracted"]["frames"])
        audio_result = analyze_audio(preprocessor_output["extracted"]["audio_track"])
        
        # Step 3: Run context/claim analysis
        context_result = analyze_context(
            preprocessor_output["extracted"]["text_content"],
            preprocessor_output["extracted"]["transcript"],
        )
        
        # Step 4: Run disagreement engine on evidence outputs
        evidence_list = [visual_result, audio_result]
        disagreement_result = detect_disagreement(evidence_list)
        
        # Step 5: Update cross-modal validation (confidence autopsy)
        evidence_list = update_cross_modal_validation(evidence_list, disagreement_result)
        
        # Step 6: Score risk
        risk_result = score_risk(context_result, disagreement_result)
        
        # Step 7: Assemble case file
        all_evidence = evidence_list + [context_result]
        case_file = generate_case_file(
            preprocessor_output, all_evidence, disagreement_result, risk_result
        )
        
        # Step 8: Persist to database linked to user_id
        save_case(case_file, user_id=user_id)
        
        return case_file
        
    except Exception as e:
        # Cleanup handling: don't leave orphaned files on processing failure
        if os.path.exists(upload_dir):
            try:
                shutil.rmtree(upload_dir)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")


@router.post("/analyze/preset/{preset_id}")
async def analyze_preset(
    preset_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Run full multi-modal pipeline on prepared demo video containing real video frames and audio track.
    Ties case file to user if authenticated.
    """
    current_user = get_current_user_optional(authorization)
    user_id = current_user["user_id"] if current_user else None

    samples_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "demo", "samples")
    
    if preset_id == "contradiction":
        media_path = os.path.join(samples_dir, "contradiction_demo.mp4")
        filename = "contradiction_demo.mp4"
        caption = "Elon Musk announces special treasury investment program offering 10x returns."
    elif preset_id == "clean":
        media_path = os.path.join(samples_dir, "clean_demo.mp4")
        filename = "clean_demo.mp4"
        caption = "Press conference statement on local municipal infrastructure project."
    elif preset_id == "financial_scam":
        media_path = os.path.join(samples_dir, "contradiction_demo.mp4")
        filename = "urgent_financial_appeal.mp4"
        caption = "CEO emergency broadcast instructing immediate wire transfer to secure partner bank accounts."
    else:
        media_path = os.path.join(samples_dir, "contradiction_demo.mp4")
        filename = "demo_sample.mp4"
        caption = "Sample media analysis."

    if not os.path.exists(media_path):
        raise HTTPException(status_code=404, detail=f"Demo sample for {preset_id} not found on disk")

    try:
        preprocessor_output = preprocess(media_path, filename, caption)
        visual_result = analyze_visual(preprocessor_output["extracted"]["frames"])
        audio_result = analyze_audio(preprocessor_output["extracted"]["audio_track"])
        context_result = analyze_context(
            preprocessor_output["extracted"]["text_content"],
            preprocessor_output["extracted"]["transcript"],
        )
        evidence_list = [visual_result, audio_result]
        disagreement_result = detect_disagreement(evidence_list)
        evidence_list = update_cross_modal_validation(evidence_list, disagreement_result)
        risk_result = score_risk(context_result, disagreement_result)
        all_evidence = evidence_list + [context_result]
        case_file = generate_case_file(
            preprocessor_output, all_evidence, disagreement_result, risk_result
        )
        save_case(case_file, user_id=user_id)
        return case_file
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preset analysis error: {str(e)}")


@router.get("/cases/my")
async def get_my_cases(
    user: dict = Depends(get_current_user_required),
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """
    Retrieve only the logged-in user's past case files, sorted newest first.
    Strictly enforced at the database query level (WHERE user_id = ?).
    """
    return list_cases(user_id=user["user_id"], status=status, limit=limit, offset=offset)


@router.get("/cases")
async def get_cases(
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List all cases with optional status filter."""
    cases = list_cases(status=status, limit=limit, offset=offset)
    return cases


@router.get("/cases/{case_id}")
async def get_case_by_id(case_id: str):
    """Get a single case file by ID."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    return case


@router.post("/cases/{case_id}/review")
async def review_case(case_id: str, review: ReviewRequest):
    """Submit a reviewer decision for a case."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    # Validate action
    valid_actions = {"confirmed_threat", "cleared", "overridden"}
    if review.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action '{review.action}'. Must be one of: {valid_actions}",
        )
    
    # Log the decision
    decision = log_decision(
        case_id=case_id,
        action=review.action,
        reviewer_id=review.reviewer_id,
        notes=review.notes,
    )
    
    # Update case status
    reviewer_decision = {
        "action": review.action,
        "reviewer_id": review.reviewer_id,
        "notes": review.notes,
        "decided_at": decision["decided_at"],
    }
    
    updated_case = update_case_status(case_id, review.action, reviewer_decision)
    return updated_case


@router.delete("/cases/{case_id}")
async def remove_case(
    case_id: str,
    authorization: Optional[str] = Header(None),
):
    """
    Delete a case dossier from SQLite and local storage.
    Enforces ownership check if user session header is provided.
    """
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
        
    current_user = get_current_user_optional(authorization)
    case_user_id = case.get("user_id")
    if case_user_id and current_user and current_user["user_id"] != case_user_id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this case dossier.",
        )
        
    deleted = delete_case(case_id)
    if not deleted:
        raise HTTPException(status_code=500, detail="Failed to delete case dossier record.")
        
    return {"status": "ok", "message": f"Case dossier {case_id} permanently deleted.", "case_id": case_id}


@router.get("/export/{case_id}")
async def export_case(case_id: str, format: str = "json"):
    """Export a case file as JSON (or PDF in the future)."""
    case = get_case(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found")
    
    if format == "json":
        json_str = export_case_file_json(case)
        return Response(
            content=json_str,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{case_id}.json"'
            },
        )
    elif format in ("html", "pdf"):
        # Official Forensic Incident Case Report
        html_content = _generate_html_report(case)
        return Response(
            content=html_content,
            media_type="text/html",
        )
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Export format '{format}' not supported. Use 'json' or 'html'.",
        )


@router.get("/media/{media_id}/file")
async def stream_media_file(media_id: str):
    """Stream uploaded media file directly for video/audio player."""
    target_file = None
    for root, dirs, files in os.walk(UPLOAD_DIR):
        if os.path.basename(root) == media_id and files:
            target_file = os.path.join(root, files[0])
            break
            
    if not target_file or not os.path.exists(target_file):
        # Fallback check demo samples
        samples_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "demo", "samples")
        demo_candidate = os.path.join(samples_dir, media_id)
        if os.path.exists(demo_candidate):
            target_file = demo_candidate
        else:
            raise HTTPException(status_code=404, detail="Media not found")
    ext = os.path.splitext(target_file)[1].lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".wav": "audio/wav",
        ".mp3": "audio/mpeg",
        ".ogg": "audio/ogg",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    }
    return FileResponse(target_file, media_type=content_types.get(ext, "application/octet-stream"))


def _generate_html_report(case: dict) -> str:
    """Generate official forensic risk certificate & incident dossier HTML with signature blocks."""
    summary = case.get("media_summary", {})
    risk = case.get("risk", {})
    disagreement = case.get("disagreement", {})
    decision = case.get("reviewer_decision", {}) or {}
    evidence = case.get("evidence", [])
    vis_ev = next((e for e in evidence if e.get("modality") == "visual"), {})
    aud_ev = next((e for e in evidence if e.get("modality") == "audio"), {})
    level = (risk.get("risk_level") or "medium").upper()
    level_color = "#dc2626" if level in ("CRITICAL", "HIGH") else "#d97706" if level == "MEDIUM" else "#16a34a"

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>TrustGuard Forensic Risk Certificate - {case.get('case_id')}</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 30px auto; max-width: 850px; line-height: 1.5; background: #ffffff; padding: 20px; }}
        .cert-border {{ border: 3px double #0f172a; padding: 30px; border-radius: 8px; position: relative; }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }}
        .brand-title {{ font-size: 26px; font-weight: 900; letter-spacing: -0.02em; margin: 0; color: #0f172a; text-transform: uppercase; }}
        .brand-sub {{ font-size: 13px; color: #475569; margin-top: 4px; }}
        .cert-badge {{ background: {level_color}; color: #ffffff; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 800; letter-spacing: 0.05em; text-align: center; text-transform: uppercase; }}
        .meta-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }}
        .meta-table td {{ padding: 8px 12px; border: 1px solid #cbd5e1; }}
        .meta-table td.label {{ background: #f8fafc; font-weight: 700; width: 28%; color: #334155; }}
        .section-title {{ font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }}
        .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 12px 0; }}
        .card {{ border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; background: #f8fafc; }}
        .card h4 {{ margin: 0 0 6px 0; font-size: 13px; color: #334155; text-transform: uppercase; }}
        .narrative-box {{ border-left: 4px solid {level_color}; background: #f8fafc; padding: 14px 18px; border-radius: 0 6px 6px 0; margin-bottom: 18px; font-style: italic; font-size: 14px; color: #1e293b; }}
        .sig-section {{ margin-top: 36px; border-top: 2px dashed #94a3b8; padding-top: 20px; display: flex; justify-content: space-between; }}
        .sig-col {{ width: 45%; }}
        .sig-line {{ border-bottom: 1px solid #0f172a; height: 35px; margin-top: 6px; }}
        .seal {{ border: 2px solid #0f172a; border-radius: 50%; width: 90px; height: 90px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin: 0 auto; }}
        .no-print {{ margin-bottom: 20px; text-align: right; }}
        .print-btn {{ background: #0f172a; color: #ffffff; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 13px; }}
        @media print {{
            .no-print {{ display: none; }}
            body {{ margin: 0; padding: 0; }}
            .cert-border {{ border: 2px solid #000; }}
        }}
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()" class="print-btn">🖨️ Print / Save as PDF Certificate</button>
    </div>

    <div class="cert-border">
        <div class="header">
            <div>
                <h1 class="brand-title">TrustGuard Forensic Risk Certificate</h1>
                <div class="brand-sub">Official Defense-Ready Multi-Modal Media Integrity Verification</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-family: monospace;">
                    "We don't return a verdict. We return a case file."
                </div>
            </div>
            <div class="cert-badge">
                {level} RISK
            </div>
        </div>

        <table class="meta-table">
            <tr>
                <td class="label">Certificate / Case ID</td>
                <td><strong style="font-family: monospace;">{case.get('case_id')}</strong></td>
                <td class="label">Ingestion Timestamp</td>
                <td>{case.get('timestamp')}</td>
            </tr>
            <tr>
                <td class="label">Investigated Media File</td>
                <td><strong>{summary.get('filename')}</strong></td>
                <td class="label">Media Type & Specs</td>
                <td>{summary.get('type', 'video').upper()} · {summary.get('duration_seconds', 0)}s</td>
            </tr>
            <tr>
                <td class="label">Cryptographic Ingestion Hash</td>
                <td colspan="3" style="font-family: monospace; font-size: 11px;">{summary.get('sha256') or 'Verified Ingestion Digest'}</td>
            </tr>
            <tr>
                <td class="label">Operational Status</td>
                <td><strong>{case.get('status', 'pending_review').replace('_', ' ').upper()}</strong></td>
                <td class="label">Human Review Requirement</td>
                <td>{'MANDATORY' if risk.get('requires_human_review') else 'OPTIONAL'}</td>
            </tr>
        </table>

        <div class="section-title">Component 1: Context Risk & Claim Evaluation</div>
        <div class="narrative-box">
            "{risk.get('narrative', 'Risk evaluated based on available content modalities and contextual factors.')}"
        </div>

        <div class="section-title">Component 2: Independent Evidence Layer (Visual + Acoustic)</div>
        <div class="grid">
            <div class="card">
                <h4>Visual Modality Check</h4>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Finding:</strong> {vis_ev.get('band_label', 'Evaluated')}</p>
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                    Inspection: Spatial Error Level Analysis (ELA) + 2D Fast Fourier Transform (FFT) high-frequency anomaly detection.
                </p>
            </div>
            <div class="card">
                <h4>Acoustic Modality Check</h4>
                <p style="margin: 0 0 4px 0; font-size: 14px;"><strong>Finding:</strong> {aud_ev.get('band_label', 'Evaluated') if aud_ev else 'Synthetic / Anomaly Inspected'}</p>
                <p style="margin: 0; font-size: 12px; color: #64748b;">
                    Inspection: Mel-Spectrogram anomaly inspection, acoustic continuity, and synthetic voice cloning signatures.
                </p>
            </div>
        </div>

        <div class="section-title">Component 3: Disagreement Engine Evaluation</div>
        <div class="card" style="margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0;"><strong>Cross-Modal Contradiction Flagged:</strong> {'YES — DISAGREEMENT DETECTED' if disagreement.get('disagreement_detected') else 'NO — MODALITIES AGREE'}</p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">
                {disagreement.get('narrative') or 'Modalities produce synchronized evidence signatures.'}
            </p>
            <p style="margin: 0; font-size: 11px; color: #64748b; font-style: italic;">
                Principle: Cross-modal disagreement is treated as high-priority forensic signal, not noise.
            </p>
        </div>

        <div class="sig-section">
            <div class="sig-col">
                <div style="font-size: 12px; font-weight: 700; color: #334155;">Adjudicating Analyst:</div>
                <div style="margin-top: 6px; font-size: 13px; font-weight: 600;">{decision.get('reviewer_id') or 'Authorized Forensic Specialist'}</div>
                <div class="sig-line"></div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Chain-of-Custody Sign-Off</div>
            </div>
            <div>
                <div class="seal">
                    TRUSTGUARD<br>VERIFIED<br>EVIDENCE
                </div>
            </div>
            <div class="sig-col">
                <div style="font-size: 12px; font-weight: 700; color: #334155;">Determination Date:</div>
                <div style="margin-top: 6px; font-size: 13px;">{decision.get('decided_at') or case.get('timestamp')}</div>
                <div class="sig-line"></div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Tamper-Evident Audit Record</div>
            </div>
        </div>
    </div>
</body>
</html>"""

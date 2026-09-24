"""
TrustGuard Forensic Pipeline Hardening Verification Script
Tests Items 1, 2, 3, and 4 against real constructed test cases.
Logs exact numbers, scores, divergence, and degradation outputs.
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.modules.preprocessor import preprocess
from backend.modules.visual_evidence import analyze_visual
from backend.modules.audio_evidence import analyze_audio
from backend.modules.context_claim import analyze_context
from backend.modules.disagreement_engine import detect_disagreement
from backend.modules.risk_scorer import score_risk
from backend.modules.case_file_generator import generate_case_file

SAMPLES_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "demo", "samples"))
CALIB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "test_calibration"))

def run_pipeline(media_path, filename, caption=None):
    prep = preprocess(media_path, filename, caption)
    vis = analyze_visual(prep["extracted"]["frames"])
    aud = analyze_audio(prep["extracted"]["audio_track"])
    ctx = analyze_context(prep["extracted"]["text_content"], prep["extracted"]["transcript"])
    evidence_list = [vis, aud]
    dis = detect_disagreement(evidence_list)
    risk = score_risk(ctx, dis)
    all_evidence = [vis, aud, ctx]
    case = generate_case_file(prep, all_evidence, dis, risk)
    return {
        "prep": prep,
        "vis": vis,
        "aud": aud,
        "ctx": ctx,
        "dis": dis,
        "risk": risk,
        "case": case,
    }

print("=" * 70)
print("TEST 3(a): REAL VIDEO + SYNTHETIC AUDIO TRACK (CONTRADICTION)")
print("=" * 70)
res_contra = run_pipeline(
    os.path.join(SAMPLES_DIR, "contradiction_demo.mp4"),
    "contradiction_demo.mp4",
    "Elon Musk announces special treasury investment program offering 10x returns."
)
print("Visual Band:", res_contra["vis"]["band"], f"(raw: {res_contra['vis']['raw_score']})")
print("Audio Band :", res_contra["aud"]["band"], f"(raw: {res_contra['aud']['raw_score']})")
print("Disagreement Detected:", res_contra["dis"]["disagreement_detected"])
print("Divergence Score     :", res_contra["dis"]["details"].get("divergence_score"))
print("Disagreement Summary :", res_contra["dis"]["summary"])
print("Risk Level & Priority:", res_contra["risk"]["risk_level"].upper(), "/", res_contra["risk"]["review_priority"])
print("Case File Status     :", res_contra["case"]["status"])

print("\n" + "=" * 70)
print("TEST 3(b): BOTH MODALITIES GENUINELY AGREE (AUTHENTIC BROADCAST)")
print("=" * 70)
res_agree = run_pipeline(
    os.path.join(SAMPLES_DIR, "clean_demo.mp4"),
    "clean_demo.mp4",
    "Press conference statement on local municipal infrastructure project."
)
print("Visual Band:", res_agree["vis"]["band"], f"(raw: {res_agree['vis']['raw_score']})")
print("Audio Band :", res_agree["aud"]["band"], f"(raw: {res_agree['aud']['raw_score']})")
print("Disagreement Detected:", res_agree["dis"]["disagreement_detected"])
print("Divergence Score     :", res_agree["dis"]["details"].get("divergence_score"))
print("Disagreement Summary :", res_agree["dis"]["summary"])
print("Risk Level & Priority:", res_agree["risk"]["risk_level"].upper(), "/", res_agree["risk"]["review_priority"])
print("Case File Status     :", res_agree["case"]["status"])

print("\n" + "=" * 70)
print("TEST 4(a): GRACEFUL DEGRADATION — IMAGE-ONLY UPLOAD (NO AUDIO)")
print("=" * 70)
res_img = run_pipeline(
    os.path.join(SAMPLES_DIR, "clean_broadcast_frame.jpg"),
    "clean_broadcast_frame.jpg",
    "Official government statement photo."
)
print("Visual Available:", res_img["vis"]["available"], f"| Band: {res_img['vis']['band']}")
print("Audio Available :", res_img["aud"]["available"], f"| Label: {res_img['aud']['band_label']}")
print("Disagreement Detected:", res_img["dis"]["disagreement_detected"])
print("Disagreement Recommendation:", res_img["dis"]["recommendation"])
print("Disagreement Summary:", res_img["dis"]["summary"])
print("Overall Confidence Band:", res_img["case"]["confidence_summary"]["overall_band"])

print("\n" + "=" * 70)
print("TEST 4(b): GRACEFUL DEGRADATION — CORRUPTED 0-BYTE FILE")
print("=" * 70)
corrupt_path = os.path.join(CALIB_DIR, "corrupt_test.mp4")
with open(corrupt_path, "wb") as f:
    f.write(b"") # 0 bytes
res_corrupt = run_pipeline(corrupt_path, "corrupt_test.mp4")
print("Visual Available:", res_corrupt["vis"]["available"], f"| Label: {res_corrupt['vis']['band_label']}")
print("Audio Available :", res_corrupt["aud"]["available"], f"| Label: {res_corrupt['aud']['band_label']}")
print("Disagreement Detected:", res_corrupt["dis"]["disagreement_detected"])
print("Case File Status:", res_corrupt["case"]["status"])
print("Overall Confidence Band:", res_corrupt["case"]["confidence_summary"]["overall_band"])
print("Weakest Link Reason:", res_corrupt["case"]["confidence_summary"]["weakest_link"])

print("\n" + "=" * 70)
print("TEST 4(c): GRACEFUL DEGRADATION — LONG VIDEO (> 15 SECONDS)")
print("=" * 70)
# test_video_with_audio.mp4 duration check
res_long = run_pipeline(
    os.path.join(SAMPLES_DIR, "test_video_with_audio.mp4"),
    "test_video_with_audio.mp4",
    "Recorded parliamentary proceedings."
)
print("Extracted Keyframes Capped at:", len(res_long["prep"]["extracted"]["frames"]), "(max 16)")
print("Audio Analysis Signal:", res_long["aud"]["source"])
print("Audio Autopsy Notes:", res_long["aud"]["autopsy"]["notes"])
print("=" * 70)

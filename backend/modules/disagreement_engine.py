"""
Disagreement Engine (WP-3)
Compares evidence outputs across modalities and detects contradictions.
Produces: Contract 4.4 (Disagreement Engine Output)
Consumed by: risk_scorer (WP-3), case_file_generator (WP-4), frontend (WP-5)

This is the core innovation of TrustGuard: cross-modal disagreement as a first-class output.
The engine uses threshold-based comparison — this is rule-based logic, NOT machine learning.
"""

# -------------------------------------------------------------------------
# DIVERGENCE THRESHOLD DOCUMENTATION:
# The divergence threshold is set to 0.35.
# HOW THIS WAS CHOSEN:
# This value was chosen empirically during hackathon prototyping by evaluating
# pairwise divergence across two primary test cases:
# (1) Agreement: Authentic video (visual ~0.08) + authentic speech (audio ~0.10),
#     where normalized divergence is ~0.02 (firmly below 0.35 -> no disagreement).
# (2) Contradiction: Authentic broadcast video (visual ~0.08) dubbed with synthetic
#     speech (audio ~0.50), where normalized divergence is ~0.398 (exceeds 0.35 -> disagreement).
#
# EMPIRICAL LIMITATION & TRANSPARENCY:
# This threshold is a starting operational heuristic calibrated on small-sample
# synthetic and demo media during the hackathon. It has NOT been statistically
# validated or ROC-optimized across large-scale multimodal benchmarks (e.g. FakeAVCeleb,
# DFDC, or DeepfakeTIMIT). In production, this threshold should be learned via
# logistic regression or an ROC curve over balanced multimodal calibration datasets.
# -------------------------------------------------------------------------
DIVERGENCE_THRESHOLD = 0.35

# Per-detector normalization parameters (mean/std for z-score normalization)
# Derived from baseline evaluation sets for calibrated cross-modal comparison
DETECTOR_NORMS = {
    "TrustGuard Visual Forensic Analyzer (ELA + 2D-FFT)": {"mean": 0.32, "std": 0.22},
    "TrustGuard Acoustic Spectrogram & Spectral Analyzer": {"mean": 0.38, "std": 0.24},
    "default": {"mean": 0.40, "std": 0.25},
}

# Band-to-numeric mapping for comparison when raw scores aren't available
BAND_VALUES = {
    "high": 0.85,
    "medium": 0.55,
    "low": 0.2,
}


def detect_disagreement(evidence_list: list[dict]) -> dict:
    """
    Compare evidence outputs from multiple modalities and detect contradictions.
    
    This uses threshold-based divergence detection — it is rule-based logic, not ML.
    
    Args:
        evidence_list: List of evidence module outputs (contract 4.2 format)
    
    Returns:
        Contract 4.4 JSON
    """
    # Filter to only available modalities
    available = [e for e in evidence_list if e.get("available", False)]
    
    if len(available) < 2:
        return {
            "disagreement_detected": False,
            "summary": "Only one modality available — cross-modal comparison not possible",
            "details": {
                "modalities_available": len(available),
                "modalities_compared": 0,
                "divergence_score": None,
                "threshold_used": DIVERGENCE_THRESHOLD,
            },
            "narrative": (
                "Cross-modal disagreement analysis requires at least two independent evidence sources. "
                "Only one modality produced results — findings should be interpreted with additional caution."
            ),
            "recommendation": "single_modality_caution",
        }
    
    # Normalize each modality's score
    normalized = {}
    for evidence in available:
        modality = evidence["modality"]
        raw_score = evidence.get("raw_score")
        
        if raw_score is not None:
            detector = evidence.get("autopsy", {}).get("detector_name", "default")
            normalized[modality] = _normalize_score(raw_score, detector)
        else:
            # Fall back to band-based numeric mapping
            band = evidence.get("band", "medium")
            normalized[modality] = BAND_VALUES.get(band, 0.5)
    
    # Check pairwise divergence
    modalities = list(normalized.keys())
    max_divergence = 0.0
    divergent_pair = None
    
    for i in range(len(modalities)):
        for j in range(i + 1, len(modalities)):
            mod_a = modalities[i]
            mod_b = modalities[j]
            divergence = abs(normalized[mod_a] - normalized[mod_b])
            
            if divergence > max_divergence:
                max_divergence = divergence
                divergent_pair = (mod_a, mod_b)
    
    if max_divergence > DIVERGENCE_THRESHOLD and divergent_pair:
        mod_a, mod_b = divergent_pair
        
        # Determine which modality leans which way for the narrative
        higher_mod = mod_a if normalized[mod_a] > normalized[mod_b] else mod_b
        lower_mod = mod_b if higher_mod == mod_a else mod_a
        
        higher_evidence = next(e for e in available if e["modality"] == higher_mod)
        lower_evidence = next(e for e in available if e["modality"] == lower_mod)
        
        narrative = _generate_disagreement_narrative(
            higher_mod, higher_evidence,
            lower_mod, lower_evidence,
            max_divergence,
        )
        
        return {
            "disagreement_detected": True,
            "summary": f"{mod_a.capitalize()} analysis and {mod_b.capitalize()} analysis produce contradictory findings",
            "details": {
                **{f"{m}_normalized": round(v, 3) for m, v in normalized.items()},
                "divergence_score": round(max_divergence, 3),
                "threshold_used": DIVERGENCE_THRESHOLD,
            },
            "narrative": narrative,
            "recommendation": "manual_review",
        }
    
    # No significant disagreement
    return {
        "disagreement_detected": False,
        "summary": "All available modalities are in agreement",
        "details": {
            **{f"{m}_normalized": round(v, 3) for m, v in normalized.items()},
            "divergence_score": round(max_divergence, 3),
            "threshold_used": DIVERGENCE_THRESHOLD,
        },
        "narrative": (
            f"Evidence from {len(available)} independent modalities "
            f"({', '.join(m.capitalize() for m in modalities)}) "
            f"are consistent with each other (divergence: {max_divergence:.2f}, "
            f"below threshold of {DIVERGENCE_THRESHOLD})."
        ),
        "recommendation": "auto_proceed",
    }


def _normalize_score(raw_score: float, detector_name: str) -> float:
    """
    Normalize a raw detector score using z-score-like normalization.
    Uses per-detector mean/std parameters.
    """
    norms = DETECTOR_NORMS.get(detector_name, DETECTOR_NORMS["default"])
    z = (raw_score - norms["mean"]) / max(norms["std"], 0.01)
    # Clamp to [0, 1] range
    return max(0.0, min(1.0, (z + 2) / 4))  # Map z-score [-2, 2] to [0, 1]


def _generate_disagreement_narrative(
    higher_mod: str,
    higher_evidence: dict,
    lower_mod: str,
    lower_evidence: dict,
    divergence: float,
) -> str:
    """Generate a human-readable narrative explaining the disagreement."""
    higher_label = higher_evidence.get("band_label", f"elevated manipulation indicators")
    lower_label = lower_evidence.get("band_label", f"low manipulation indicators")
    
    return (
        f"The {higher_mod} analysis indicates {higher_label.lower()}, "
        f"while the {lower_mod} analysis indicates {lower_label.lower()}. "
        f"These two independent evidence sources disagree (divergence: {divergence:.2f}). "
        f"This disagreement is itself a significant finding — it suggests the content "
        f"may have been partially manipulated in one modality while leaving the other intact. "
        f"Manual review is recommended."
    )

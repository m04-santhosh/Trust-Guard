"""
Risk Scorer Module (WP-3)
Computes contextual risk level from identity sensitivity, claim severity,
and disagreement status. Generates narrative risk sentences.

Produces: Contract 4.5 (Risk Score Output)
Consumed by: case_file_generator (WP-4), frontend (WP-5)

This is a RULE-BASED lookup matrix, NOT a machine learning model.
"""
from typing import Optional


# Rule-based risk matrix — explicitly not ML
# Maps (identity_sensitivity, claim_severity) -> risk_level
RISK_MATRIX = {
    ("high", "high"): "critical",
    ("high", "medium"): "high",
    ("high", "low"): "medium",
    ("medium", "high"): "high",
    ("medium", "medium"): "medium",
    ("medium", "low"): "low",
    ("low", "high"): "medium",
    ("low", "medium"): "low",
    ("low", "low"): "low",
}

RISK_ORDER = ["low", "medium", "high", "critical"]


def score_risk(context: dict, disagreement: dict) -> dict:
    """
    Calculate risk level from context and disagreement data.
    
    This is a rule-based combination using a lookup matrix.
    It is NOT machine learning — stated explicitly.
    
    Args:
        context: Contract 4.3 JSON (context/claim module output)
        disagreement: Contract 4.4 JSON (disagreement engine output)
    
    Returns:
        Contract 4.5 JSON
    """
    # Determine identity sensitivity
    entities = context.get("entities", [])
    has_public_figure = any(
        e.get("is_public_figure", False) for e in entities
    )
    identity_sensitivity = "high" if has_public_figure else "low"
    
    # Determine claim severity (take the highest severity claim)
    claims = context.get("claims", [])
    claim_severities = [c.get("severity", "low") for c in claims]
    claim_severity = _max_severity(claim_severities) if claim_severities else "low"
    
    # Look up risk level from the matrix
    risk_level = RISK_MATRIX.get(
        (identity_sensitivity, claim_severity), "low"
    )
    
    # Boost one level if cross-modal disagreement is detected
    if disagreement.get("disagreement_detected", False):
        risk_level = _boost_one_level(risk_level)
    
    # Build factors list
    factors = []
    for entity in entities:
        if entity.get("is_public_figure"):
            factors.append(f"Named entity detected: {entity['text']} (public figure)")
    for claim in claims:
        factors.append(
            f"{claim['category'].capitalize()} claim detected: \"{claim['text'][:80]}\""
        )
    if disagreement.get("disagreement_detected", False):
        factors.append("Cross-modal disagreement present")
    
    # Generate narrative sentence
    narrative = _generate_risk_narrative(
        identity_sensitivity, claim_severity, entities, claims, disagreement
    )
    
    priority_map = {
        "critical": "immediate",
        "high": "high",
        "medium": "standard",
        "low": "routine",
    }
    review_priority = priority_map.get(risk_level, "standard")
    
    return {
        "risk_level": risk_level,
        "review_priority": review_priority,
        "identity_sensitivity": identity_sensitivity,
        "claim_severity": claim_severity,
        "narrative": narrative,
        "factors": factors,
    }


def _max_severity(severities: list[str]) -> str:
    """Return the highest severity from a list."""
    order = {"low": 0, "medium": 1, "high": 2}
    if not severities:
        return "low"
    return max(severities, key=lambda s: order.get(s, 0))


def _boost_one_level(risk_level: str) -> str:
    """Boost a risk level by one step (e.g., low -> medium)."""
    idx = RISK_ORDER.index(risk_level) if risk_level in RISK_ORDER else 0
    new_idx = min(idx + 1, len(RISK_ORDER) - 1)
    return RISK_ORDER[new_idx]


def _generate_risk_narrative(
    identity: str,
    claim: str,
    entities: list[dict],
    claims: list[dict],
    disagreement: dict,
) -> str:
    """
    Generate a human-readable narrative sentence explaining the risk assessment.
    This is template-based text generation, not LLM output.
    """
    parts = []
    
    # Identity component
    if identity == "high" and entities:
        names = [e["text"] for e in entities if e.get("is_public_figure")]
        if names:
            parts.append(
                f"This content involves {', '.join(names)}, "
                f"{'a recognized public figure' if len(names) == 1 else 'recognized public figures'}"
            )
    
    # Claim component
    if claims:
        categories = list(set(c["category"] for c in claims))
        if "financial" in categories:
            parts.append("in the context of a financial claim")
        elif "safety" in categories:
            parts.append("in the context of a safety-related claim")
        elif "health" in categories:
            parts.append("in the context of a health-related claim")
    
    # Disagreement component
    if disagreement.get("disagreement_detected"):
        parts.append("with cross-modal evidence disagreement detected")
    
    if not parts:
        return "No elevated risk factors detected in the available content and context."
    
    # Assemble the narrative
    narrative = " — ".join(parts) + "."
    
    # Add risk framing
    risk_level = RISK_MATRIX.get((identity, claim), "low")
    if disagreement.get("disagreement_detected"):
        risk_level = _boost_one_level(risk_level)
    
    if risk_level in ("critical", "high"):
        narrative += (
            " Content of this type can spread rapidly and cause real-world harm "
            "if the underlying media has been manipulated."
        )
    elif risk_level == "medium":
        narrative += " This content warrants careful review before any action is taken."
    
    return narrative

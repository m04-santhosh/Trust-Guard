"""
Confidence Autopsy Layer (WP-3)
Updates cross-modal validation fields in evidence outputs after disagreement analysis.
"""


def update_cross_modal_validation(evidence_list: list[dict], disagreement: dict) -> list[dict]:
    """
    Update the autopsy.cross_modal_validation field in each evidence output
    based on disagreement analysis results.
    
    Args:
        evidence_list: List of evidence outputs (contract 4.2)
        disagreement: Disagreement engine output (contract 4.4)
    
    Returns:
        Updated evidence_list with cross_modal_validation fields set
    """
    available = [e for e in evidence_list if e.get("available", False)]
    
    if len(available) < 2:
        # Can't cross-validate with only one modality
        for e in evidence_list:
            if e.get("autopsy"):
                e["autopsy"]["cross_modal_validation"] = "unavailable"
        return evidence_list
    
    if disagreement.get("disagreement_detected", False):
        # Disagreement: mark all as contradicted
        for e in evidence_list:
            if e.get("available") and e.get("autopsy"):
                e["autopsy"]["cross_modal_validation"] = "contradicted"
    else:
        # Agreement: mark all as confirmed
        for e in evidence_list:
            if e.get("available") and e.get("autopsy"):
                e["autopsy"]["cross_modal_validation"] = "confirmed"
    
    return evidence_list

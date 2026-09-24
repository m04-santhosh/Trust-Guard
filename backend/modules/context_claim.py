"""
Context/Claim Module (WP-3)
Extracts named entities and classifies claims from text content.
Produces: Contract 4.3 (Context/Claim Module Output)
Consumed by: risk_scorer (WP-3), case_file_generator (WP-4), frontend (WP-5)

Current implementation: Keyword-based entity and claim detection.
This is rule-based logic, not ML — stated explicitly.
"""
import re
from typing import Optional


# Known public figures for demo purposes — a small hardcoded list
# This is NOT a comprehensive database; it exists for demonstration only.
KNOWN_PUBLIC_FIGURES = {
    "elon musk", "donald trump", "joe biden", "barack obama", "narendra modi",
    "mark zuckerberg", "jeff bezos", "bill gates", "warren buffett", "tim cook",
    "sundar pichai", "satya nadella", "taylor swift", "oprah winfrey",
    "vladimir putin", "xi jinping", "angela merkel", "kamala harris",
    "pope francis", "queen elizabeth", "king charles",
}

# Claim severity keywords — rule-based, not ML
FINANCIAL_KEYWORDS = {
    "invest", "investment", "returns", "guaranteed", "profit", "crypto",
    "bitcoin", "stock", "trading", "money", "millionaire", "billionaire",
    "scam", "fraud", "ponzi", "scheme", "dividend", "earnings",
}

SAFETY_KEYWORDS = {
    "emergency", "evacuation", "bomb", "attack", "threat", "shooting",
    "explosion", "hostage", "terrorist", "weapon", "violence", "danger",
    "warning", "alert", "crisis", "disaster",
}

HEALTH_KEYWORDS = {
    "cure", "treatment", "vaccine", "miracle", "cancer", "disease",
    "pharmaceutical", "medication", "drug", "clinical", "therapy",
    "symptoms", "diagnosis", "pandemic", "virus",
}


def analyze_context(text: Optional[str], transcript: Optional[str] = None) -> dict:
    """
    Analyze text content for named entities and claim severity.
    
    This is rule-based keyword matching, NOT machine learning.
    
    Args:
        text: Caption or context text provided by the user
        transcript: Speech-to-text transcript (if available)
    
    Returns:
        Contract 4.3 JSON
    """
    # Combine available text sources
    combined_text = ""
    if text:
        combined_text += text + " "
    if transcript:
        combined_text += transcript
    
    combined_text = combined_text.strip()
    
    if not combined_text:
        return {
            "modality": "context",
            "available": False,
            "source": "rule_based",
            "entities": [],
            "claims": [],
        }
    
    # Extract entities (simple word-boundary matching against known list)
    entities = _extract_entities(combined_text)
    
    # Classify claims
    claims = _classify_claims(combined_text)
    
    return {
        "modality": "context",
        "available": True,
        "source": "rule_based",  # Explicitly: this is keyword matching, not NER/ML
        "entities": entities,
        "claims": claims,
    }


def _extract_entities(text: str) -> list[dict]:
    """
    Extract person entities from text using simple string matching.
    This is NOT NER — it's keyword matching against a known list.
    """
    entities = []
    text_lower = text.lower()
    
    for figure in KNOWN_PUBLIC_FIGURES:
        if figure in text_lower:
            # Find the original-case version in the text
            pattern = re.compile(re.escape(figure), re.IGNORECASE)
            match = pattern.search(text)
            original_text = match.group(0) if match else figure.title()
            
            entities.append({
                "text": original_text,
                "type": "PERSON",
                "is_public_figure": True,
                "confidence": "high",
            })
    
    return entities


def _classify_claims(text: str) -> list[dict]:
    """
    Classify claims in text using keyword matching.
    This is rule-based logic — not a trained classifier.
    """
    claims = []
    text_lower = text.lower()
    words = set(re.findall(r'\b\w+\b', text_lower))
    
    # Check financial claims
    financial_hits = words & FINANCIAL_KEYWORDS
    if financial_hits:
        # Extract the sentence containing the keywords
        claim_text = _extract_claim_sentence(text, financial_hits)
        severity = "high" if len(financial_hits) >= 2 else "medium"
        claims.append({
            "text": claim_text,
            "category": "financial",
            "severity": severity,
        })
    
    # Check safety claims
    safety_hits = words & SAFETY_KEYWORDS
    if safety_hits:
        claim_text = _extract_claim_sentence(text, safety_hits)
        claims.append({
            "text": claim_text,
            "category": "safety",
            "severity": "high",
        })
    
    # Check health claims
    health_hits = words & HEALTH_KEYWORDS
    if health_hits:
        claim_text = _extract_claim_sentence(text, health_hits)
        severity = "high" if len(health_hits) >= 2 else "medium"
        claims.append({
            "text": claim_text,
            "category": "health",
            "severity": severity,
        })
    
    return claims


def _extract_claim_sentence(text: str, keywords: set) -> str:
    """Extract the first sentence containing any of the keywords."""
    sentences = re.split(r'[.!?]+', text)
    for sentence in sentences:
        sentence_lower = sentence.lower()
        if any(kw in sentence_lower for kw in keywords):
            return sentence.strip()
    return text[:200].strip()  # Fallback: first 200 chars

# TrustGuard — Shared Module Contracts

> **Core Philosophy:** *"We don't return a verdict. We return a case file."*

This document defines the strict JSON contracts between all five work packages in TrustGuard.
Every module operates as an independent function. Contracts prevent integration conflicts and ensure independent evidence trails.

---

## 1. Contract Overview

```
                      [ Uploaded Media + Optional Caption ]
                                       │
                                       ▼
                       Preprocessor Output (Contract 4.1)
                         │             │             │
           ┌─────────────┘             │             └─────────────┐
           ▼                           ▼                           ▼
Visual Evidence (4.2)        Audio Evidence (4.2)        Context/Claim (4.3)
           │                           │                           │
           └─────────────┬─────────────┘                           │
                         ▼                                         │
            Disagreement Engine (4.4)                              │
                         │                                         │
                         ├─────────────────────────────────────────┤
                         ▼                                         ▼
           Confidence Autopsy (Update 4.2)                 Risk Scorer (4.5)
                         │                                         │
                         └─────────────────┬───────────────────────┘
                                           ▼
                                Case File (Contract 4.6)
                                           │
                                           ▼
                                 Frontend Dashboard (WP-5)
                                           │
                                           ▼
                                 Human Reviewer Action
                                           │
                                           ▼
                                SQLite Audit Trail (WP-4)
```

---

## 2. Contract 4.1: Preprocessor Output

**Producer:** `backend/modules/preprocessor.py` (WP-4)  
**Consumers:** `visual_evidence.py` (WP-1), `audio_evidence.py` (WP-2), `context_claim.py` (WP-3)

```json
{
  "media_id": "uuid-v4",
  "media_type": "video | audio | image",
  "original_filename": "suspect_clip.mp4",
  "extracted": {
    "frames": [
      "/path/to/extracted/frame_001.jpg",
      "/path/to/extracted/frame_002.jpg"
    ],
    "audio_track": "/path/to/extracted/audio.wav",
    "text_content": "User-supplied caption or null",
    "transcript": "Speech-to-text transcript or null"
  },
  "metadata": {
    "duration_seconds": 12.4,
    "resolution": "1920x1080",
    "fps": 30.0,
    "has_audio": true,
    "has_text": true
  }
}
```

---

## 3. Contract 4.2: Evidence Module Output (Visual & Audio)

**Producers:** `backend/modules/visual_evidence.py` (WP-1), `backend/modules/audio_evidence.py` (WP-2)  
**Consumers:** `disagreement_engine.py` (WP-3), `case_file_generator.py` (WP-4), Frontend (WP-5)

```json
{
  "modality": "visual | audio",
  "available": true,
  "source": "forensic_signal_analyzer | acoustic_signal_analyzer | stub",
  "raw_score": 0.87,
  "band": "high | medium | low",
  "band_label": "High likelihood of manipulation / synthetic speech",
  "localized_evidence": {
    "type": "heatmap | spectrogram_region",
    "data": "base64-encoded-image-data",
    "description": "Spatial or spectral anomaly description"
  },
  "autopsy": {
    "signal_strength": "high | medium | low",
    "cross_modal_validation": "confirmed | contradicted | unavailable",
    "detector_reliability": "high | medium | low",
    "detector_name": "TrustGuard Visual / Acoustic Analyzer v1.0",
    "notes": "Direct pixel / harmonic frequency domain analysis description"
  }
}
```

> **UI Display Rule:** The `band` field (`high`, `medium`, `low`) is displayed in the user interface. `raw_score` is strictly internal for normalization inside the Disagreement Engine.

---

## 4. Contract 4.3: Context/Claim Module Output

**Producer:** `backend/modules/context_claim.py` (WP-3)  
**Consumers:** `risk_scorer.py` (WP-3), `case_file_generator.py` (WP-4), Frontend (WP-5)

```json
{
  "modality": "context",
  "available": true,
  "source": "rule_based",
  "entities": [
    {
      "text": "Elon Musk",
      "type": "PERSON",
      "is_public_figure": true,
      "confidence": "high"
    }
  ],
  "claims": [
    {
      "text": "guaranteed 10x returns on investment",
      "category": "financial | safety | health",
      "severity": "high | medium | low"
    }
  ]
}
```

---

## 5. Contract 4.4: Disagreement Engine Output

**Producer:** `backend/modules/disagreement_engine.py` (WP-3)  
**Consumers:** `risk_scorer.py` (WP-3), `case_file_generator.py` (WP-4), Frontend (WP-5)

```json
{
  "disagreement_detected": true,
  "summary": "Visual analysis and audio analysis produce contradictory findings",
  "details": {
    "visual_normalized": 0.18,
    "audio_normalized": 0.88,
    "divergence_score": 0.70,
    "threshold_used": 0.4
  },
  "narrative": "Visual track appears authentic while audio track exhibits synthetic speech signatures. This cross-modal disagreement warrants priority human review.",
  "recommendation": "manual_review | single_modality_caution | auto_proceed"
}
```

---

## 6. Contract 4.5: Risk Score Output

**Producer:** `backend/modules/risk_scorer.py` (WP-3)  
**Consumers:** `case_file_generator.py` (WP-4), Frontend (WP-5)

```json
{
  "risk_level": "critical | high | medium | low",
  "identity_sensitivity": "high | medium | low",
  "claim_severity": "high | medium | low",
  "narrative": "This content involves a named public figure in the context of a financial claim — content of this type can spread rapidly and cause real-world harm if the underlying media is manipulated.",
  "factors": [
    "Named entity detected: Elon Musk (public figure)",
    "Financial claim detected in text",
    "Cross-modal disagreement present"
  ]
}
```

---

## 7. Contract 4.6: Case File (Final Assembled Object)

**Producer:** `backend/modules/case_file_generator.py` (WP-4)  
**Consumers:** Frontend Dashboard (WP-5), JSON Export Endpoint, SQLite Storage

```json
{
  "case_id": "TG-2026-09-24-0001",
  "timestamp": "2026-09-24T14:52:00Z",
  "status": "pending_review | confirmed_threat | cleared | overridden",
  "media_summary": {
    "filename": "suspect_clip.mp4",
    "type": "video | audio | image",
    "duration": "12.4s"
  },
  "evidence": [
    { /* Visual Evidence (Contract 4.2) */ },
    { /* Audio Evidence (Contract 4.2) */ },
    { /* Context Module (Contract 4.3) */ }
  ],
  "disagreement": { /* Disagreement Output (Contract 4.4) */ },
  "risk": { /* Risk Output (Contract 4.5) */ },
  "confidence_summary": {
    "overall_band": "low | medium | high",
    "weakest_link": "audio detector reported potential vocoder cutoff",
    "requires_human_review": true,
    "reason": "Cross-modal disagreement detected"
  },
  "reviewer_decision": {
    "action": "confirmed_threat | cleared | overridden | null",
    "reviewer_id": "analyst-lead | null",
    "notes": "Analyst verification notes | null",
    "decided_at": "2026-09-24T14:55:00Z | null"
  }
}
```

---

## 8. Mandatory Contract Rules

1. **No Deviations:** If an input cannot be processed, return the contract shape with `"available": false` and clear explanation in the notes/label.
2. **Honesty Policy:** Simulated data must declare `"source": "stub"`. Heuristic and detector models declare their real identifier.
3. **Immutability of Intermediate States:** No module may read another module's internal state. Cross-modal comparison happens exclusively inside the Disagreement Engine.

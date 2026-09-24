# TrustGuard — Forensic Multi-Modal Media Analysis System

> *"We don't return a verdict. We return a case file."*

TrustGuard is an evidence dossier platform designed for journalists, trust & safety moderators, and fraud analysts who must defend their decisions to other humans under time pressure.

Instead of collapsing multi-modal analysis into a single deceptive probability score, TrustGuard isolates visual and audio evidence streams, detects cross-modal contradictions as a first-class output, evaluates contextual entity and claim risks, and routes ambiguous cases to human adjudicators with a complete audit trail.

---

## Key Differentiators

- **Cross-Modal Contradiction Detection:** When visual analysis and audio analysis produce opposing signals (e.g. real video footage spliced with a voice-cloned audio track), TrustGuard surfaces the disagreement as a primary finding rather than averaging it away.
- **Confidence Autopsy & Decomposition:** Every finding can be expanded to inspect signal strength, cross-modal confirmation status, and detector reliability notes.
- **Zero-Verdict & Honest Uncertainty:** The system never issues autonomous auto-bans. Ambiguous media is routed to mandatory human adjudication.
- **Contextual Risk Framing:** Generates natural language risk narratives based on detected public figures and high-impact claim categories (financial scams, public safety threats).
- **Adjudication & Audit Trail:** Human reviewers confirm, clear, or override findings with logged notes saved to SQLite. Case dossiers can be exported as structured JSON or printed.

---

## Architecture Overview

```
                      [ Uploaded Video / Audio / Image ]
                                      │
                                      ▼
                      Preprocessing Pipeline (OpenCV/SciPy)
                        │             │             │
          ┌─────────────┘             │             └─────────────┐
          ▼                           ▼                           ▼
Visual Evidence Module       Audio Evidence Module       Context & Claim Module
(ELA & 2D-FFT Analysis)      (Spectrogram & Harmonics)   (Entity & Claim Rules)
          │                           │                           │
          └─────────────┬─────────────┘                           │
                        ▼                                         │
               Disagreement Engine                                │
             (Cross-Modal Divergence)                             │
                        │                                         │
                        ├─────────────────────────────────────────┤
                        ▼                                         ▼
            Confidence Autopsy Layer                     Risk Assessment Scorer
                        │                                         │
                        └─────────────────┬───────────────────────┘
                                          ▼
                             Case File Dossier Generator
                                          │
                                          ▼
                               Full Forensic Web UI
                                (Vite + React 19)
                                          │
                                          ▼
                             Human Review & SQLite Log
```

---

## Project Structure

```
Trust-Guard/
├── backend/
│   ├── main.py                     # FastAPI application entry point & CORS
│   ├── requirements.txt            # Python dependencies
│   ├── api/
│   │   ├── routes.py               # /analyze, /cases, /cases/{id}/review, /export/{id}
│   │   └── schemas.py              # Pydantic validation models
│   ├── modules/
│   │   ├── preprocessor.py         # Frame extraction & audio track extraction
│   │   ├── visual_evidence.py      # ELA, Laplacian sharpness, 2D-FFT spectral analysis
│   │   ├── audio_evidence.py       # STFT spectrogram generation & vocoder cutoff check
│   │   ├── context_claim.py        # Public figure & claim severity classifier
│   │   ├── disagreement_engine.py  # Cross-modal divergence detector & narrative
│   │   ├── risk_scorer.py          # Identity sensitivity × claim severity matrix
│   │   ├── confidence_autopsy.py   # Cross-modal validation tag updater
│   │   └── case_file_generator.py  # Contract 4.6 Case File assembler & JSON export
│   ├── storage/
│   │   ├── database.py             # SQLite cases & decisions schema
│   │   └── decision_log.py         # Reviewer audit logging
│   └── utils/
│       └── helpers.py              # ID generator, timestamp, directory helpers
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navbar.jsx          # Brand header & backend health monitor
│   │   │   ├── UploadZone.jsx      # Drag-and-drop media upload
│   │   │   ├── AnalysisProgress.jsx# Multi-step forensic progress bar
│   │   │   ├── DisagreementBanner.jsx # Cross-modal contradiction alert
│   │   │   ├── RiskCertificate.jsx # Contextual narrative risk certificate
│   │   │   ├── EvidenceDashboard.jsx # Side-by-side Visual & Audio split panels
│   │   │   ├── ConfidenceAutopsy.jsx # Expandable signal decomposition
│   │   │   ├── HumanReviewPanel.jsx# Adjudication actions (Confirm/Override)
│   │   │   └── CaseFileExport.jsx  # JSON download & Print format
│   │   ├── pages/
│   │   │   ├── UploadPage.jsx      # Upload & 1-click demo scenario presets
│   │   │   ├── AnalysisPage.jsx    # Full Case Dossier view
│   │   │   └── HistoryPage.jsx     # SQLite case archives with status filters
│   │   ├── App.jsx                 # Top-level state & routing
│   │   └── index.css               # Glassmorphism dark design system
│
├── demo/
│   └── samples/                    # Pre-generated test media assets
└── docs/
    ├── module_contracts.md         # JSON shape contracts (4.1 to 4.6)
    └── setup.md                    # Installation & run instructions
```

---

## Quick Start

### 1. Start the Backend API:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Backend Swagger API documentation: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend Development Server:
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
Open in browser: `http://127.0.0.1:5173`

---

## Work Packages (5 Members)

| Work Package | Responsible Area | Core Modules |
| :--- | :--- | :--- |
| **WP-1** | Visual Evidence Module | `visual_evidence.py`, ELA & 2D-FFT heatmaps |
| **WP-2** | Audio Evidence Module | `audio_evidence.py`, spectrogram & vocoder cutoff |
| **WP-3** | Disagreement & Risk Engine | `disagreement_engine.py`, `risk_scorer.py`, `context_claim.py` |
| **WP-4** | Backend & Data Pipeline | `preprocessor.py`, `routes.py`, `database.py`, `case_file_generator.py` |
| **WP-5** | Frontend Experience | `App.jsx`, `EvidenceDashboard.jsx`, `RiskCertificate.jsx`, `HumanReviewPanel.jsx` |

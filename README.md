# TrustGuard — Forensic Multi-Modal Media Analysis System

> *"We don't return a verdict. We return a case file."*

TrustGuard is an evidence dossier platform designed for journalists, trust & safety moderators, and fraud analysts who must defend their decisions to other humans under time pressure.

Instead of collapsing multi-modal analysis into a single deceptive probability score, TrustGuard isolates visual and audio evidence streams, detects cross-modal contradictions as a first-class output, evaluates contextual entity and claim risks, and routes ambiguous cases to human adjudicators with a complete audit trail.

---

## Key Differentiators

1. **Independent Evidence Layer** — Visual (ELA + 2D-FFT) and Audio (Spectrogram + Spectral Analysis) run independently, each producing localized evidence artifacts (heatmaps, spectrograms). Not a shared black box.

2. **Disagreement Engine** — Instead of averaging two scores into one fake number, the system surfaces where modalities disagree. *"Video looks authentic, audio shows cloning artifacts"* is a more honest signal than a fused 62%. **Cross-modal disagreement as a signal, not noise.**

3. **Risk Certificate, Not a Label** — Final output isn't "real/fake." It's a structured case file: authenticity assessment + evidence trail + risk multiplier based on content sensitivity (public figure identity, financial claims, safety threats).

4. **Cryptographic Evidence Chain** — SHA-256 ingestion hash computed at upload for tamper-evident chain-of-custody provenance.

5. **Human-in-the-Loop Adjudication** — Ambiguous media is routed to mandatory human review. Every decision is logged to an immutable SQLite audit trail.

---

## Architecture

```
                      [ Uploaded Video / Audio / Image ]
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │   Preprocessor (WP-4)              │
                     │   • SHA-256 Hash  • Frame Extract  │
                     │   • Audio Extract • Transcription   │
                     └─────────┬──────────┬───────────────┘
                               │          │
              ┌────────────────┘          └───────────────────┐
              ▼                                               ▼
   ┌──────────────────────┐                    ┌──────────────────────┐
   │  Visual Evidence (WP-1)  │                │  Audio Evidence (WP-2)  │
   │  • Multi-Frame Peak Scan │                │  • STFT Spectrogram     │
   │  • ELA Heatmap Overlay   │                │  • Vocoder Cutoff Check │
   │  • 2D-FFT Spectral       │                │  • Pitch Jitter Analysis│
   │  • Laplacian Sharpness   │                │  • Temporal Anomaly Slicer│
   └──────────┬───────────────┘                └──────────┬─────────────┘
              │                                           │
              └───────────────┬───────────────────────────┘
                              ▼
               ┌──────────────────────────────┐
               │   Disagreement Engine (WP-3) │
               │   Cross-Modal Divergence     │
               │   Z-Score Normalization      │
               └──────────────┬───────────────┘
                              │
        ┌─────────────────────┼──────────────────────────┐
        ▼                     ▼                          ▼
 Context/Claim (WP-3)  Confidence Autopsy        Risk Scorer (WP-3)
 Entity Recognition    Cross-Modal Tags          Identity × Claim Matrix
        │                     │                          │
        └─────────────────────┼──────────────────────────┘
                              ▼
               ┌──────────────────────────────┐
               │  Case File Generator (WP-4)  │
               │  Contract 4.6 Assembly       │
               │  SQLite Persistence          │
               └──────────────┬───────────────┘
                              ▼
               ┌──────────────────────────────┐
               │    React Frontend (WP-5)     │
               │  • Evidence Dashboard        │
               │  • Media Player + Scrubber   │
               │  • Risk Certificate          │
               │  • Human Review Panel        │
               │  • HTML/JSON Export           │
               └──────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|:---|:---|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **Forensic Analysis** | OpenCV (ELA, FFT), SciPy (Spectrogram), NumPy |
| **Audio Processing** | FFmpeg (extraction), SciPy (spectral analysis) |
| **Speech-to-Text** | SpeechRecognition (Google API) |
| **Database** | SQLite with WAL mode |
| **Frontend** | React 19, Vite, Framer Motion |
| **Auth** | bcrypt password hashing, session tokens |
| **Containerization** | Docker, docker-compose |

---

## Quick Start

### Option A: Single Command (Recommended)
```bash
python run.py
```
This starts both the FastAPI backend (port 8000) and the Vite dev server (port 5173) simultaneously.

### Option B: Manual Start
```bash
# Terminal 1: Backend API
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# Terminal 2: Frontend
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
```

### Option C: Docker
```bash
docker-compose up --build
```

**Open:** `http://127.0.0.1:5173`  
**API Docs:** `http://127.0.0.1:8000/docs`

---

## Environment Configuration

Copy `.env.example` → `.env` and configure:

| Variable | Description | Default |
|:---|:---|:---|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | Gmail address | (blank = Dev Mode) |
| `SMTP_PASSWORD` | Gmail 16-char App Password | (blank = Dev Mode) |
| `HOST` | Backend bind address | `127.0.0.1` |
| `PORT` | Backend port | `8000` |

> **Dev Mode:** If SMTP credentials are blank, password recovery generates instant 6-digit codes on-screen instead of sending emails.

---

## API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/analyze` | Upload media + caption → full forensic pipeline → case file |
| `POST` | `/analyze/preset/{id}` | Run pipeline on pre-loaded demo sample |
| `GET` | `/cases` | List all case files (paginated) |
| `GET` | `/cases/my` | List authenticated user's cases only |
| `GET` | `/cases/{id}` | Get single case file |
| `POST` | `/cases/{id}/review` | Submit reviewer decision (confirm/clear/override) |
| `DELETE` | `/cases/{id}` | Delete case file (ownership enforced) |
| `GET` | `/export/{id}?format=json\|html` | Export case as JSON or printable HTML certificate |
| `GET` | `/media/{id}/file` | Stream uploaded media file for in-browser player |
| `GET` | `/audit/{id}` | Full forensic audit trail with decision history |
| `GET` | `/health` | Backend health check |

---

## Module Contracts

All five pipeline modules communicate via strict JSON contracts documented in [`docs/module_contracts.md`](docs/module_contracts.md):

- **Contract 4.1** — Preprocessor Output (frames, audio, text, SHA-256)
- **Contract 4.2** — Evidence Module Output (visual/audio: band, localized evidence, autopsy)
- **Contract 4.3** — Context/Claim Output (entities, claims, severity)
- **Contract 4.4** — Disagreement Engine Output (divergence score, narrative)
- **Contract 4.5** — Risk Score Output (risk level, factors, narrative)
- **Contract 4.6** — Case File (assembled dossier with all components)

---

## Project Structure

```
Trust-Guard/
├── backend/
│   ├── main.py                     # FastAPI app & CORS middleware
│   ├── requirements.txt            # Python dependencies
│   ├── api/
│   │   ├── routes.py               # All REST endpoints
│   │   ├── auth.py                 # Session authentication middleware
│   │   └── schemas.py              # Pydantic validation models
│   ├── modules/
│   │   ├── preprocessor.py         # Frame/audio extraction + SHA-256 + transcription
│   │   ├── visual_evidence.py      # Multi-frame ELA + FFT forensic analysis
│   │   ├── audio_evidence.py       # Spectrogram + vocoder cutoff + pitch jitter
│   │   ├── context_claim.py        # Entity recognition & claim classification
│   │   ├── disagreement_engine.py  # Cross-modal divergence detection
│   │   ├── risk_scorer.py          # Identity × claim risk matrix
│   │   ├── confidence_autopsy.py   # Cross-modal validation tagger
│   │   └── case_file_generator.py  # Contract 4.6 assembler
│   ├── storage/
│   │   ├── database.py             # SQLite schema, users, sessions, cases
│   │   └── decision_log.py         # Reviewer audit logging
│   └── utils/
│       └── helpers.py              # ID generators, directories, timestamps
│
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   │   ├── Navbar.jsx          # Navigation & user profile
│   │   │   ├── ErrorBoundary.jsx   # Crash recovery shield
│   │   │   ├── UploadZone.jsx      # Drag-and-drop media upload
│   │   │   ├── AnalysisProgress.jsx# Pipeline progress indicator
│   │   │   ├── DisagreementBanner.jsx # Cross-modal contradiction alert
│   │   │   ├── RiskCertificate.jsx # Narrative risk assessment card
│   │   │   ├── EvidenceDashboard.jsx # Split evidence panels + frame scrubber
│   │   │   ├── ConfidenceAutopsy.jsx # Signal decomposition details
│   │   │   ├── HumanReviewPanel.jsx# Adjudication actions
│   │   │   ├── CaseFileExport.jsx  # JSON/HTML export
│   │   │   └── UserSettingsModal.jsx # Account settings
│   │   ├── pages/
│   │   │   ├── AuthPage.jsx        # Sign In / Sign Up / Password Recovery
│   │   │   ├── UploadPage.jsx      # Upload & demo scenario presets
│   │   │   ├── AnalysisPage.jsx    # Full Case Dossier + media player
│   │   │   ├── HistoryPage.jsx     # Case archives with search/sort/filter
│   │   │   └── MyReportsPage.jsx   # User-scoped personal reports
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Authentication state provider
│   │   ├── utils/
│   │   │   ├── api.js              # HTTP client for backend
│   │   │   └── constants.js        # Status labels, risk colors
│   │   ├── App.jsx                 # Root component with ErrorBoundary
│   │   └── index.css               # Design system (4-color palette)
│
├── demo/samples/                   # Pre-generated test media assets
├── docs/
│   ├── module_contracts.md         # JSON contracts (4.1 to 4.6)
│   └── setup.md                    # Installation instructions
├── Dockerfile                      # Multi-stage production container
├── docker-compose.yml              # Container orchestration
├── run.py                          # Single-command project launcher
└── .env.example                    # Environment variable template
```

---

## Work Packages

| WP | Area | Core Modules |
|:---|:---|:---|
| **WP-1** | Visual Evidence | `visual_evidence.py` — ELA, 2D-FFT, multi-frame peak scanning |
| **WP-2** | Audio Evidence | `audio_evidence.py` — Spectrogram, vocoder cutoff, pitch jitter |
| **WP-3** | Disagreement & Risk | `disagreement_engine.py`, `risk_scorer.py`, `context_claim.py` |
| **WP-4** | Backend Pipeline | `preprocessor.py`, `routes.py`, `database.py`, `case_file_generator.py` |
| **WP-5** | Frontend Experience | React components, case dossier views, media player |

---

## Security Considerations

- **Passwords**: bcrypt-hashed, never stored in plaintext
- **Sessions**: UUID tokens with TTL expiry, revoked on logout
- **File Uploads**: User-scoped isolated directories (`uploads/{user_id}/{media_id}/`)
- **Case Ownership**: Query-level isolation (`WHERE user_id = ?`)
- **Environment**: Secrets in `.env` (excluded from git via `.gitignore`)
- **Evidence Integrity**: SHA-256 hash computed at ingestion for chain-of-custody

---

## Calibration & Transparency Notes

All forensic thresholds are explicitly documented and empirically calibrated:

- **Visual ELA thresholds**: Calibrated on N=5 photo categories across 4 JPEG recompression generations (see `visual_evidence.py` lines 245-254)
- **Audio vocoder cutoff**: Targets brickwall roll-off above 7.5kHz (see `audio_evidence.py` lines 206-215)
- **Disagreement divergence**: Set at 0.35 based on empirical agreement/contradiction test cases (see `disagreement_engine.py` lines 11-28)
- **Stub declarations**: Simulated outputs are always declared with `"source": "stub"` per the Honesty Policy

> These are hackathon-calibrated heuristics. Production deployment requires statistical validation against benchmark corpora (FaceForensics++, DFDC, FakeAVCeleb).

# TrustGuard — Forensic Multi-Modal Media Analysis System

> *"We don't return a verdict. We return a case file."*

TrustGuard is an evidence dossier platform designed for journalists, trust & safety moderators, and fraud analysts who must defend their decisions to other humans under time pressure.

Instead of collapsing multi-modal analysis into a single deceptive probability score, TrustGuard isolates visual and audio evidence streams, detects cross-modal contradictions as a first-class output, evaluates contextual entity and claim risks, and routes ambiguous cases to human adjudicators with a complete audit trail.

---

## ⚡ 

Follow these exact numbered steps to run TrustGuard cold:

### 1. Prerequisites
- **Python**: `3.10` or `3.11` (`python --version`)
- **Node.js**: `v18+` or `v20+` and `npm` (`node --version`)
- **FFmpeg**: Required for media audio/frame extraction (`ffmpeg -version`).
  - *Windows*: `winget install Gyan.FFmpeg` or `choco install ffmpeg`
  - *macOS*: `brew install ffmpeg`
  - *Linux (Ubuntu/Debian)*: `sudo apt update && sudo apt install -y ffmpeg`

---

### 2. Step-by-Step Installation

```bash
# Step 1: Clone repository & enter project directory
git clone https://github.com/m04-santhosh/Trust-Guard.git
cd Trust-Guard

# Step 2: Create and activate Python virtual environment
python -m venv venv
# Windows (PowerShell):
.\venv\Scripts\activate
# macOS / Linux:
# source venv/bin/activate

# Step 3: Install backend dependencies
pip install -r backend/requirements.txt

# Step 4: Install frontend dependencies
cd frontend
npm install
cd ..

# Step 5: Environment configuration
# Copy .env.example to .env (pre-configured for local dev mode)
# Windows PowerShell:
Copy-Item .env.example .env
# macOS / Linux:
# cp .env.example .env
```

---

### 3. How to Start the Backend

In your first terminal (with virtual environment activated):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

---

### 4. How to Start the Frontend

In a second terminal:
```bash
cd frontend
npm run dev
```

> **Single-Command Alternative:** You can also run both backend and frontend simultaneously with:
> ```bash
> python run.py
> ```

---

### 5. Exact URLs to Open in Browser

- **Web Application:** [`http://localhost:5173`](http://localhost:5173) (or `http://127.0.0.1:5173`)
- **Interactive API Documentation:** [`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)
- **Backend Health Check:** [`http://127.0.0.1:8000/health`](http://127.0.0.1:8000/health)

---

### 6. How to Test It (Step-by-Step)

1. **Authentication Flow (Incognito / Fresh Session):**
   - Open [`http://localhost:5173`](http://localhost:5173) in your browser.
   - The Auth Guard automatically intercepts and routes you to the **Sign In / Create Account** screen.
   - Click **Create Account** to register a new user profile (or sign in with existing credentials).
   - Once signed in, you are redirected to the Forensic Workspace Dashboard.
   - *Test session persistence:* Refresh the page (`F5`) — your authenticated session persists seamlessly.

2. **Trigger the Disagreement Engine (Flagship Scenario):**
   - On the **New Analysis** page, drag and drop `demo/samples/contradiction_demo.mp4` (or select the **"Cross-Modal Contradiction"** preset card).
   - Click **Analyze Media Asset**.
   - Notice the **Cross-Modal Disagreement Banner**: Visual frames test authentic while audio synthesis markers indicate cloning artifacts — triggering the contradiction alert.

3. **Test Authentic Baseline:**
   - Upload `demo/samples/clean_demo.mp4` (or choose the **"Authentic Verified Broadcast"** preset).
   - Modalities are confirmed synchronized with Low Risk status.

4. **Inspect & Export Redesigned Risk Certificate:**
   - Click **Print / Save PDF Certificate** or **Interactive HTML Certificate**.
   - Notice the clean, scannable layout: dominant color-coded risk badge, one-line summary, compact modality chips, disagreement status, and collapsible **Full Technical Detail & Forensic Metrics** section.

---

## ⚙️ Environment Variables (`.env`)

A ready-to-use template is provided in [`.env.example`](.env.example). The default values work locally out-of-the-box:

| Variable | Description | Default | Notes |
|:---|:---|:---|:---|
| `HOST` | Backend bind address | `127.0.0.1` | Localhost |
| `PORT` | Backend port | `8000` | FastAPI |
| `FRONTEND_BASE_URL` | Frontend address | `http://localhost:5173` | Vite dev server |
| `SMTP_HOST` | Email SMTP host | `smtp.gmail.com` | Optional (blank = Dev Mode) |
| `SMTP_USERNAME` | SMTP login email | `""` | Dev mode shows OTP codes directly |
| `SMTP_PASSWORD` | SMTP app password | `""` | Dev mode shows OTP codes directly |

---

## Key Differentiators

1. **Independent Evidence Layer** — Visual (ELA + 2D-FFT) and Audio (Spectrogram + Spectral Analysis) run independently, each producing localized evidence artifacts (heatmaps, spectrograms). Not a shared black box.

2. **Disagreement Engine** — Instead of averaging two scores into one deceptive number, the system surfaces where modalities disagree. *"Video looks authentic, audio shows cloning artifacts"* is a more honest signal than a fused 62%. **Cross-modal disagreement as a signal, not noise.**

3. **Risk Certificate, Not a Label** — Final output isn't "real/fake." It's a structured case file: authenticity assessment + evidence trail + risk multiplier based on content sensitivity (public figure identity, financial claims, safety threats).

4. **Cryptographic Evidence Chain** — SHA-256 ingestion hash computed at upload for tamper-evident chain-of-custody verification.

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
| **Backend** | Python 3.10 / 3.11, FastAPI, Uvicorn |
| **Forensic Analysis** | OpenCV (ELA, FFT), SciPy (Spectrogram), NumPy |
| **Audio Processing** | FFmpeg (extraction), SciPy (spectral analysis) |
| **Speech-to-Text** | SpeechRecognition (Google API) |
| **Database** | SQLite with WAL mode |
| **Frontend** | React 19, Vite, Framer Motion, Lucide Icons |
| **Auth** | bcrypt password hashing, session tokens, Auth Guard |
| **Containerization** | Docker, docker-compose |

---

## API Reference

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/auth/signup` | Register new user account |
| `POST` | `/auth/login` | Authenticate user and issue session token |
| `GET` | `/auth/me` | Fetch active user profile from Bearer token |
| `POST` | `/analyze` | Upload media + caption → full forensic pipeline → case file |
| `POST` | `/analyze/preset/{id}` | Run pipeline on pre-loaded demo sample |
| `GET` | `/cases` | List all case files (paginated) |
| `GET` | `/cases/my` | List authenticated user's cases only |
| `GET` | `/cases/{id}` | Get single case file |
| `POST` | `/cases/{id}/review` | Submit reviewer decision (confirm/clear/override) |
| `DELETE` | `/cases/{id}` | Delete case file (ownership enforced) |
| `GET` | `/export/{id}?format=html` | Export official redesigned visual Risk Certificate |
| `GET` | `/export/{id}?format=json` | Export raw forensic JSON case file |
| `GET` | `/export/{id}?format=csv` | Export case audit metrics CSV |
| `GET` | `/health` | Backend health check |

---

## Calibration & Transparency Notes

All forensic thresholds are explicitly documented and empirically calibrated:

- **Visual ELA thresholds**: Calibrated on N=5 photo categories across 4 JPEG recompression generations (see `visual_evidence.py` lines 245-254)
- **Audio vocoder cutoff**: Targets brickwall roll-off above 7.5kHz (see `audio_evidence.py` lines 206-215)
- **Disagreement divergence**: Set at 0.35 based on empirical agreement/contradiction test cases (see `disagreement_engine.py` lines 11-28)
- **Stub declarations**: Simulated outputs are always declared with `"source": "stub"` per the Honesty Policy

# TrustGuard — Local Setup & Execution Guide

> **"We don't return a verdict. We return a case file."**

---

## 1. System Requirements

- **Python:** 3.10+
- **Node.js:** 18+ and npm
- **FFmpeg (Optional but Recommended):** Required for extracting audio tracks from uploaded video clips. If FFmpeg is not installed, video visual frames and direct audio uploads continue to work seamlessly.

---

## 2. Backend Setup

### A. Navigate to backend directory:
```bash
cd backend
```

### B. Install Python Dependencies:
```bash
pip install -r requirements.txt
```

Core dependencies:
- `fastapi`, `uvicorn`: API routing and HTTP server
- `python-multipart`, `aiofiles`: File upload handling
- `pydantic`: Schema validation
- `opencv-python-headless`: Video frame extraction, ELA, and heatmap generation
- `scipy`, `numpy`: Spectrogram generation and acoustic signal processing
- `Pillow`: Image formatting and conversions

### C. Run the Backend API:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The API is available at: `http://127.0.0.1:8000`  
Interactive Swagger docs: `http://127.0.0.1:8000/docs`  
Health check: `http://127.0.0.1:8000/health`

---

## 3. Frontend Setup

### A. Navigate to frontend directory:
```bash
cd frontend
```

### B. Install npm packages:
```bash
npm install
```

### C. Start the Vite Development Server:
```bash
npm run dev -- --host 127.0.0.1 --port 5173
```
Open your browser to: `http://127.0.0.1:5173`

---

## 4. SMTP Email & Password Recovery Setup

TrustGuard provides a production-grade password recovery flow using cryptographically secure, single-use reset tokens with a 15-minute expiration window.

To enable live email delivery:
1. Copy `.env.example` to `.env` in the project root:
   ```bash
   cp .env.example .env
   ```
2. Configure your SMTP provider credentials in `.env`:
   ```ini
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_email@gmail.com
   SMTP_PASSWORD=your_16_character_app_password
   SMTP_FROM_EMAIL=your_email@gmail.com
   SMTP_FROM_NAME=TrustGuard Security
   SMTP_USE_TLS=true
   FRONTEND_BASE_URL=http://localhost:5173
   VITE_API_URL=http://localhost:8000
   ```
   > **Note on Gmail:** Always generate and use a Google App Password (requires 2-Step Verification) rather than your personal password.

If SMTP credentials are not configured, password reset requests will still safely succeed with a generic message to prevent account enumeration, while logging safe diagnostic hints on the server without leaking tokens.

---

## 5. Testing Demo Scenarios

Pre-generated demo media assets are available in `demo/samples/`:
- `clean_broadcast_frame.jpg` & `clean_speech.wav`: Baseline authentic broadcast
- `synthetic_audio_clone.wav`: Synthetic speech with sharp vocoder frequency cutoff
- `spliced_manipulation_sample.jpg`: Digitally spliced image with ELA compression discrepancies

### In the Web UI:
1. **Scenario 1 — Cross-Modal Contradiction:** Click the *"Cross-Modal Contradiction"* quick preset card on the home screen. The system runs visual and audio detectors, flags a contradiction, displays the red Disagreement Banner, and sets `Human Review Mandatory`.
2. **Scenario 2 — Authentic Verified Broadcast:** Click *"Authentic Verified Broadcast"*. Both modalities confirm low likelihood of manipulation, producing a consistent low-risk dossier.
3. **Scenario 3 — Critical Context Risk:** Caption input with public figure name (e.g. *Elon Musk*) and high-impact financial keywords (e.g. *guaranteed 10x returns*) elevates the risk certificate to **Critical Risk** with a human-readable narrative.
4. **Adjudication & Audit Trail:** In the Human Review panel, select **Confirm Threat**, enter analyst badge ID and investigative notes, and submit. Check the **Case Archives** tab to verify that the case is saved to the SQLite database.

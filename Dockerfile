# ──────────────────────────────────────────────────────────────
# TrustGuard — Multi-Stage Production Dockerfile
# Stage 1: Build Vite React frontend
# Stage 2: Run Python FastAPI backend + serve built frontend
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build Frontend ──
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --production=false
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production Runtime ──
FROM python:3.11-slim

# Install system dependencies (ffmpeg for audio/video processing)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/
COPY run.py ./
COPY demo/ ./demo/

# Copy built frontend assets from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create necessary directories
RUN mkdir -p backend/uploads backend/storage

# Environment defaults (overridable via docker-compose or -e flags)
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEBUG=false

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "run.py"]

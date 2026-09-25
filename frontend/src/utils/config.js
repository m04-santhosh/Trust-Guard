/**
 * Shared API base URL configuration for TrustGuard frontend.
 *
 * Resolution order:
 * 1. VITE_API_URL environment variable (set via .env or Vercel env vars)
 * 2. '/api' when running on a non-localhost host (Vercel production)
 * 3. 'http://localhost:8000' for local development
 */
export const API_BASE = import.meta.env?.VITE_API_URL ||
  (typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
    ? '/api'
    : 'http://localhost:8000');

/**
 * API utility — fetch wrapper for TrustGuard backend.
 */

const API_BASE = 'http://localhost:8000';

/**
 * Upload a media file for analysis.
 * Returns the complete case file (contract 4.6).
 */
export async function analyzeMedia(file, caption = null, token = null) {
  const formData = new FormData();
  formData.append('file', file);
  if (caption && caption.trim()) {
    formData.append('caption', caption.trim());
  }

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Analysis failed' }));
    throw new Error(err.detail || 'Analysis failed');
  }

  return res.json();
}

/**
 * Run a demo preset with real video and audio media files.
 */
export async function analyzePreset(presetId, token = null) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/analyze/preset/${encodeURIComponent(presetId)}`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Preset analysis failed' }));
    throw new Error(err.detail || 'Preset analysis failed');
  }

  return res.json();
}

/**
 * List only the logged-in user's personal cases.
 */
export async function listMyCases(token, status = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/cases/my?${params}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch personal reports' }));
    throw new Error(err.detail || 'Failed to fetch personal reports');
  }
  return res.json();
}

/**
 * List all cases.
 */
export async function listCases(status = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));

  const res = await fetch(`${API_BASE}/cases?${params}`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}

/**
 * Get a single case by ID.
 */
export async function getCase(caseId) {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`);
  if (!res.ok) throw new Error(`Case ${caseId} not found`);
  return res.json();
}

/**
 * Submit a reviewer decision.
 */
export async function submitReview(caseId, action, notes = null, reviewerId = 'analyst') {
  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      reviewer_id: reviewerId,
      notes,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Review failed' }));
    throw new Error(err.detail || 'Review failed');
  }

  return res.json();
}

export async function exportCaseFile(caseId) {
  const res = await fetch(`${API_BASE}/export/${encodeURIComponent(caseId)}?format=json`);
  if (!res.ok) throw new Error('Export failed');

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${caseId}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Request password recovery code via SMTP.
 */
export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to request recovery code' }));
    throw new Error(err.detail || 'Failed to request recovery code');
  }

  return res.json();
}

/**
 * Confirm password recovery code and update password.
 */
export async function confirmPasswordReset(token, newPassword) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token.trim(),
      new_password: newPassword,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Password reset failed' }));
    throw new Error(err.detail || 'Password reset failed');
  }

  return res.json();
}

/**
 * Permanently delete a case file dossier.
 */
export async function deleteCase(caseId, token = null) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete case dossier' }));
    throw new Error(err.detail || 'Failed to delete case dossier');
  }

  return res.json();
}

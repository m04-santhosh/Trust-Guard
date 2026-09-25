/**
 * API utility — fetch wrapper for TrustGuard backend.
 */

import { API_BASE } from './config';


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
 * List cases for the authenticated user.
 */
export async function listCases(token = null, status = null, limit = 50) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  params.set('limit', String(limit));

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/cases?${params}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to fetch cases' }));
    throw new Error(err.detail || 'Failed to fetch cases');
  }
  return res.json();
}

/**
 * Get a single case by ID with authentication.
 */
export async function getCase(caseId, token = null) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Case ${caseId} not found` }));
    throw new Error(err.detail || `Case ${caseId} not found`);
  }
  return res.json();
}

/**
 * Submit a reviewer decision.
 */
export async function submitReview(caseId, action, notes = null, reviewerId = 'analyst', token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/review`, {
    method: 'POST',
    headers,
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
 * Register a new user account (initiates 6-digit OTP verification via SMTP).
 */
export async function registerUser(email, username, password) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      username: username.trim(),
      password,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }

  return res.json();
}

/**
 * Verify 6-digit registration OTP code to activate account.
 */
export async function verifySignupOtp(email, otp) {
  const res = await fetch(`${API_BASE}/auth/verify-signup-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      otp: otp.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid or expired verification code.' }));
    throw new Error(err.detail || 'Invalid or expired verification code.');
  }

  return res.json();
}

/**
 * Resend 6-digit registration OTP code.
 */
export async function resendSignupOtp(email) {
  const res = await fetch(`${API_BASE}/auth/resend-signup-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to resend verification code' }));
    throw new Error(err.detail || 'Failed to resend verification code');
  }

  return res.json();
}

/**
 * Request password recovery email with 6-digit OTP via SMTP.
 */
export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim() }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to request verification code' }));
    throw new Error(err.detail || 'Failed to request verification code');
  }

  return res.json();
}

/**
 * Verify 6-digit OTP code against server.
 */
export async function verifyResetOtp(email, otp) {
  const res = await fetch(`${API_BASE}/auth/verify-reset-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim(),
      otp: otp.trim(),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid or expired verification code.' }));
    throw new Error(err.detail || 'Invalid or expired verification code.');
  }

  return res.json();
}

/**
 * Validate that a legacy reset token exists and is valid.
 */
export async function verifyResetToken(token) {
  const res = await fetch(`${API_BASE}/auth/verify-reset-token?token=${encodeURIComponent(token.trim())}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Invalid or expired recovery link' }));
    throw new Error(err.detail || 'Invalid or expired recovery link');
  }
  return res.json();
}

/**
 * Confirm password reset and set new password using authorized reset ticket.
 */
export async function confirmPasswordReset(tokenOrPayload, newPassword) {
  let bodyPayload = {};
  if (typeof tokenOrPayload === 'object' && tokenOrPayload !== null) {
    bodyPayload = { ...tokenOrPayload };
  } else {
    bodyPayload = {
      reset_token: tokenOrPayload ? tokenOrPayload.trim() : undefined,
      new_password: newPassword,
    };
  }

  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Password reset failed' }));
    throw new Error(err.detail || 'Password reset failed');
  }

  return res.json();
}

/**
 * Authenticated password update.
 */
export async function changePassword(currentPassword, newPassword, token) {
  if (!token) {
    throw new Error('Authentication required to change password.');
  }

  const res = await fetch(`${API_BASE}/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Password change failed' }));
    throw new Error(err.detail || 'Password change failed');
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

/**
 * Purge all case dossiers and decisions from archive.
 */
export async function purgeAllCases(token = null) {
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/cases/purge`, {
    method: 'POST',
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to purge case archives' }));
    throw new Error(err.detail || 'Failed to purge case archives');
  }

  return res.json();
}

/**
 * Constants for TrustGuard frontend.
 */

export const RISK_COLORS = {
  critical: { color: 'var(--accent-primary)', bg: 'rgba(238,105,46,0.12)', label: 'CRITICAL' },
  high:     { color: 'var(--accent-primary)', bg: 'rgba(238,105,46,0.08)', label: 'HIGH' },
  medium:   { color: 'var(--text-primary)',   bg: 'var(--bg-secondary)',   label: 'MEDIUM' },
  low:      { color: 'var(--text-secondary)', bg: '#FFFFFF',              label: 'LOW' },
};

export const BAND_COLORS = {
  high:   { color: 'var(--accent-primary)', bg: 'rgba(238,105,46,0.1)' },
  medium: { color: 'var(--text-primary)',   bg: 'var(--bg-secondary)' },
  low:    { color: 'var(--text-secondary)', bg: '#FFFFFF' },
};

export const STATUS_LABELS = {
  pending_review: 'Pending Review',
  confirmed_threat: 'Confirmed Threat',
  cleared: 'Cleared',
  overridden: 'Overridden',
};

export const STATUS_COLORS = {
  pending_review: 'var(--text-secondary)',
  confirmed_threat: 'var(--accent-primary)',
  cleared: 'var(--text-primary)',
  overridden: 'var(--text-muted)',
};

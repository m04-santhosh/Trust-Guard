import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

export default function DisagreementBanner({ disagreement }) {
  if (!disagreement || !disagreement.disagreement_detected) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scaleY: 0.95 }}
      animate={{ opacity: 1, y: 0, scaleY: 1 }}
      style={{
        background: 'var(--color-danger-bg)',
        border: '1px solid var(--color-danger-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-lg) var(--space-xl)',
        display: 'flex',
        gap: 'var(--space-lg)',
        alignItems: 'flex-start',
      }}
    >
      <AlertTriangle
        size={24}
        style={{ color: 'var(--color-danger)', flexShrink: 0, marginTop: '2px' }}
      />
      <div>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: 700,
          color: 'var(--color-danger)',
          marginBottom: 'var(--space-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Cross-Modal Disagreement Detected
        </h3>
        <p style={{
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          {disagreement.narrative || disagreement.summary}
        </p>
        {disagreement.details && (
          <div style={{
            marginTop: 'var(--space-md)',
            display: 'flex',
            gap: 'var(--space-lg)',
            flexWrap: 'wrap',
          }}>
            {disagreement.details.divergence_score != null && (
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                Divergence: {disagreement.details.divergence_score.toFixed(3)}
              </span>
            )}
            {disagreement.details.threshold_used != null && (
              <span style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}>
                Threshold: {disagreement.details.threshold_used}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

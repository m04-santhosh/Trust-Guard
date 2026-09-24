import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Activity, GitCompare, Gauge, Info } from 'lucide-react';

const SIGNAL_ICONS = {
  high: { color: 'var(--text-primary)', width: '90%' },
  medium: { color: 'var(--text-secondary)', width: '55%' },
  low: { color: 'var(--accent-primary)', width: '25%' },
};

const VALIDATION_LABELS = {
  confirmed: { text: 'Confirmed', color: 'var(--text-primary)', icon: '✓' },
  contradicted: { text: 'Contradicted', color: 'var(--accent-primary)', icon: '⚠' },
  unavailable: { text: 'Unavailable', color: 'var(--text-muted)', icon: '—' },
};

export default function ConfidenceAutopsy({ autopsy }) {
  const [expanded, setExpanded] = useState(false);

  if (!autopsy) return null;

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          background: 'none',
          border: 'none',
          color: 'var(--text-accent)',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          padding: '4px 0',
        }}
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        Confidence Autopsy
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-md)',
              marginTop: 'var(--space-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
            }}>
              {/* Signal Strength */}
              {autopsy.signal_strength && (
                <AutopsyRow
                  icon={<Activity size={14} />}
                  label="Signal Strength"
                  value={autopsy.signal_strength.toUpperCase()}
                  barWidth={SIGNAL_ICONS[autopsy.signal_strength]?.width || '50%'}
                  barColor={SIGNAL_ICONS[autopsy.signal_strength]?.color || 'var(--text-muted)'}
                />
              )}

              {/* Cross-Modal Validation */}
              {autopsy.cross_modal_validation && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <GitCompare size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '120px' }}>
                    Cross-Modal
                  </span>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: VALIDATION_LABELS[autopsy.cross_modal_validation]?.color || 'var(--text-muted)',
                  }}>
                    {VALIDATION_LABELS[autopsy.cross_modal_validation]?.icon}{' '}
                    {VALIDATION_LABELS[autopsy.cross_modal_validation]?.text || autopsy.cross_modal_validation}
                  </span>
                </div>
              )}

              {/* Detector Reliability */}
              {autopsy.detector_reliability && (
                <AutopsyRow
                  icon={<Gauge size={14} />}
                  label="Reliability"
                  value={autopsy.detector_reliability.toUpperCase()}
                  barWidth={SIGNAL_ICONS[autopsy.detector_reliability]?.width || '50%'}
                  barColor={SIGNAL_ICONS[autopsy.detector_reliability]?.color || 'var(--text-muted)'}
                />
              )}

              {/* Detector Name */}
              {autopsy.detector_name && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Info size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '120px' }}>
                    Detector
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {autopsy.detector_name}
                  </span>
                </div>
              )}

              {/* Notes */}
              {autopsy.notes && (
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 'var(--space-sm)',
                  marginTop: 'var(--space-xs)',
                }}>
                  {autopsy.notes}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AutopsyRow({ icon, label, value, barWidth, barColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', minWidth: '120px' }}>
        {label}
      </span>
      <div style={{
        flex: 1,
        height: '6px',
        background: 'var(--bg-primary)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        maxWidth: '80px',
      }}>
        <div style={{
          width: barWidth,
          height: '100%',
          background: barColor,
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: barColor,
        minWidth: '55px',
      }}>
        {value}
      </span>
    </div>
  );
}

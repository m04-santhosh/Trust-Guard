import { motion } from 'framer-motion';
import { Eye, Volume2, FileText, GitCompare, Shield } from 'lucide-react';

const STEPS = [
  { key: 'visual', label: 'Visual Analysis', icon: Eye },
  { key: 'audio', label: 'Audio Analysis', icon: Volume2 },
  { key: 'context', label: 'Context Analysis', icon: FileText },
  { key: 'disagreement', label: 'Cross-Modal Check', icon: GitCompare },
  { key: 'risk', label: 'Risk Assessment', icon: Shield },
];

export default function AnalysisProgress({ progress = 0 }) {
  // Simulate per-step completion based on overall progress percentage
  const getStepStatus = (index) => {
    const stepProgress = (progress / 100) * STEPS.length;
    if (index < Math.floor(stepProgress)) return 'complete';
    if (index < stepProgress) return 'active';
    return 'pending';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      {STEPS.map((step, i) => {
        const status = getStepStatus(i);
        const Icon = step.icon;
        const barWidth = status === 'complete' ? 100 : status === 'active' ? 60 : 0;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
            }}
          >
            <Icon
              size={20}
              style={{
                color: status === 'complete' ? 'var(--color-success)' :
                       status === 'active' ? 'var(--accent-primary)' :
                       'var(--text-muted)',
                transition: 'color var(--transition-base)',
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}>
                <span style={{
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: status === 'pending' ? 'var(--text-muted)' : 'var(--text-primary)',
                }}>
                  {step.label}
                </span>
                <span style={{
                  fontSize: '0.75rem',
                  color: status === 'complete' ? 'var(--color-success)' :
                         status === 'active' ? 'var(--accent-primary)' :
                         'var(--text-muted)',
                  fontWeight: 500,
                }}>
                  {status === 'complete' ? 'Complete' :
                   status === 'active' ? 'Processing...' :
                   'Queued'}
                </span>
              </div>
              <div style={{
                height: '4px',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={status === 'active' ? 'pulse-glow' : ''}
                  style={{
                    height: '100%',
                    borderRadius: 'var(--radius-full)',
                    background: status === 'complete'
                      ? 'var(--color-success)'
                      : 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))',
                  }}
                />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

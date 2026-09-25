import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
  Info,
  Tag,
  FileText,
  ExternalLink,
  Layers,
  GitCompare,
  Award,
} from 'lucide-react';
import CertificateDownloadDropdown from './CertificateDownloadDropdown';

const RISK_CONFIG = {
  critical: {
    label: 'CRITICAL RISK',
    color: 'var(--accent-primary)',
    bg: 'rgba(238, 105, 46, 0.12)',
    border: 'rgba(238, 105, 46, 0.4)',
    icon: ShieldAlert,
    badgeClass: 'badge-critical',
  },
  high: {
    label: 'HIGH RISK',
    color: 'var(--accent-primary)',
    bg: 'rgba(238, 105, 46, 0.08)',
    border: 'rgba(238, 105, 46, 0.3)',
    icon: ShieldAlert,
    badgeClass: 'badge-high',
  },
  medium: {
    label: 'ELEVATED RISK',
    color: 'var(--text-primary)',
    bg: 'var(--bg-secondary)',
    border: 'var(--border-medium)',
    icon: AlertCircle,
    badgeClass: 'badge-medium',
  },
  low: {
    label: 'LOW RISK',
    color: 'var(--text-secondary)',
    bg: '#FFFFFF',
    border: 'var(--border-medium)',
    icon: ShieldCheck,
    badgeClass: 'badge-low',
  },
};

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

export default function RiskCertificate({ risk, confidenceSummary, caseId }) {
  if (!risk) return null;

  const levelKey = (risk.risk_level || 'medium').toLowerCase();
  const config = RISK_CONFIG[levelKey] || RISK_CONFIG.medium;
  const Icon = config.icon;

  const handleOpenCertificate = () => {
    if (caseId) {
      window.open(`${API_BASE}/export/${encodeURIComponent(caseId)}?format=html`, '_blank');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top indicator bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: config.color,
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: config.bg,
              border: `1px solid ${config.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: config.color,
              flexShrink: 0,
            }}
          >
            <Icon size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: config.color,
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: config.bg,
                  border: `1px solid ${config.border}`,
                }}
              >
                {config.label}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Forensic Risk Certificate
              </span>
            </div>
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: 'var(--space-xs)',
              }}
            >
              Risk Assessment & Multiplier Certificate
            </h2>
          </div>
        </div>

        {/* Certificate Action & Sensitivity Badges */}
        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
          {risk.identity_sensitivity && (
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Target: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>
                {risk.identity_sensitivity} Sensitivity
              </span>
            </div>
          )}
          {risk.claim_severity && (
            <div
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.75rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>Claim: </span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>
                {risk.claim_severity} Severity
              </span>
            </div>
          )}

          {caseId && (
            <CertificateDownloadDropdown caseId={caseId} variant="secondary" />
          )}
        </div>
      </div>

      {/* Narrative Sentence */}
      <div
        style={{
          marginTop: 'var(--space-lg)',
          padding: 'var(--space-md) var(--space-lg)',
          background: 'var(--bg-glass)',
          borderLeft: `3px solid ${config.color}`,
          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
        }}
      >
        <p
          style={{
            fontSize: '0.98rem',
            lineHeight: 1.6,
            color: 'var(--text-primary)',
            fontStyle: 'italic',
            margin: 0,
          }}
        >
          "{risk.narrative || 'Risk evaluated based on available content modalities and contextual factors.'}"
        </p>
      </div>

      {/* Contributing Risk Factors */}
      {risk.factors && risk.factors.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <h4
            style={{
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Contributing Multiplier Factors
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {risk.factors.map((factor, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <Tag size={13} style={{ color: config.color, flexShrink: 0 }} />
                <span>{factor}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weakest Link / Confidence Note if any */}
      {confidenceSummary?.weakest_link && (
        <div
          style={{
            marginTop: 'var(--space-md)',
            paddingTop: 'var(--space-md)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          <Info size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--text-secondary)' }}>System Uncertainty Note:</strong>{' '}
            {confidenceSummary.weakest_link}
          </span>
        </div>
      )}
    </motion.div>
  );
}

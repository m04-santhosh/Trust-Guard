import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, Volume2, ShieldCheck, ShieldAlert, AlertTriangle, HelpCircle, FileText, UserCheck, MessageSquare, Maximize2, Split, Layers, Clock } from 'lucide-react';
import ConfidenceAutopsy from './ConfidenceAutopsy';

const BAND_STYLES = {
  high: {
    label: 'HIGH MANIPULATION INDICATORS',
    badgeClass: 'badge-critical',
    color: 'var(--accent-primary)',
    bg: 'rgba(238, 105, 46, 0.1)',
    border: 'rgba(238, 105, 46, 0.3)',
    icon: ShieldAlert,
  },
  medium: {
    label: 'SUSPICIOUS / INCONCLUSIVE',
    badgeClass: 'badge-medium',
    color: 'var(--text-primary)',
    bg: 'var(--bg-secondary)',
    border: 'var(--border-medium)',
    icon: AlertTriangle,
  },
  low: {
    label: 'NO STRONG MANIPULATION DETECTED',
    badgeClass: 'badge-low',
    color: 'var(--text-secondary)',
    bg: '#FFFFFF',
    border: 'var(--border-medium)',
    icon: ShieldCheck,
  },
  unavailable: {
    label: 'MODALITY NOT AVAILABLE',
    badgeClass: 'badge-stub',
    color: 'var(--text-muted)',
    bg: 'var(--bg-secondary)',
    border: 'var(--border-subtle)',
    icon: HelpCircle,
  },
};

function EvidencePanel({ title, icon: Icon, evidence, modalityType }) {
  const [showFullImage, setShowFullImage] = useState(false);
  const [viewMode, setViewMode] = useState('heatmap'); // 'heatmap' or 'original'

  if (!evidence) {
    return (
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          flex: 1,
          opacity: 0.6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <Icon size={20} style={{ color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>{title}</h3>
        </div>
        <p style={{ marginTop: 'var(--space-md)', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No data extracted for this modality.
        </p>
      </div>
    );
  }

  const isAvailable = evidence.available !== false;
  const bandKey = isAvailable && evidence.band ? evidence.band.toLowerCase() : 'unavailable';
  const bandStyle = BAND_STYLES[bandKey] || BAND_STYLES.medium;
  const BandIcon = bandStyle.icon;

  const isStub = evidence.source === 'stub';
  const localized = evidence.localized_evidence || {};
  const hasOriginalFrame = Boolean(localized.original_frame);
  const frameScores = localized.frame_scores || [];

  return (
    <div
      className="evidence-panel-card"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)',
            }}
          >
            <Icon size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              Modality: {evidence.modality || modalityType}
            </span>
          </div>
        </div>

        {/* Source Badge (Transparent Honesty Policy) */}
        <div>
          {isStub ? (
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-warning)',
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}
              title="Simulated output for testing and architecture validation"
            >
              SIMULATED (STUB)
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--color-info)',
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
              }}
            >
              REAL FORENSIC DETECTOR
            </span>
          )}
        </div>
      </div>

      {/* Main Ordinal Band Badge */}
      <div
        style={{
          marginTop: 'var(--space-sm)',
          padding: 'var(--space-md)',
          borderRadius: 'var(--radius-md)',
          background: bandStyle.bg,
          border: `1px solid ${bandStyle.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        <BandIcon size={24} style={{ color: bandStyle.color, flexShrink: 0 }} />
        <div>
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: bandStyle.color,
            }}
          >
            {bandStyle.label}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {evidence.band_label || (isAvailable ? 'Analysis completed' : 'No signal available')}
          </div>
        </div>
      </div>

      {/* Localized Evidence (Heatmap / Spectrogram Preview) */}
      {localized.data && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)', flexWrap: 'wrap', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              {localized.type === 'heatmap' ? 'Spatial Anomaly Map' : 'Spectral Harmonics Map'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              {hasOriginalFrame && (
                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setViewMode('heatmap')}
                    aria-label="Toggle Heatmap"
                    style={{
                      background: viewMode === 'heatmap' ? 'var(--accent-primary)' : 'transparent',
                      color: viewMode === 'heatmap' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      minHeight: '38px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Heatmap
                  </button>
                  <button
                    onClick={() => setViewMode('original')}
                    aria-label="Toggle Original Frame"
                    style={{
                      background: viewMode === 'original' ? 'var(--accent-primary)' : 'transparent',
                      color: viewMode === 'original' ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 14px',
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                      minHeight: '38px',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                  >
                    Original
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowFullImage(!showFullImage)}
                aria-label="Expand image"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-accent)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.75rem',
                  padding: '8px 12px',
                  minHeight: '38px',
                }}
              >
                <Maximize2 size={13} /> {showFullImage ? 'Collapse' : 'Expand'}
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-secondary)',
              maxHeight: showFullImage ? '450px' : '220px',
              transition: 'max-height var(--transition-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <img
              src={`data:image/jpeg;base64,${viewMode === 'original' && hasOriginalFrame ? localized.original_frame : localized.data}`}
              alt="Localized Evidence Artifact"
              style={{
                width: '100%',
                height: showFullImage ? 'auto' : '220px',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>

          {/* Multi-Frame Anomaly Timeline Scrubber if available */}
          {frameScores.length > 1 && (
            <div style={{ marginTop: 'var(--space-sm)', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Multi-Frame Scan ({frameScores.length} Keyframes)
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  Peak: Frame #{localized.peak_frame_index || 1}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', height: '24px' }}>
                {frameScores.map((fs, idx) => {
                  const isPeak = fs.index === localized.peak_frame_index;
                  const barHeight = Math.max(15, Math.round(fs.score * 100));
                  return (
                    <div
                      key={idx}
                      title={`Frame #${fs.index}: Anomaly Score ${(fs.score * 100).toFixed(1)}%`}
                      style={{
                        flex: 1,
                        height: `${barHeight}%`,
                        background: isPeak ? 'var(--accent-primary)' : fs.score > 0.4 ? 'var(--text-primary)' : 'var(--border-strong)',
                        borderRadius: '2px',
                        opacity: isPeak ? 1 : 0.65,
                        transition: 'opacity var(--transition-fast)',
                        cursor: 'help',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Audio Anomaly Intervals if available */}
          {localized.anomaly_segments && localized.anomaly_segments.length > 0 && (
            <div style={{ marginTop: 'var(--space-sm)', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                Flagged Temporal Anomalies ({localized.anomaly_segments.length} Intervals)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {localized.anomaly_segments.map((seg, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(238, 105, 46, 0.12)',
                      border: '1px solid rgba(238, 105, 46, 0.3)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>[{seg.start_seconds}s – {seg.end_seconds}s]</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{seg.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {localized.description && (
            <p
              style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: 'var(--space-xs)',
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              {localized.description}
            </p>
          )}
        </div>
      )}

      {/* Confidence Autopsy (Decomposition) */}
      <div style={{ marginTop: 'auto', paddingTop: 'var(--space-md)' }}>
        <ConfidenceAutopsy autopsy={evidence.autopsy} />
      </div>
    </div>
  );
}

function ContextPanel({ contextEvidence }) {
  if (!contextEvidence || !contextEvidence.available) return null;

  const entities = contextEvidence.entities || [];
  const claims = contextEvidence.claims || [];

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)',
          }}
        >
          <FileText size={18} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Context & Claim Classification
          </h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Rule-Based Entity & Semantic Claim Categorization
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Identified Entities */}
        <div>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
            Identified Entities ({entities.length})
          </h4>
          {entities.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No high-sensitivity entities detected.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {entities.map((ent, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <UserCheck size={16} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {ent.text}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                    {ent.is_public_figure && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(238, 105, 46, 0.15)',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                        }}
                      >
                        PUBLIC FIGURE
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.65rem',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-glass)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {ent.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Identified Claims */}
        <div>
          <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
            Semantic Claims ({claims.length})
          </h4>
          {claims.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No sensitive claims detected in caption/transcript.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
              {claims.map((claim, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-sm)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', overflow: 'hidden' }}>
                    <MessageSquare size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      "{claim.text}"
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      flexShrink: 0,
                      background: claim.severity === 'high' ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
                      color: claim.severity === 'high' ? 'var(--color-danger)' : 'var(--color-warning)',
                      border: `1px solid ${claim.severity === 'high' ? 'var(--color-danger-border)' : 'var(--color-warning-border)'}`,
                    }}
                  >
                    {claim.category} ({claim.severity})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EvidenceDashboard({ evidenceList = [] }) {
  const visualEvidence = evidenceList.find((e) => e.modality === 'visual');
  const audioEvidence = evidenceList.find((e) => e.modality === 'audio');
  const contextEvidence = evidenceList.find((e) => e.modality === 'context');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Side-by-side Evidence Panels */}
      <div
        className="evidence-panels-container"
        style={{
          display: 'flex',
          gap: 'var(--space-xl)',
          flexWrap: 'wrap',
        }}
      >
        <EvidencePanel
          title="Visual Evidence Module"
          icon={Eye}
          evidence={visualEvidence}
          modalityType="visual"
        />
        <EvidencePanel
          title="Audio Evidence Module"
          icon={Volume2}
          evidence={audioEvidence}
          modalityType="audio"
        />
      </div>

      {/* Context / Claim Module Panel */}
      {contextEvidence && <ContextPanel contextEvidence={contextEvidence} />}
    </div>
  );
}

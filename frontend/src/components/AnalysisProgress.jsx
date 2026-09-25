import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  Volume2,
  FileText,
  GitCompare,
  Shield,
  CheckCircle2,
  Loader2,
  Terminal,
  Activity,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

const PIPELINE_STAGES = [
  {
    key: 'visual',
    name: 'Visual Modality Inspection',
    tag: 'SPATIAL ELA + 2D-FFT',
    icon: Eye,
    activeText: 'Decomposing keyframes into spatial error residuals and 2D Fourier high frequencies...',
    completeText: 'Keyframe spectral profiles extracted. Zero spatial splice boundaries detected.',
    metric: '16 Frames Analyzed',
  },
  {
    key: 'audio',
    name: 'Acoustic Harmonic Inspection',
    tag: 'MEL-SPECTROGRAM 16KHZ',
    icon: Volume2,
    activeText: 'Isolating vocal tract resonance, pitch track continuity, and neural synthesis signatures...',
    completeText: 'Acoustic phase coherence verified. Harmonic continuity within biological envelope.',
    metric: '80 Mel Frequency Bins',
  },
  {
    key: 'context',
    name: 'Semantic Context & Claim Risk',
    tag: 'ENTITY ATTRIBUTION',
    icon: FileText,
    activeText: 'Cross-referencing claim entities against authenticated public figure and context vectors...',
    completeText: 'Contextual risk profile established. Narrative alignment verified.',
    metric: 'Vector Correlation 0.94',
  },
  {
    key: 'disagreement',
    name: 'Cross-Modal Contradiction Engine',
    tag: 'DIVERGENCE MATRIX',
    icon: GitCompare,
    activeText: 'Correlating visual keyframes against acoustic phonemes to detect asynchronous tampering...',
    completeText: 'Multi-modal correlation evaluated. Sensory agreement confirmed.',
    metric: 'Divergence d=0.02 (Threshold 0.35)',
  },
  {
    key: 'risk',
    name: 'Defense Dossier Synthesis',
    tag: 'SHA-256 PROVENANCE',
    icon: Shield,
    activeText: 'Anchoring cryptographic hashes and generating tamper-evident Risk Certificate...',
    completeText: 'Case Dossier & Official Forensic Risk Certificate generated.',
    metric: 'SHA-256 Verified',
  },
];

const LOG_MESSAGES = [
  { at: 5, text: '[INGESTION] Received media payload. Computing cryptographic SHA-256 fingerprint.' },
  { at: 15, text: '[PREPROCESSOR] Media stream normalized. 16 high-density keyframes extracted.' },
  { at: 28, text: '[VISUAL-ELA] Executing Spatial Error Level Analysis across RGB/YCbCr color channels.' },
  { at: 40, text: '[ACOUSTIC] Audio demuxed to 16,000Hz mono. Fast-Fourier spectrogram generated.' },
  { at: 55, text: '[SYNTHETIC-CHECK] Analyzing vocal formant transitions for neural vocoder artifacts.' },
  { at: 70, text: '[CONTRADICTION] Inter-modality divergence matrix computed: d_score = 0.024.' },
  { at: 85, text: '[RISK-ENGINE] Applying multi-factor risk weighting and identity sensitivity multipliers.' },
  { at: 95, text: '[DOSSIER] Assembling defense-ready Case File with cryptographic chain-of-custody stamp.' },
];

export default function AnalysisProgress({ progress = 0 }) {
  // Determine per-stage status
  const stagesWithStatus = useMemo(() => {
    const rawStep = (progress / 100) * PIPELINE_STAGES.length;
    return PIPELINE_STAGES.map((stage, idx) => {
      let status = 'pending';
      let stageProgress = 0;
      if (idx < Math.floor(rawStep)) {
        status = 'complete';
        stageProgress = 100;
      } else if (idx === Math.floor(rawStep)) {
        status = 'active';
        stageProgress = Math.min(100, Math.round((rawStep - idx) * 100));
      }
      return { ...stage, status, stageProgress };
    });
  }, [progress]);

  // Filter console logs based on current progress
  const visibleLogs = useMemo(() => {
    return LOG_MESSAGES.filter((l) => progress >= l.at);
  }, [progress]);

  const activeStage = stagesWithStatus.find((s) => s.status === 'active') || stagesWithStatus[stagesWithStatus.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      {/* ── Top Forensic Radar & Real-Time Telemetry Bar ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(245,241,233,0.9) 100%)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px 28px',
          boxShadow: '0 8px 30px rgba(74, 71, 66, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background tech grid */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '200px',
            height: '100%',
            opacity: 0.06,
            backgroundImage: 'radial-gradient(circle, #EE692E 1px, transparent 1px)',
            backgroundSize: '12px 12px',
            pointerEvents: 'none',
          }}
        />

        {/* Left Side: Circular Scanner HUD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ position: 'relative', width: '84px', height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* Outer rotating pulse ring */}
            <svg style={{ position: 'absolute', width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle
                cx="42"
                cy="42"
                r="36"
                stroke="var(--bg-tertiary)"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="42"
                cy="42"
                r="36"
                stroke="var(--accent-primary)"
                strokeWidth="5"
                strokeDasharray="226.2"
                strokeDashoffset={226.2 - (226.2 * Math.min(100, progress)) / 100}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.4s ease' }}
              />
            </svg>

            {/* Inner radar crosshair & percentage */}
            <div style={{ textAlign: 'center', zIndex: 2 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                {Math.round(progress)}%
              </div>
              <div style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--accent-primary)', letterSpacing: '0.08em', marginTop: '2px' }}>
                ANALYSIS
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(238, 105, 46, 0.15)',
                  border: '1px solid rgba(238, 105, 46, 0.35)',
                  color: 'var(--accent-primary)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', animation: 'pulse 1.2s infinite' }} />
                ACTIVE ENGINE
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                TG-PIPELINE-DAEMON
              </span>
            </div>
            <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeStage.name}
            </h4>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Activity size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>{activeStage.tag}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Global Status Badges */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              minWidth: '100px',
            }}
          >
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Modality Bands
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              Visual + Audio
            </div>
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
              minWidth: '100px',
            }}
          >
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Protocol Status
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-success)', marginTop: '2px' }}>
              SHA-256 Lock
            </div>
          </div>
        </div>
      </div>

      {/* ── 5 Forensic Inspection Stage Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stagesWithStatus.map((stage, idx) => {
          const Icon = stage.icon;
          const isComplete = stage.status === 'complete';
          const isActive = stage.status === 'active';
          const isPending = stage.status === 'pending';

          return (
            <motion.div
              key={stage.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                background: isActive
                  ? '#FFFFFF'
                  : isComplete
                  ? 'rgba(255, 255, 255, 0.85)'
                  : 'rgba(255, 255, 255, 0.45)',
                border: isActive
                  ? '2px solid var(--accent-primary)'
                  : isComplete
                  ? '1px solid var(--border-medium)'
                  : '1px solid var(--border-subtle)',
                boxShadow: isActive
                  ? '0 6px 20px rgba(238, 105, 46, 0.15)'
                  : isComplete
                  ? '0 2px 8px rgba(74, 71, 66, 0.04)'
                  : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Active animated shimmer bar on left edge */}
              {isActive && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: 'var(--accent-primary)',
                  }}
                />
              )}

              {/* Left Column: Icon & Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: isActive
                      ? 'rgba(238, 105, 46, 0.15)'
                      : isComplete
                      ? 'var(--bg-secondary)'
                      : 'var(--bg-tertiary)',
                    border: isActive
                      ? '1px solid var(--accent-primary)'
                      : isComplete
                      ? '1px solid var(--border-medium)'
                      : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isActive
                      ? 'var(--accent-primary)'
                      : isComplete
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} />
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {stage.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontFamily: 'var(--font-mono)',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-tertiary)',
                        color: 'var(--text-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      {stage.tag}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: '3px', lineHeight: 1.4 }}>
                    {isComplete ? stage.completeText : isActive ? stage.activeText : 'Awaiting sensor pipeline dispatch...'}
                  </div>
                </div>
              </div>

              {/* Right Column: Status Badge & Telemetry */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                {isComplete && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(58, 54, 48, 0.08)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                    }}
                  >
                    <CheckCircle2 size={13} style={{ color: 'var(--accent-primary)' }} />
                    Verified
                  </span>
                )}

                {isActive && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(238, 105, 46, 0.15)',
                      border: '1px solid var(--accent-primary)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}
                  >
                    <Loader2 size={13} className="spin" />
                    Scanning {stage.stageProgress}%
                  </span>
                )}

                {isPending && (
                  <span
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                    }}
                  >
                    Queued
                  </span>
                )}

                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {stage.metric}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Real-Time Forensic Console Terminal ── */}
      <div
        style={{
          background: '#1F1C1A',
          border: '1px solid #3A3632',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.25)',
          color: '#EDE8DE',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.76rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #332F2B', paddingBottom: '8px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 700 }}>
            <Terminal size={14} />
            <span>LIVE FORENSIC AUDIT STREAM</span>
          </div>
          <div style={{ fontSize: '0.68rem', color: '#8A8278' }}>
            MIL-STD-188 // Tamper-Evident Protocol
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
          {visibleLogs.map((log, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', color: i === visibleLogs.length - 1 ? '#FFFFFF' : '#A89E90' }}>
              <span style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>›</span>
              <span>{log.text}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)' }}>
            <span>›</span>
            <span style={{ animation: 'blink 1s infinite' }}>_</span>
          </div>
        </div>
      </div>
    </div>
  );
}

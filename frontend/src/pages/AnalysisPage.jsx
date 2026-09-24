import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, FileVideo, FileAudio, Image, ShieldAlert, CheckCircle2, AlertTriangle, UserCheck, Layers, Hash, Copy, Check, Play, Mic } from 'lucide-react';
import DisagreementBanner from '../components/DisagreementBanner';
import RiskCertificate from '../components/RiskCertificate';
import EvidenceDashboard from '../components/EvidenceDashboard';
import HumanReviewPanel from '../components/HumanReviewPanel';
import CaseFileExport from '../components/CaseFileExport';

export default function AnalysisPage({ caseFile: initialCaseFile, onBack }) {
  const [caseFile, setCaseFile] = useState(initialCaseFile);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!caseFile) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-3xl) var(--space-md)' }}>
        <p style={{ color: 'var(--text-muted)' }}>No case file selected.</p>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginTop: 'var(--space-md)' }}>
          <ArrowLeft size={16} /> Return to Upload
        </button>
      </div>
    );
  }

  const { media_summary, confidence_summary, disagreement, risk, evidence, status } = caseFile;
  const transcript = caseFile.extracted?.transcript || caseFile.metadata?.transcript;

  const handleReviewComplete = (updatedCase) => {
    setCaseFile(updatedCase);
  };

  const copySha256 = () => {
    if (media_summary?.sha256) {
      navigator.clipboard.writeText(media_summary.sha256);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const getMediaIcon = (type) => {
    if (type === 'video') return FileVideo;
    if (type === 'audio') return FileAudio;
    return Image;
  };

  const MediaIcon = getMediaIcon(media_summary?.type);
  const mediaStreamUrl = media_summary?.media_id
    ? `http://localhost:8000/media/${encodeURIComponent(media_summary.media_id)}/file`
    : null;

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: 'var(--space-xl) var(--space-md)' }}>
      {/* Top Navigation & Actions Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-md)',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: 'var(--radius-md)',
            minHeight: '40px',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.transform = 'translateX(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <ArrowLeft size={16} /> Back to Reports
        </button>

        <CaseFileExport caseFile={caseFile} />
      </div>

      {/* Prominent Overall Risk & Human Review Status Hero Banner */}
      {(() => {
        const riskLevel = (risk?.risk_level || 'medium').toLowerCase();
        const isCriticalOrHigh = riskLevel === 'critical' || riskLevel === 'high';
        const isMedium = riskLevel === 'medium';
        const borderColor = isCriticalOrHigh
          ? 'var(--risk-critical)'
          : isMedium
          ? 'var(--risk-medium)'
          : 'var(--risk-low)';
        const bgGradient = isCriticalOrHigh
          ? 'linear-gradient(135deg, rgba(238, 105, 46, 0.12), rgba(238, 105, 46, 0.04))'
          : isMedium
          ? 'linear-gradient(135deg, #FAF7F2, #EDE8E0)'
          : 'linear-gradient(135deg, #FFFFFF, #F5F1E9)';
        const textColor = isCriticalOrHigh ? 'var(--accent-primary)' : 'var(--text-primary)';

        return (
          <div
            className="risk-hero-banner"
            style={{
              background: bgGradient,
              border: `2px solid ${borderColor}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg) var(--space-xl)',
              marginBottom: 'var(--space-xl)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-md)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: 'var(--radius-md)',
                  background: isCriticalOrHigh
                    ? 'var(--risk-critical)'
                    : isMedium
                    ? 'var(--risk-medium)'
                    : 'var(--risk-low)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isCriticalOrHigh ? '#ffffff' : 'var(--text-primary)',
                  boxShadow: '0 2px 8px rgba(74, 71, 66, 0.1)',
                  flexShrink: 0,
                }}
              >
                {isCriticalOrHigh ? <ShieldAlert size={28} /> : <CheckCircle2 size={28} />}
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 900,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      color: textColor,
                    }}
                  >
                    {riskLevel} RISK CLASSIFICATION
                  </span>

                  {confidence_summary?.requires_human_review ? (
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(238, 105, 46, 0.15)',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <AlertTriangle size={13} /> HUMAN REVIEW REQUIRED
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle2 size={13} /> AUTOMATED VERIFICATION PASS
                    </span>
                  )}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0', maxWidth: '780px' }}>
                  {risk?.narrative || 'Contextual risk computed from multi-modal evidence streams and claim impact analysis.'}
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dossier Status
              </span>
              <div
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  textTransform: 'capitalize',
                  marginTop: '2px',
                }}
              >
                {status?.replace('_', ' ') || 'Pending Review'}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Case Header Dossier Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-xl)',
          marginBottom: 'var(--space-xl)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--accent-primary)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                CASE FILE #{caseFile.case_id}
              </span>

              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  background:
                    status === 'confirmed_threat'
                      ? 'var(--color-danger-bg)'
                      : status === 'cleared'
                      ? 'var(--color-success-bg)'
                      : status === 'overridden'
                      ? 'var(--color-warning-bg)'
                      : 'var(--bg-glass)',
                  color:
                    status === 'confirmed_threat'
                      ? 'var(--color-danger)'
                      : status === 'cleared'
                      ? 'var(--color-success)'
                      : status === 'overridden'
                      ? 'var(--color-warning)'
                      : 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                Status: {status?.replace('_', ' ') || 'Pending Review'}
              </span>

              {confidence_summary?.requires_human_review && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-danger-bg)',
                    color: 'var(--color-danger)',
                    border: '1px solid var(--color-danger-border)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <AlertTriangle size={12} /> Human Review Mandatory
                </span>
              )}
            </div>

            <h1
              style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginTop: 'var(--space-sm)',
              }}
            >
              Forensic Evidence Dossier
            </h1>
          </div>

          {/* Media Info Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-lg)',
              background: 'var(--bg-glass)',
              padding: 'var(--space-sm) var(--space-md)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MediaIcon size={18} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {media_summary?.filename || 'Uploaded Media'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {media_summary?.type?.toUpperCase()} · {media_summary?.duration || 'Static'} {media_summary?.resolution ? `· ${media_summary.resolution}` : ''}
                </div>
              </div>
            </div>

            <div style={{ height: '24px', width: '1px', background: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              <Clock size={14} />
              <span>
                {caseFile.timestamp ? new Date(caseFile.timestamp).toLocaleTimeString() : 'Recent'}
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic SHA-256 Provenance Fingerprint */}
        {media_summary?.sha256 && (
          <div
            style={{
              marginTop: 'var(--space-md)',
              paddingTop: 'var(--space-sm)',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
              fontSize: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
              <Hash size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>Chain-of-Custody Ingestion Digest (SHA-256):</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {media_summary.sha256}
              </span>
            </div>
            <button
              onClick={copySha256}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem',
              }}
            >
              {copiedHash ? <Check size={12} color="var(--accent-primary)" /> : <Copy size={12} />}
              {copiedHash ? 'Digest Copied' : 'Copy Hash'}
            </button>
          </div>
        )}
      </div>

      {/* Embedded Forensic Media Inspection Player */}
      {mediaStreamUrl && (media_summary?.type === 'video' || media_summary?.type === 'audio') && (
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
            <Play size={16} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Forensic Synchronized Media Playback
            </h3>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
            {media_summary.type === 'video' ? (
              <video
                controls
                preload="metadata"
                src={mediaStreamUrl}
                style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ padding: 'var(--space-xl)', width: '100%' }}>
                <audio controls src={mediaStreamUrl} style={{ width: '100%' }} />
              </div>
            )}
          </div>

          {/* If autonomous transcript was captured */}
          {transcript && (
            <div style={{ marginTop: 'var(--space-md)', padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <Mic size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Speech Transcription:
                </span>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px', fontStyle: 'italic' }}>
                  "{transcript}"
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disagreement Banner (When cross-modal conflict occurs) */}
      {disagreement && disagreement.disagreement_detected && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <DisagreementBanner disagreement={disagreement} />
        </div>
      )}

      {/* Narrative Risk Assessment Certificate */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <RiskCertificate risk={risk} confidenceSummary={confidence_summary} caseId={caseFile?.case_id} />
      </div>

      {/* Split Evidence Dashboard (Visual vs Audio vs Context) */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <EvidenceDashboard evidenceList={evidence || []} />
      </div>

      {/* Human Review Panel & Audit Log */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <HumanReviewPanel caseFile={caseFile} onReviewComplete={handleReviewComplete} />
      </div>
    </div>
  );
}

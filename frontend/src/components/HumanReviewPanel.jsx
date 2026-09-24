import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, ShieldCheck, RefreshCw, UserCheck, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { submitReview } from '../utils/api';

export default function HumanReviewPanel({ caseFile, onReviewComplete }) {
  const [action, setAction] = useState('confirmed_threat');
  const [reviewerId, setReviewerId] = useState('analyst-lead');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!caseFile) return null;

  const currentDecision = caseFile.reviewer_decision;
  const isDecided = currentDecision && currentDecision.action;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const updatedCase = await submitReview(caseFile.case_id, action, notes, reviewerId);
      if (onReviewComplete) {
        onReviewComplete(updatedCase);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit review decision');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-xl)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
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
            <UserCheck size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Human Analyst Review & Disposition
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Final operational determination with tamper-evident audit logging
            </span>
          </div>
        </div>

        {isDecided ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background:
                currentDecision.action === 'confirmed_threat'
                  ? 'var(--color-danger-bg)'
                  : currentDecision.action === 'cleared'
                  ? 'var(--color-success-bg)'
                  : 'var(--color-warning-bg)',
              color:
                currentDecision.action === 'confirmed_threat'
                  ? 'var(--color-danger)'
                  : currentDecision.action === 'cleared'
                  ? 'var(--color-success)'
                  : 'var(--color-warning)',
              border: `1px solid ${
                currentDecision.action === 'confirmed_threat'
                  ? 'var(--color-danger-border)'
                  : currentDecision.action === 'cleared'
                  ? 'var(--color-success-border)'
                  : 'var(--color-warning-border)'
              }`,
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
            }}
          >
            <CheckCircle2 size={14} /> Decision Logged: {currentDecision.action.replace('_', ' ')}
          </span>
        ) : (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-warning-bg)',
              color: 'var(--color-warning)',
              border: '1px solid var(--color-warning-border)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            <AlertCircle size={14} /> Awaiting Human Adjudication
          </span>
        )}
      </div>

      {/* If decision already exists, show logged summary */}
      {isDecided && (
        <div
          style={{
            marginBottom: 'var(--space-xl)',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Reviewer: </span>
              <strong style={{ color: 'var(--text-primary)' }}>{currentDecision.reviewer_id}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Recorded At: </span>
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {currentDecision.decided_at ? new Date(currentDecision.decided_at).toLocaleString() : 'N/A'}
              </span>
            </div>
          </div>
          {currentDecision.notes && (
            <p style={{ marginTop: 'var(--space-sm)', fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              "{currentDecision.notes}"
            </p>
          )}
        </div>
      )}

      {/* Decision Submission Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
        {/* Action Selector Buttons */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-sm)', fontWeight: 500 }}>
            {isDecided ? 'Update Disposition / Action:' : 'Select Disposition Action:'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-md)' }}>
            <button
              type="button"
              onClick={() => setAction('confirmed_threat')}
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                border: action === 'confirmed_threat' ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                background: action === 'confirmed_threat' ? 'rgba(238, 105, 46, 0.12)' : '#FFFFFF',
                color: action === 'confirmed_threat' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <ShieldAlert size={18} /> Confirm Threat
            </button>

            <button
              type="button"
              onClick={() => setAction('cleared')}
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                border: action === 'cleared' ? '2px solid var(--border-strong)' : '1px solid var(--border-medium)',
                background: action === 'cleared' ? 'var(--bg-secondary)' : '#FFFFFF',
                color: action === 'cleared' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <ShieldCheck size={18} /> Clear / Authentic
            </button>

            <button
              type="button"
              onClick={() => setAction('overridden')}
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                border: action === 'overridden' ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                background: action === 'overridden' ? 'var(--bg-secondary)' : '#FFFFFF',
                color: action === 'overridden' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                transition: 'all var(--transition-fast)',
              }}
            >
              <RefreshCw size={18} /> Override Model
            </button>
          </div>
        </div>

        {/* Reviewer ID & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-md)' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontWeight: 500 }}>
              Reviewer Identity / Badge:
            </label>
            <input
              type="text"
              value={reviewerId}
              onChange={(e) => setReviewerId(e.target.value)}
              placeholder="e.g. analyst-john or fraud-ops-01"
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.9rem',
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-xs)', fontWeight: 500 }}>
              Investigative Findings & Notes:
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document reason for decision, reference points, verification steps taken..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: '#FFFFFF',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                lineHeight: 1.5,
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <Send size={16} />
            {submitting ? 'Recording Audit Entry...' : isDecided ? 'Update Audit Determination' : 'Sign & Submit Case Adjudication'}
          </button>
        </div>
      </form>
    </div>
  );
}

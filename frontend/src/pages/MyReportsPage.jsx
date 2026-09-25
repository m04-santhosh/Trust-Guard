import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  AlertTriangle,
  Clock,
  FileVideo,
  UserCheck,
  Search,
  Hash,
  Shield,
  ArrowRight,
  ArrowLeft,
  Lock,
  PlusCircle,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Award,
  ExternalLink,
  X,
} from 'lucide-react';
import { listMyCases, deleteCase } from '../utils/api';

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
import { useAuth } from '../context/AuthContext';

export default function MyReportsPage({ onSelectCase, onNewAnalysis, onOpenAuth, onBack }) {
  const { user, token, isAuthenticated } = useAuth();
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deleteModalCase, setDeleteModalCase] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCase = async () => {
    if (!deleteModalCase) return;
    setIsDeleting(true);
    try {
      await deleteCase(deleteModalCase.case_id, token);
      setCases((prev) => prev.filter((c) => c.case_id !== deleteModalCase.case_id));
      setDeleteModalCase(null);
    } catch (err) {
      alert(err.message || 'Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchUserCases = async (isManualRefresh = false) => {
    if (!token) {
      setCases([]);
      setLoading(false);
      return;
    }
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      // Fetch all cases once so filter tabs switch instantaneously in-memory
      const data = await listMyCases(token, null);
      // Ensure newest first
      const sorted = (data || []).sort(
        (a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0)
      );
      setCases(sorted);
    } catch (err) {
      setError(err.message || 'Failed to load your personal reports');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUserCases();
  }, [token]);

  // Client-side instant filtering + search (0ms latency, no lag)
  const filteredCases = cases.filter((c) => {
    if (filter !== 'all') {
      if (filter === 'pending_review') {
        const isPending =
          c.status === 'pending_review' ||
          (!c.reviewer_decision?.action && c.status !== 'confirmed_threat' && c.status !== 'cleared');
        if (!isPending) return false;
      } else if (filter === 'confirmed_threat') {
        const isThreat =
          c.status === 'confirmed_threat' || c.reviewer_decision?.action === 'flag_threat';
        if (!isThreat) return false;
      } else if (filter === 'cleared') {
        const isCleared =
          c.status === 'cleared' || c.reviewer_decision?.action === 'clear_content';
        if (!isCleared) return false;
      }
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const caseIdMatch = (c.case_id || '').toLowerCase().includes(q);
    const filenameMatch = (c.media_summary?.filename || '').toLowerCase().includes(q);
    const hashMatch = (c.media_summary?.sha256 || '').toLowerCase().includes(q);
    const factorsMatch = (c.risk?.factors || []).some((f) => f.toLowerCase().includes(q));
    return caseIdMatch || filenameMatch || hashMatch || factorsMatch;
  });

  // If user is not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '0 var(--space-md)', textAlign: 'center' }}>
        <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-3xl) var(--space-xl)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--space-lg)',
              color: 'var(--accent-primary)',
            }}
          >
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Authentication Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto var(--space-xl)' }}>
            Sign in to your TrustGuard account to access your personal forensic dossiers and track your uploaded media investigations.
          </p>
          <button
            onClick={onOpenAuth}
            style={{
              padding: '12px 28px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Sign In or Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', padding: 'var(--space-2xl) var(--space-xl)' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-2xl)',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              My Reports
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '6px' }}>
            Personal dossier archive for <strong style={{ color: 'var(--accent-primary)' }}>@{user?.username}</strong>. Query-isolated and cryptographically verified.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '44px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border-medium)';
              }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={() => fetchUserCases(true)}
            disabled={loading || isRefreshing}
            title="Sync latest case updates"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: (loading || isRefreshing) ? 'not-allowed' : 'pointer',
              minHeight: '44px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ color: isRefreshing ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={onNewAnalysis}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <PlusCircle size={16} /> New Analysis
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}
      >
        <div
          style={{
            background: 'var(--bg-card)',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Personal Cases
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {cases.length}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Contradictions Flagged
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '4px' }}>
            {cases.filter((c) => c.disagreement?.disagreement_detected).length}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-card)',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending Review
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '4px' }}>
            {cases.filter((c) => c.status === 'pending_review' || (!c.reviewer_decision?.action && c.status !== 'confirmed_threat' && c.status !== 'cleared')).length}
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-lg)',
          flexWrap: 'wrap',
          gap: 'var(--space-md)',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search my reports by Case ID, file name, or hash..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Filter Buttons */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { key: 'all', label: 'All Reports', count: cases.length },
            {
              key: 'pending_review',
              label: 'Pending',
              count: cases.filter((c) => c.status === 'pending_review' || (!c.reviewer_decision?.action && c.status !== 'confirmed_threat' && c.status !== 'cleared')).length,
            },
            {
              key: 'confirmed_threat',
              label: 'Confirmed Threat',
              count: cases.filter((c) => c.status === 'confirmed_threat' || c.reviewer_decision?.action === 'flag_threat').length,
            },
            {
              key: 'cleared',
              label: 'Cleared',
              count: cases.filter((c) => c.status === 'cleared' || c.reviewer_decision?.action === 'clear_content').length,
            },
          ].map((tab) => {
            const isActive = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  minHeight: '38px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: isActive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                    color: isActive ? '#ffffff' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports List */}
      {loading && cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px', color: 'var(--accent-primary)' }} />
          <p style={{ fontSize: '0.9rem' }}>Loading your personal case history...</p>
        </div>
      ) : error ? (
        <div
          style={{
            padding: 'var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            color: 'var(--color-danger)',
          }}
        >
          {error}
        </div>
      ) : filteredCases.length === 0 ? (
        /* Empty State */
        <div
          style={{
            textAlign: 'center',
            padding: '60px 24px',
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--bg-tertiary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              color: 'var(--text-muted)',
            }}
          >
            <Inbox size={28} />
          </div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Case Reports Found
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 20px' }}>
            {searchQuery
              ? 'No reports matched your search filters. Try clearing your search.'
              : "You haven't run any media forensic analyses under this account yet. Upload a video or image to generate your first Case Dossier."}
          </p>
          <button
            onClick={onNewAnalysis}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.9rem',
              border: 'none',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            <PlusCircle size={18} /> Analyze Media Now
          </button>
        </div>
      ) : (
        /* List of user reports */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredCases.map((c) => {
            const riskLevel = c.risk?.risk_level || 'medium';
            const hasDisagreement = c.disagreement?.disagreement_detected;
            const requiresReview = c.risk?.requires_human_review;

            return (
              <div
                key={c.case_id}
                onClick={() => onSelectCase(c)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: 'var(--space-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 'var(--space-lg)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-medium)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Left Meta & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <FileVideo size={22} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {c.case_id}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                      <span
                        style={{
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.media_summary?.filename || 'Media Asset'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        marginTop: '4px',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {c.timestamp ? new Date(c.timestamp).toLocaleString() : 'N/A'}
                      </span>
                      {c.media_summary?.sha256 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'var(--font-mono)' }}>
                          <Hash size={11} color="var(--accent-primary)" /> {c.media_summary.sha256.substring(0, 8)}...
                        </span>
                      )}
                      {c.reviewer_decision?.reviewer_id && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}>
                          <UserCheck size={12} /> {c.reviewer_decision.reviewer_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Badges & Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap', flexShrink: 0 }}>
                  {hasDisagreement && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '3px 8px',
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
                      <AlertTriangle size={12} /> Contradiction
                    </span>
                  )}

                  {/* Prominent Risk Level Badge */}
                  <span
                    style={{
                      fontSize: '0.78rem',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      background:
                        riskLevel === 'critical' || riskLevel === 'high'
                          ? 'var(--risk-high-bg)'
                          : riskLevel === 'medium'
                          ? 'var(--risk-medium-bg)'
                          : 'var(--risk-low-bg)',
                      color:
                        riskLevel === 'critical' || riskLevel === 'high'
                          ? 'var(--risk-high)'
                          : riskLevel === 'medium'
                          ? 'var(--risk-medium)'
                          : 'var(--risk-low)',
                      border:
                        riskLevel === 'critical' || riskLevel === 'high'
                          ? '1px solid var(--risk-high-border)'
                          : riskLevel === 'medium'
                          ? '1px solid var(--risk-medium-border)'
                          : '1px solid var(--risk-low-border)',
                    }}
                  >
                    {riskLevel} RISK
                  </span>

                  {/* Status Badge */}
                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                      textTransform: 'capitalize',
                      fontWeight: 500,
                    }}
                  >
                    {c.status?.replace('_', ' ') || 'Pending'}
                  </span>

                  {/* 1-Click Risk Certificate Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`${API_BASE}/export/${c.case_id}?format=html`, '_blank');
                    }}
                    title="Open Official Risk Certificate in new window"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(238, 105, 46, 0.12)',
                      border: '1px solid rgba(238, 105, 46, 0.35)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(238, 105, 46, 0.22)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(238, 105, 46, 0.12)';
                    }}
                  >
                    <Award size={13} />
                    <span>Certificate</span>
                  </button>

                  {/* Delete Report Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteModalCase(c);
                    }}
                    title="Delete this report permanently"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(238, 105, 46, 0.1)',
                      border: '1px solid rgba(238, 105, 46, 0.3)',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(238, 105, 46, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(238, 105, 46, 0.1)';
                    }}
                  >
                    <Trash2 size={14} />
                  </button>

                  <div style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center' }}>
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalCase && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(58, 54, 48, 0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-md)',
          }}
          onClick={() => !isDeleting && setDeleteModalCase(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '460px',
              width: '100%',
              padding: 'var(--space-xl)',
              boxShadow: '0 20px 50px rgba(74, 71, 66, 0.18)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(238, 105, 46, 0.12)',
                  border: '1px solid rgba(238, 105, 46, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Trash2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Delete Forensic Report
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Irreversible Archive Purge
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to permanently delete case{' '}
              <strong style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                {deleteModalCase.case_id}
              </strong>{' '}
              ({deleteModalCase.media_summary?.filename || 'Media file'})? All forensic evidence records, reviewer logs, and risk certifications will be removed.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                disabled={isDeleting}
                onClick={() => setDeleteModalCase(null)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleDeleteCase}
                style={{
                  padding: '9px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

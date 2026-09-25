import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FolderArchive,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Clock,
  FileVideo,
  UserCheck,
  Search,
  Filter,
  Hash,
  Shield,
  Trash2,
  Award,
  ExternalLink,
} from 'lucide-react';
import { listCases, deleteCase, purgeAllCases } from '../utils/api';
import { useAuth } from '../context/AuthContext';

import { API_BASE } from '../utils/config';

export default function HistoryPage({ onSelectCase, onNewAnalysis, onBack }) {
  const { token } = useAuth();
  const [cases, setCases] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [deleteModalCase, setDeleteModalCase] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

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

  const handlePurgeAll = async () => {
    setIsPurging(true);
    try {
      await purgeAllCases(token);
      setCases([]);
      setPurgeModalOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to purge case archives');
    } finally {
      setIsPurging(false);
    }
  };

  const fetchCases = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      // Fetch all cases once so filter tabs switch instantaneously in-memory
      const data = await listCases(token, null);
      setCases(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load case history');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Client-side instant filtering, search and sorting
  const filteredCases = cases
    .filter((c) => {
      // Filter by status tab in-memory (0ms lag)
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
      const entityMatch = (c.risk?.factors || []).some((f) => f.toLowerCase().includes(q));
      return caseIdMatch || filenameMatch || hashMatch || entityMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      }
      if (sortBy === 'risk_high') {
        const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aRisk = riskOrder[a.risk?.risk_level] || 0;
        const bRisk = riskOrder[b.risk?.risk_level] || 0;
        return bRisk - aRisk;
      }
      if (sortBy === 'disagreement') {
        const aDis = a.disagreement?.disagreement_detected ? 1 : 0;
        const bDis = b.disagreement?.disagreement_detected ? 1 : 0;
        return bDis - aDis;
      }
      return 0;
    });

  const disagreementCount = cases.filter((c) => c.disagreement?.disagreement_detected).length;
  const pendingCount = cases.filter((c) => c.status === 'pending_review' || !c.reviewer_decision?.action).length;

  return (
    <div style={{ maxWidth: '1280px', marginLeft: 'auto', marginRight: 'auto', padding: 'var(--space-2xl) var(--space-xl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2xl)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderArchive size={22} style={{ color: 'var(--accent-primary)' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Case Dossier Archives
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Historical repository of analyzed media cases, contradiction evaluations, and analyst decisions
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
                minHeight: '42px',
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
            onClick={() => fetchCases(true)}
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
              minHeight: '42px',
              transition: 'all var(--transition-fast)',
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} style={{ color: isRefreshing ? 'var(--accent-primary)' : 'var(--text-secondary)' }} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {cases.length > 0 && (
            <button
              onClick={() => setPurgeModalOpen(true)}
              disabled={loading || isRefreshing || isPurging}
              title="Purge all archive cases and clear workspace"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(238, 105, 46, 0.08)',
                border: '1px solid rgba(238, 105, 46, 0.3)',
                color: 'var(--accent-primary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: (loading || isRefreshing || isPurging) ? 'not-allowed' : 'pointer',
                minHeight: '42px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-primary)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(238, 105, 46, 0.08)';
                e.currentTarget.style.color = 'var(--accent-primary)';
              }}
            >
              <Trash2 size={14} />
              <span>Purge All Archive Cases</span>
            </button>
          )}

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
              minHeight: '42px',
              transition: 'all var(--transition-fast)',
            }}
          >
            + New Analysis
          </button>
        </div>
      </div>

      {/* Summary Stat Counters */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
        <div style={{ background: 'var(--bg-card)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Ingested Cases</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{cases.length}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-danger)', textTransform: 'uppercase' }}>Cross-Modal Contradictions</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-danger)', marginTop: '2px' }}>{disagreementCount}</div>
        </div>
        <div style={{ background: 'var(--bg-card)', padding: 'var(--space-md) var(--space-lg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', textTransform: 'uppercase' }}>Awaiting Adjudication</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-warning)', marginTop: '2px' }}>{pendingCount}</div>
        </div>
      </div>

      {/* Controls: Search & Sort Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '480px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Case ID, filename, SHA-256 hash, or public figure..."
            style={{
              width: '100%',
              padding: '9px 14px 9px 36px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Sort Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            <option value="latest">Latest Ingestion</option>
            <option value="risk_high">Highest Risk Level</option>
            <option value="disagreement">Flagged Contradictions First</option>
          </select>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-xl)', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { key: 'all', label: 'All Cases', count: cases.length },
          {
            key: 'pending_review',
            label: 'Pending Review',
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

      {/* Case List */}
      {loading && cases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto var(--space-md)', color: 'var(--accent-primary)' }} />
          <p>Querying SQLite case database...</p>
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
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-3xl)',
            background: 'var(--bg-card)',
            border: '1px dashed var(--border-medium)',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          <FolderArchive size={40} style={{ color: 'var(--text-muted)', margin: '0 auto var(--space-md)' }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No Cases Match Filters</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Try resetting your search query or upload a new media file.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {filteredCases.map((c) => {
            const riskLevel = c.risk?.risk_level || 'medium';
            const hasDisagreement = c.disagreement?.disagreement_detected;

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
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-medium)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Left Meta */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
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
                    <FileVideo size={20} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {c.case_id}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.media_summary?.filename || 'Media Asset'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {c.timestamp ? new Date(c.timestamp).toLocaleString() : 'N/A'}
                      </span>
                      {c.media_summary?.sha256 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontFamily: 'var(--font-mono)' }}>
                          <Hash size={11} color="var(--accent-primary)" /> {c.media_summary.sha256.substring(0, 10)}...
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                  {hasDisagreement && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 8px',
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
                      <AlertTriangle size={12} /> Contradiction Flagged
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
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
                    }}
                  >
                    {riskLevel} Risk
                  </span>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                      textTransform: 'capitalize',
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
                    title="Delete this case permanently"
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
                  Delete Forensic Dossier
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
      {/* Purge All Archives Confirmation Modal */}
      {purgeModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30, 27, 24, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--space-md)',
          }}
          onClick={() => !isPurging && setPurgeModalOpen(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-medium)',
              padding: 'var(--space-xl)',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'rgba(238, 105, 46, 0.12)',
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
                  Purge All Archive Cases
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Irreversible Global Case Purge ({cases.length} records)
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '20px' }}>
              Are you sure you want to permanently delete <strong>all {cases.length} cases</strong> from the Case Dossier Archive? This will clear test benchmarks, evidence records, and past dossiers so your workspace starts completely clean.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                disabled={isPurging}
                onClick={() => setPurgeModalOpen(false)}
                style={{
                  padding: '9px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isPurging ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                disabled={isPurging}
                onClick={handlePurgeAll}
                style={{
                  padding: '9px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: isPurging ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isPurging ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    <span>Purging Archives...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Purge All Records</span>
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

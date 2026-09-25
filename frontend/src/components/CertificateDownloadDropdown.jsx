import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  ChevronDown,
  Printer,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Award,
  Check,
  ExternalLink,
} from 'lucide-react';

export default function CertificateDownloadDropdown({ caseId, caseFile, variant = 'primary' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const dropdownRef = useRef(null);

  const id = caseId || caseFile?.case_id;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!id) return null;

  const handleDownload = async (format) => {
    setDownloadingFormat(format);
    try {
      if (format === 'pdf_print') {
        window.open(`http://localhost:8000/export/${encodeURIComponent(id)}?format=html`, '_blank');
      } else if (format === 'html') {
        const res = await fetch(`http://localhost:8000/export/${encodeURIComponent(id)}?format=html`);
        const html = await res.text();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${id}_certificate.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'json') {
        if (caseFile) {
          const blob = new Blob([JSON.stringify(caseFile, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${id}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          window.location.href = `http://localhost:8000/export/${encodeURIComponent(id)}?format=json`;
        }
      } else if (format === 'csv') {
        window.location.href = `http://localhost:8000/export/${encodeURIComponent(id)}?format=csv`;
      }
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setTimeout(() => {
        setDownloadingFormat(null);
        setIsOpen(false);
      }, 500);
    }
  };

  const isPrimary = variant === 'primary';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Download Certificate in Multiple Formats"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: isPrimary ? '8px 16px' : '6px 14px',
          borderRadius: 'var(--radius-md)',
          background: isPrimary ? 'var(--accent-primary)' : 'var(--bg-card)',
          border: isPrimary ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
          color: isPrimary ? '#ffffff' : 'var(--text-primary)',
          fontSize: isPrimary ? '0.85rem' : '0.8rem',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: isPrimary ? '0 2px 8px rgba(238, 105, 46, 0.25)' : 'var(--shadow-sm)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          minHeight: isPrimary ? '40px' : '36px',
        }}
        onMouseEnter={(e) => {
          if (isPrimary) {
            e.currentTarget.style.background = 'var(--accent-primary-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          } else {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (isPrimary) {
            e.currentTarget.style.background = 'var(--accent-primary)';
            e.currentTarget.style.transform = 'translateY(0)';
          } else {
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.background = 'var(--bg-card)';
          }
        }}
      >
        <Award size={16} style={{ color: isPrimary ? '#ffffff' : 'var(--accent-primary)' }} />
        <span>Download Certificate</span>
        <ChevronDown
          size={14}
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            opacity: 0.85,
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '280px',
            background: '#FFFFFF',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 12px 35px rgba(58, 54, 48, 0.18)',
            padding: '8px',
            zIndex: 300,
            animation: 'fadeIn 0.15s ease forwards',
          }}
        >
          <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Select Verification Format
            </span>
          </div>

          {/* Option 1: PDF / Print */}
          <button
            onClick={() => handleDownload('pdf_print')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '9px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <Printer size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Print / Save PDF Certificate
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                Official vector layout with security seal
              </div>
            </div>
          </button>

          {/* Option 2: Standalone HTML */}
          <button
            onClick={() => handleDownload('html')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '9px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileCode size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Interactive HTML Certificate
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                Self-contained offline document with seal
              </div>
            </div>
          </button>

          {/* Option 3: Cryptographic JSON */}
          <button
            onClick={() => handleDownload('json')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '9px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileJson size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cryptographic JSON Dossier
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                Complete machine-readable evidence trail
              </div>
            </div>
          </button>

          {/* Option 4: CSV Audit Log */}
          <button
            onClick={() => handleDownload('csv')}
            disabled={downloadingFormat !== null}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '9px 10px',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <FileSpreadsheet size={16} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Forensic CSV Audit Log
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '1px' }}>
                Structured tabular parameters & scores
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

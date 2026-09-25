import React, { useState } from 'react';
import { Download, Printer, Copy, Check, FileJson, FileText, ExternalLink, Award } from 'lucide-react';
import { exportCaseFile } from '../utils/api';
import CertificateDownloadDropdown from './CertificateDownloadDropdown';

import { API_BASE } from '../utils/config';

export default function CaseFileExport({ caseFile }) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!caseFile) return null;

  const handleJsonDownload = async () => {
    setExporting(true);
    try {
      await exportCaseFile(caseFile.case_id);
    } catch (err) {
      console.error('Export failed:', err);
      // Fallback: client-side JSON download
      const blob = new Blob([JSON.stringify(caseFile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${caseFile.case_id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };
  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(caseFile, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* Primary Action Button: Multi-Format Forensic Risk Certificate Dropdown */}
      <CertificateDownloadDropdown caseFile={caseFile} variant="primary" />

      {/* Export JSON */}
      <button
        onClick={handleJsonDownload}
        disabled={exporting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: exporting ? 'not-allowed' : 'pointer',
          minHeight: '40px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          if (!exporting) {
            e.currentTarget.style.borderColor = 'var(--accent-primary)';
            e.currentTarget.style.background = 'var(--bg-card-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!exporting) {
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.background = 'var(--bg-card)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
        }}
      >
        <FileJson size={16} style={{ color: 'var(--accent-primary)' }} />
        <span>{exporting ? 'Exporting...' : 'Export JSON'}</span>
      </button>

      {/* Copy JSON */}
      <button
        onClick={handleCopyJson}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '40px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.background = 'var(--bg-card-hover)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-medium)';
          e.currentTarget.style.background = 'var(--bg-card)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {copied ? <Check size={16} style={{ color: 'var(--color-success)' }} /> : <Copy size={16} style={{ color: 'var(--text-muted)' }} />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>

      {/* Print */}
      <button
        onClick={handlePrint}
        className="no-print"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-primary)',
          fontSize: '0.85rem',
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: '40px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent-primary)';
          e.currentTarget.style.background = 'var(--bg-card-hover)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-medium)';
          e.currentTarget.style.background = 'var(--bg-card)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <Printer size={16} style={{ color: 'var(--accent-primary)' }} />
        <span>Print</span>
      </button>
    </div>
  );
}

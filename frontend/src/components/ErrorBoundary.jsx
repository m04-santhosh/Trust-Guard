import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — Global crash shield for TrustGuard UI.
 * Catches any uncaught React rendering errors and displays a clean fallback
 * instead of a white screen. Critical for live demo stability.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[TrustGuard ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRecover = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: '12px',
              padding: '2.5rem',
              boxShadow: '0 10px 30px rgba(74, 71, 66, 0.1)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(238, 105, 46, 0.12)',
                border: '2px solid var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
              }}
            >
              <AlertTriangle size={28} color="var(--accent-primary)" />
            </div>

            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
              }}
            >
              Something Went Wrong
            </h2>

            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5,
                marginBottom: '1.5rem',
              }}
            >
              An unexpected error occurred in the forensic workspace. Your data is safe — click below to recover.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleRecover}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'var(--accent-primary)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
                Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mail,
  User,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  ShieldAlert,
} from 'lucide-react';
import { requestPasswordReset, confirmPasswordReset } from '../utils/api';

export default function AuthPage({ onSuccess }) {
  // 'login' | 'signup' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState('login');
  
  // Form inputs
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [devCodeNotice, setDevCodeNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, signup } = useAuth();

  const handleLoginOrSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setDevCodeNotice(null);
    setSubmitting(true);

    try {
      if (authMode === 'login') {
        const identifier = (username || email).trim();
        if (!identifier) {
          throw new Error('Please enter your username or email address.');
        }
        if (!password) {
          throw new Error('Please enter your password.');
        }
        await login(identifier, password);
      } else if (authMode === 'signup') {
        if (!email.trim() || !email.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (!username.trim() || username.length < 3) {
          throw new Error('Username must be at least 3 characters.');
        }
        if (!password || password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await signup(email.trim(), username.trim(), password);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setDevCodeNotice(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await requestPasswordReset(cleanEmail);
      if (res.smtp_sent) {
        setSuccessMsg(res.message || 'Recovery code dispatched to your inbox via SMTP.');
        setDevCodeNotice(null);
      } else {
        setError(res.message || 'SMTP delivery failed. Using Dev Recovery Code below.');
        if (res.dev_code) {
          setDevCodeNotice(`Dev Recovery Code: ${res.dev_code} (Auto-filled below for instant access)`);
          setResetCode(res.dev_code);
        }
      }
      setAuthMode('reset');
    } catch (err) {
      setError(err.message || 'Failed to dispatch recovery code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!resetCode.trim() || resetCode.trim().length < 5) {
      setError('Please enter the 6-digit recovery code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await confirmPasswordReset(resetCode.trim(), newPassword);
      setSuccessMsg(res.message || 'Password updated successfully! Please sign in.');
      setPassword('');
      setDevCodeNotice(null);
      setAuthMode('login');
    } catch (err) {
      setError(err.message || 'Password reset failed. Invalid or expired code.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setError(null);
    setSuccessMsg(null);
    setDevCodeNotice(null);
    setAuthMode(newMode);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '860px',
        margin: '0 auto',
        display: 'flex',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        background: '#FFFFFF',
        border: '1px solid var(--border-medium)',
        boxShadow: '0 12px 40px rgba(74, 71, 66, 0.08)',
        minHeight: '480px',
      }}
      className="auth-split-card"
    >
      {/* ── Left Branded Hero Panel (Warm Skin-Tone & Terracotta) ── */}
      <div
        style={{
          flex: '1 1 42%',
          background: 'linear-gradient(155deg, #F5F1E9 0%, #EBE5DB 50%, #E2DBD0 100%)',
          borderRight: '1px solid var(--border-medium)',
          padding: 'var(--space-2xl) var(--space-xl)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          color: 'var(--text-primary)',
        }}
        className="auth-hero-panel"
      >
        {/* Clean Center Brand & Single Tagline */}
        <div style={{ position: 'relative', zIndex: 1, padding: '0 var(--space-md)' }}>
          <h1
            style={{
              fontSize: '2.4rem',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              margin: '0 0 16px 0',
            }}
          >
            TrustGuard
          </h1>

          <div
            style={{
              width: '48px',
              height: '3px',
              background: 'var(--accent-primary)',
              margin: '0 auto 20px auto',
              borderRadius: '2px',
            }}
          />

          <p
            style={{
              fontSize: '1rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: 0,
              fontWeight: 500,
            }}
          >
            "We don't return a verdict. We return a case file."
          </p>
        </div>
      </div>

      {/* ── Right Form Panel (Clean Interactive Form) ── */}
      <div
        style={{
          flex: '1 1 58%',
          padding: 'var(--space-2xl) var(--space-2xl)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: '#FFFFFF',
        }}
        className="auth-form-panel"
      >
        {/* Header titles based on mode */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h2
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '6px',
            }}
          >
            {authMode === 'login' && 'Sign In'}
            {authMode === 'signup' && 'Create Account'}
            {authMode === 'forgot' && 'Recover Account'}
            {authMode === 'reset' && 'Set New Password'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {authMode === 'login' && 'Enter your credentials to access your forensic workspace.'}
            {authMode === 'signup' && 'Register to maintain private, user-isolated forensic case archives.'}
            {authMode === 'forgot' && 'Enter your email to receive a 6-digit recovery code via SMTP.'}
            {authMode === 'reset' && 'Enter the 6-digit code sent to your email and your new password.'}
          </p>
        </div>

        {/* Success Feedback */}
        {successMsg && (
          <div
            style={{
              marginBottom: 'var(--space-md)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dev Mode Notification if SMTP is unconfigured */}
        {devCodeNotice && (
          <div
            style={{
              marginBottom: 'var(--space-md)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(238, 105, 46, 0.12)',
              border: '1px solid rgba(238, 105, 46, 0.35)',
              color: 'var(--accent-primary)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <KeyRound size={16} style={{ flexShrink: 0 }} />
            <span>{devCodeNotice}</span>
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div
            style={{
              marginBottom: 'var(--space-md)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: 'var(--color-danger)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* ── Mode 1 & 2: Login or Sign Up ── */}
        {(authMode === 'login' || authMode === 'signup') && (
          <form onSubmit={handleLoginOrSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            {/* Email / Username field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {authMode === 'login' ? 'Email or Username' : 'Email Address'}
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  <Mail size={16} />
                </div>
                <input
                  type={authMode === 'login' ? 'text' : 'email'}
                  value={authMode === 'login' ? (username || email) : email}
                  onChange={(e) => {
                    if (authMode === 'login') {
                      setUsername(e.target.value);
                      setEmail(e.target.value);
                    } else {
                      setEmail(e.target.value);
                    }
                  }}
                  placeholder={authMode === 'login' ? 'analyst_01 or email@domain.com' : 'analyst@domain.com'}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '46px',
                    transition: 'border-color var(--transition-fast)',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
              </div>
            </div>

            {/* Additional Username field only for Sign Up */}
            {authMode === 'signup' && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  >
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. analyst_sid"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 42px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-primary)',
                      fontSize: '0.92rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      minHeight: '46px',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                  />
                </div>
              </div>
            )}

            {/* Password field */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Password
                </label>
                {authMode === 'login' && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                    onClick={() => switchMode('forgot')}
                  >
                    Forgot password?
                  </span>
                )}
              </div>

              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '46px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all var(--transition-fast)',
                minHeight: '48px',
                marginTop: '4px',
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-primary-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {submitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>{authMode === 'login' ? 'CONTINUE' : 'REGISTER & ENTER'}</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Mode 3: Forgot Password (SMTP Dispatch) ── */}
        {authMode === 'forgot' && (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Registered Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analyst@domain.com"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '46px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '48px',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-primary-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {submitting ? 'Dispatching Code...' : 'SEND RECOVERY CODE'}
              <ArrowRight size={17} />
            </button>
          </form>
        )}

        {/* ── Mode 4: Reset Password (Code + New Password) ── */}
        {authMode === 'reset' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                6-Digit Recovery Code
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  <KeyRound size={16} />
                </div>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="e.g. 583921"
                  maxLength={6}
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--accent-primary)',
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.15em',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '46px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
              </div>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                >
                  <Lock size={16} />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-primary)',
                    fontSize: '0.92rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    minHeight: '46px',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--accent-primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border-medium)')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '48px',
                transition: 'all var(--transition-fast)',
              }}
              onMouseEnter={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-primary-hover)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!submitting) {
                  e.currentTarget.style.background = 'var(--accent-primary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {submitting ? 'Updating...' : 'RESET PASSWORD & SIGN IN'}
              <ArrowRight size={17} />
            </button>
          </form>
        )}

        {/* Bottom Toggle Prompt */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          {authMode === 'login' && (
            <>
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.88rem',
                  padding: '2px 4px',
                }}
              >
                Sign up
              </button>
            </>
          )}

          {authMode === 'signup' && (
            <>
              <span>Already have an account? </span>
              <button
                type="button"
                onClick={() => switchMode('login')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.88rem',
                  padding: '2px 4px',
                }}
              >
                Sign in
              </button>
            </>
          )}

          {(authMode === 'forgot' || authMode === 'reset') && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
              }}
            >
              <ArrowLeft size={15} /> Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

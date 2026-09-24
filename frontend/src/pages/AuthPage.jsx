import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft,
} from 'lucide-react';
import {
  requestPasswordReset,
  verifyResetOtp,
  confirmPasswordReset,
  verifySignupOtp,
  resendSignupOtp,
} from '../utils/api';

export default function AuthPage({ onSuccess, initialMode = 'login' }) {
  // 'login' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState(initialMode === 'reset' ? 'forgot' : (initialMode || 'login'));
  
  // Registration OTP Flow State: 'form' | 'otp' | 'success'
  const [signupStep, setSignupStep] = useState('form');
  const [signupOtpDigits, setSignupOtpDigits] = useState(['', '', '', '', '', '']);
  const [signupCooldown, setSignupCooldown] = useState(0);
  const signupOtpInputsRef = useRef([]);

  // OTP Password Recovery Flow State: 'email' | 'otp' | 'password' | 'success'
  const [recoveryStep, setRecoveryStep] = useState('email');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifiedResetToken, setVerifiedResetToken] = useState('');
  const otpInputsRef = useRef([]);

  // Form inputs
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPasswordSignup, setShowConfirmPasswordSignup] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, signup } = useAuth();

  useEffect(() => {
    if (initialMode) {
      setAuthMode(initialMode === 'reset' ? 'forgot' : initialMode);
    }
  }, [initialMode]);

  // 60-second Recovery Resend Cooldown Countdown
  useEffect(() => {
    let timer = null;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // 60-second Registration Resend Cooldown Countdown
  useEffect(() => {
    let timer = null;
    if (signupCooldown > 0) {
      timer = setInterval(() => {
        setSignupCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [signupCooldown]);

  const handleLoginOrSignup = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
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
        if (onSuccess) onSuccess();
      } else if (authMode === 'signup') {
        const cleanEmail = email.trim();
        const cleanUsername = username.trim();
        if (!cleanEmail || !cleanEmail.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (!cleanUsername || cleanUsername.length < 3) {
          throw new Error('Username must be at least 3 characters.');
        }
        if (!password || password.length < 8) {
          throw new Error('Password must be at least 8 characters.');
        }
        if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(password)) {
          throw new Error('Password must contain at least one number or special character.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.');
        }

        const res = await signup(cleanEmail, cleanUsername, password);
        if (res && res.requires_verification) {
          setOtpEmail(cleanEmail);
          setSignupStep('otp');
          setSignupCooldown(res.cooldown_seconds || 60);
          setSignupOtpDigits(['', '', '', '', '', '']);
          setSuccessMsg(res.message || 'A 6-digit verification code has been dispatched to your email.');
          setTimeout(() => {
            signupOtpInputsRef.current[0]?.focus();
          }, 100);
          return;
        }
        if (onSuccess) onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: Registration OTP Input change handler (Numeric only + auto-advance)
  const handleSignupOtpDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...signupOtpDigits];

    if (!cleaned) {
      newDigits[index] = '';
      setSignupOtpDigits(newDigits);
      return;
    }

    newDigits[index] = cleaned[cleaned.length - 1];
    setSignupOtpDigits(newDigits);

    if (index < 5) {
      signupOtpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleSignupOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!signupOtpDigits[index] && index > 0) {
        signupOtpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      signupOtpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      signupOtpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleSignupOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasteData) return;

    const newDigits = [...signupOtpDigits];
    for (let i = 0; i < 6; i++) {
      if (i < pasteData.length) {
        newDigits[i] = pasteData[i];
      }
    }
    setSignupOtpDigits(newDigits);
    const targetIdx = Math.min(pasteData.length, 5);
    signupOtpInputsRef.current[targetIdx]?.focus();
  };

  // STEP 2: Verify Registration 6-digit OTP
  const handleVerifySignupOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const fullOtp = signupOtpDigits.join('');
    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    const cleanEmail = (otpEmail || email).trim();
    setSubmitting(true);
    try {
      await verifySignupOtp(cleanEmail, fullOtp);
      setSignupOtpDigits(['', '', '', '', '', '']);
      setSignupStep('success');
      setSuccessMsg('Your email has been verified and your Trust-Guard account is ready.');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
      setSignupOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        signupOtpInputsRef.current[0]?.focus();
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  // Resend Registration 6-digit OTP (Enforces 60s cooldown)
  const handleResendSignupOtp = async () => {
    if (signupCooldown > 0 || submitting) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    const cleanEmail = (otpEmail || email).trim();
    try {
      await resendSignupOtp(cleanEmail);
      setSignupCooldown(60);
      setSignupOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg('A new verification code has been dispatched to your email.');
      setTimeout(() => {
        signupOtpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to resend verification code. Please wait and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 1: Request 6-digit OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = (email || otpEmail).trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid registered email address.');
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(cleanEmail);
      setOtpEmail(cleanEmail);
      setRecoveryStep('otp');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('60 seconds') || errMsg.toLowerCase().includes('cooldown') || errMsg.toLowerCase().includes('recently sent') || errMsg.toLowerCase().includes('wait')) {
        setOtpEmail(cleanEmail);
        setRecoveryStep('otp');
        setError(errMsg);
      } else {
        setError(errMsg || 'Failed to dispatch verification code. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: Resend 6-digit OTP (Enforces 60s cooldown)
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);

    try {
      await requestPasswordReset(otpEmail);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setSuccessMsg('A new verification code has been dispatched to your email.');
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to resend verification code. Please wait and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 2: OTP Input change handler (Numeric only + auto-advance)
  const handleOtpDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];

    if (!cleaned) {
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    newDigits[index] = cleaned[cleaned.length - 1];
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasteData) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      if (i < pasteData.length) {
        newDigits[i] = pasteData[i];
      }
    }
    setOtpDigits(newDigits);
    const targetIdx = Math.min(pasteData.length, 5);
    otpInputsRef.current[targetIdx]?.focus();
  };

  // STEP 2: Verify 6-digit OTP
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6 || !/^\d{6}$/.test(fullOtp)) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await verifyResetOtp(otpEmail, fullOtp);
      setVerifiedResetToken(res.reset_token);
      // Clear OTP digits immediately so code is not held in memory
      setOtpDigits(['', '', '', '', '', '']);
      setRecoveryStep('password');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
      // Clear OTP digits on failed verification and refocus first input
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } finally {
      setSubmitting(false);
    }
  };

  // STEP 3: Set New Password
  const handleResetPassword = async (e) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!verifiedResetToken) {
      setError('Verification session expired. Please verify your OTP code again.');
      setRecoveryStep('otp');
      return;
    }

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(newPassword)) {
      setError('New password must contain at least one number or special character.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset({
        reset_token: verifiedResetToken,
        new_password: newPassword,
      });
      setNewPassword('');
      setConfirmNewPassword('');
      setVerifiedResetToken('');
      setRecoveryStep('success');
    } catch (err) {
      setError(err.message || 'Failed to reset password. The verification code may have expired.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (newMode) => {
    setError(null);
    setSuccessMsg(null);
    setAuthMode(newMode);
    if (newMode === 'forgot') {
      setRecoveryStep('email');
      setOtpDigits(['', '', '', '', '', '']);
      setVerifiedResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
      if (email && !email.includes('@')) {
        setEmail('');
      }
      setOtpEmail('');
    } else if (newMode === 'signup') {
      setSignupStep('form');
      setSignupOtpDigits(['', '', '', '', '', '']);
      setConfirmPassword('');
      if (email && !email.includes('@')) {
        setEmail('');
      }
    } else if (newMode === 'login') {
      setSignupStep('form');
    }
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
            {authMode === 'signup' && (
              signupStep === 'form' ? 'Create Account' :
              signupStep === 'otp' ? 'Verify Email' :
              'Account Ready'
            )}
            {authMode === 'forgot' && (
              recoveryStep === 'email' ? 'Forgot Password' :
              recoveryStep === 'otp' ? 'Verify Code' :
              recoveryStep === 'password' ? 'Set New Password' :
              'Password Reset'
            )}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            {authMode === 'login' && 'Enter your credentials to access your forensic workspace.'}
            {authMode === 'signup' && (
              signupStep === 'form' ? 'Register to maintain private, user-isolated forensic case archives.' :
              signupStep === 'otp' ? 'Enter the 6-digit code sent to your email.' :
              'Your email has been verified and your Trust-Guard account is ready.'
            )}
            {authMode === 'forgot' && (
              recoveryStep === 'email' ? 'Enter your registered email address to receive a 6-digit verification code.' :
              recoveryStep === 'otp' ? 'OTP sent to your email address.' :
              recoveryStep === 'password' ? 'Choose a strong new password to restore access to your account.' :
              'Your password has been reset successfully.'
            )}
          </p>
        </div>

        {/* Success Feedback */}
        {successMsg && (
          <div
            style={{
              marginBottom: 'var(--space-md)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-success-bg)',
              border: '1px solid var(--color-success-border)',
              color: 'var(--color-success)',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              lineHeight: 1.5,
            }}
          >
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{successMsg}</span>
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
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
            {error.toLowerCase().includes('verify your email') && (
              <button
                type="button"
                onClick={() => {
                  setOtpEmail((email || username).trim());
                  setAuthMode('signup');
                  setSignupStep('otp');
                  setError(null);
                }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  fontSize: '0.82rem',
                }}
              >
                Enter Verification Code &rarr;
              </button>
            )}
          </div>
        )}

        {/* ── Mode 1: Login ── */}
        {authMode === 'login' && (
          <form onSubmit={handleLoginOrSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
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
                Email or Username
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
                  value={username || email}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setEmail(e.target.value);
                  }}
                  placeholder="analyst_01 or email@domain.com"
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
                  <span>CONTINUE</span>
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Mode 2: Registration Flow with Email OTP ── */}
        {authMode === 'signup' && (
          <div>
            {/* STEP 1: Registration Form */}
            {signupStep === 'form' && (
              <form onSubmit={handleLoginOrSignup} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {/* Username */}
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
                      placeholder="e.g. forensic_analyst"
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

                {/* Email Address */}
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
                    Email Address
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

                {/* Password */}
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
                    Password
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
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars with number/special"
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

                {/* Confirm Password */}
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
                    Confirm Password
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
                      type={showConfirmPasswordSignup ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
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
                      onClick={() => setShowConfirmPasswordSignup(!showConfirmPasswordSignup)}
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
                      {showConfirmPasswordSignup ? <EyeOff size={16} /> : <Eye size={16} />}
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
                    marginTop: '8px',
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
                    <span>Sending Code...</span>
                  ) : (
                    <>
                      <span>CREATE ACCOUNT / SEND OTP</span>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Verify Registration OTP Screen */}
            {signupStep === 'otp' && (
              <form onSubmit={handleVerifySignupOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Enter the 6-digit code sent to <strong style={{ color: 'var(--text-primary)' }}>{otpEmail || email}</strong>.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0' }}>
                    {signupOtpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (signupOtpInputsRef.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleSignupOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleSignupOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleSignupOtpPaste : undefined}
                        style={{
                          width: '46px',
                          height: '54px',
                          textAlign: 'center',
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-tertiary)',
                          border: digit ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxShadow: digit ? '0 0 0 1px var(--accent-primary)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                    Code valid for 10 minutes &bull; Single-use only
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={submitting || signupOtpDigits.join('').length !== 6}
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
                      cursor: (submitting || signupOtpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer',
                      opacity: signupOtpDigits.join('').length === 6 ? 1 : 0.65,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      minHeight: '48px',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting && signupOtpDigits.join('').length === 6) {
                        e.currentTarget.style.background = 'var(--accent-primary-hover)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting && signupOtpDigits.join('').length === 6) {
                        e.currentTarget.style.background = 'var(--accent-primary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {submitting ? 'Verifying Code...' : 'VERIFY EMAIL'}
                    <ArrowRight size={17} />
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      disabled={signupCooldown > 0 || submitting}
                      onClick={handleResendSignupOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: signupCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: signupCooldown > 0 ? 'not-allowed' : 'pointer',
                        padding: '4px 0',
                        textDecoration: signupCooldown > 0 ? 'none' : 'underline',
                      }}
                    >
                      {signupCooldown > 0 ? `Resend OTP in ${signupCooldown}s` : 'Resend OTP'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSignupStep('form');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      Edit Info
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: Registration Success Screen */}
            {signupStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-success-bg)',
                    border: '2px solid var(--color-success-border)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                  Account Verified
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                  Your email has been verified and your Trust-Guard account is ready.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
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
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minHeight: '48px',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary-hover)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Mode 3: OTP Password Recovery Flow ── */}
        {authMode === 'forgot' && (
          <div>
            {/* STEP 1: Enter Email */}
            {recoveryStep === 'email' && (
              <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
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
                  {submitting ? 'Sending OTP...' : 'SEND OTP'}
                  <ArrowRight size={17} />
                </button>
              </form>
            )}

            {/* STEP 2: Verify 6-digit OTP */}
            {recoveryStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                  <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    OTP sent to your email address.
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '20px 0' }}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpInputsRef.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        style={{
                          width: '46px',
                          height: '54px',
                          textAlign: 'center',
                          fontSize: '1.4rem',
                          fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--bg-tertiary)',
                          border: digit ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxShadow: digit ? '0 0 0 1px var(--accent-primary)' : 'none',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    ))}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '8px 0 0 0' }}>
                    Code valid for 10 minutes &bull; Single-use only
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={submitting || otpDigits.join('').length !== 6}
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
                      cursor: (submitting || otpDigits.join('').length !== 6) ? 'not-allowed' : 'pointer',
                      opacity: otpDigits.join('').length === 6 ? 1 : 0.65,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      minHeight: '48px',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      if (!submitting && otpDigits.join('').length === 6) {
                        e.currentTarget.style.background = 'var(--accent-primary-hover)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submitting && otpDigits.join('').length === 6) {
                        e.currentTarget.style.background = 'var(--accent-primary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {submitting ? 'Verifying OTP...' : 'VERIFY OTP'}
                    <ArrowRight size={17} />
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || submitting}
                      onClick={handleResendOtp}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--accent-primary)',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                        padding: '4px 0',
                        textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                      }}
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStep('email');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: Set New Password */}
            {recoveryStep === 'password' && (
              <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {/* New Password */}
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
                      placeholder="Min 8 chars with number/symbol"
                      required
                      autoFocus
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

                {/* Confirm New Password */}
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
                    Confirm New Password
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
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
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
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
                  {submitting ? 'Updating...' : 'RESET PASSWORD'}
                  <ArrowRight size={17} />
                </button>
              </form>
            )}

            {/* STEP 4: Success */}
            {recoveryStep === 'success' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-success-bg)',
                    border: '2px solid var(--color-success-border)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                  Password Reset Successful
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
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
                    cursor: 'pointer',
                    minHeight: '48px',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary-hover)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--accent-primary)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            )}
          </div>
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

          {authMode === 'forgot' && recoveryStep !== 'success' && (
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

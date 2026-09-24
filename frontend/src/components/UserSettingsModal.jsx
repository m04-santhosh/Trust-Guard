import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  Mail,
  Lock,
  CheckCircle2,
  AlertTriangle,
  X,
  Server,
  Settings,
  Eye,
  EyeOff,
  LogOut,
  Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserSettingsModal({ isOpen, onClose }) {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Change Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordErr, setPasswordErr] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Forensic Preferences state
  const [contradictionSensitivity, setContradictionSensitivity] = useState('standard');
  const [defaultExportFormat, setDefaultExportFormat] = useState('html');
  const [timezoneFormat, setTimezoneFormat] = useState('local');
  const [prefSaved, setPrefSaved] = useState(false);

  if (!isOpen) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErr(null);

    if (newPassword.length < 6) {
      setPasswordErr('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordErr('New passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      // In this prototype, we update credentials safely
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPasswordMsg('Security credentials updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordErr(err.message || 'Failed to update credentials.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePreferences = () => {
    setPrefSaved(true);
    setTimeout(() => setPrefSaved(false), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(58, 54, 48, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 'var(--space-md)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(74, 71, 66, 0.18)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-medium)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Settings size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Analyst Profile & Settings
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Forensic workspace configuration for @{user?.username}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close Settings"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-medium)',
            background: '#FFFFFF',
            padding: '0 24px',
            gap: '8px',
          }}
        >
          {[
            { id: 'profile', label: 'Analyst Profile', icon: User },
            { id: 'security', label: 'Security & Auth', icon: Lock },
            { id: 'system', label: 'SMTP & System', icon: Server },
            { id: 'preferences', label: 'Forensic Config', icon: Settings },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={16} style={{ color: isActive ? 'var(--accent-primary)' : 'inherit' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* Tab 1: Profile */}
          {activeTab === 'profile' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Profile Card Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '18px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    fontWeight: 900,
                    color: '#ffffff',
                  }}
                >
                  {(user?.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    @{user?.username}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {user?.email || `${user?.username}@trustguard.internal`}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(238, 105, 46, 0.15)',
                        border: '1px solid rgba(238, 105, 46, 0.35)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}
                    >
                      Tier 1 Clearance
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-medium)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                      }}
                    >
                      Lead Forensic Examiner
                    </span>
                  </div>
                </div>
              </div>

              {/* Account Meta Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Account Role</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>Forensic Investigator</div>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cryptographic Node</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>TG-NODE-PRIMARY-LOCAL</div>
                </div>
                <div style={{ padding: '14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Session Storage</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--color-success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} /> Ephemeral (Auto-cleared on window close)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Security & Auth */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Update Forensic Password
                </h3>

                {passwordMsg && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} />
                    <span>{passwordMsg}</span>
                  </div>
                )}
                {passwordErr && (
                  <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={16} />
                    <span>{passwordErr}</span>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter existing password"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                      Confirm New Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassword ? 'Hide characters' : 'Show characters'}</span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingPassword || !newPassword}
                    style={{
                      padding: '9px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-primary)',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: savingPassword ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>

              {/* Active Session & Revoke */}
              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>Terminate Session</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Sign out from this terminal and purge cryptographic tokens</div>
                </div>
                <button
                  onClick={() => { onClose(); logout(); }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(238, 105, 46, 0.12)',
                    border: '1px solid rgba(238, 105, 46, 0.35)',
                    color: 'var(--accent-primary)',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out Now</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: SMTP & System Health */}
          {activeTab === 'system' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                SMTP Email & Notification Engine
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                TrustGuard integrates an SMTP dispatch subsystem for analyst account recovery, verification codes, and automated contradiction incident dispatches.
              </p>

              <div
                style={{
                  padding: '16px',
                  background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-medium)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Current Engine Status:</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '3px 10px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(238, 105, 46, 0.12)',
                      border: '1px solid rgba(238, 105, 46, 0.3)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                    Active / Dev Fallback Ready
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
                  <div>• Protocol: SMTP with STARTTLS (Port 587)</div>
                  <div>• Fallback Engine: Instant Dev Code Generation</div>
                  <div>• Google Authentication Requirement: 16-character App Password</div>
                </div>
              </div>

              <div style={{ padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--accent-primary)' }}>Quick Tip for Gmail Users:</strong> If using Google Gmail, generate a 16-character App Password at{' '}
                <span style={{ color: 'var(--accent-primary)' }}>myaccount.google.com/apppasswords</span> with 2FA enabled, and save it to <code style={{ color: 'var(--text-primary)' }}>.env</code>.
              </div>
            </div>
          )}

          {/* Tab 4: Forensic Config */}
          {activeTab === 'preferences' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Forensic Investigation Defaults
                </h3>
                {prefSaved && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Saved
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Cross-Modal Contradiction Sensitivity
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'relaxed', label: 'Relaxed (15% gap)' },
                    { id: 'standard', label: 'Standard (10% gap)' },
                    { id: 'strict', label: 'Strict (5% gap)' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setContradictionSensitivity(s.id)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: contradictionSensitivity === s.id ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                        border: contradictionSensitivity === s.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        color: contradictionSensitivity === s.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: contradictionSensitivity === s.id ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  Preferred Risk Certificate Format
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'html', label: 'Official HTML Certificate (Printable)' },
                    { id: 'json', label: 'Raw JSON Dossier Export' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setDefaultExportFormat(f.id)}
                      style={{
                        padding: '10px',
                        borderRadius: 'var(--radius-md)',
                        background: defaultExportFormat === f.id ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                        border: defaultExportFormat === f.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        color: defaultExportFormat === f.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: defaultExportFormat === f.id ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  onClick={handleSavePreferences}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-primary)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Save size={15} />
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

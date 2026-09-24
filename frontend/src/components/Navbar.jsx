import React, { useEffect, useState, useRef } from 'react';
import {
  FolderArchive,
  PlusCircle,
  FileText,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  ChevronDown,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserSettingsModal from './UserSettingsModal';

export default function Navbar({ activeTab, onTabChange }) {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const apiBase = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
    fetch(`${apiBase}/health`)
      .then((res) => {
        if (res.ok) setBackendStatus('online');
        else setBackendStatus('offline');
      })
      .catch(() => setBackendStatus('offline'));
  }, []);

  const handleNavClick = (tab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await logout();
    onTabChange('auth');
    setMobileMenuOpen(false);
  };

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-medium)',
        background: 'rgba(245, 241, 233, 0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '0 var(--space-xl)',
        boxShadow: '0 2px 10px rgba(74, 71, 66, 0.06)',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          height: '66px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand: Clean modern typography */}
        <div
          onClick={() => handleNavClick(isAuthenticated ? 'upload' : 'auth')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            userSelect: 'none',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={18} color="#ffffff" />
          </div>
          <span
            style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              letterSpacing: '-0.025em',
              background: 'linear-gradient(135deg, var(--text-primary) 60%, var(--accent-primary) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            TrustGuard
          </span>
        </div>

        {/* Mobile menu toggle button (only when authenticated) */}
        {isAuthenticated && (
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            style={{
              display: 'none',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              padding: '8px',
              cursor: 'pointer',
              minHeight: '40px',
              minWidth: '40px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}

        {/* Navigation & User Actions Container */}
        {isAuthenticated ? (
          <div
            className={`nav-links-wrapper ${mobileMenuOpen ? 'mobile-open' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}
          >
            {/* Workspace Navigation Tabs with sleek active indicators & smooth transitions */}
            <nav style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'upload', label: 'New Analysis', icon: PlusCircle },
                { id: 'my_reports', label: 'My Reports', icon: FileText },
                { id: 'history', label: 'Case Archives', icon: FolderArchive },
              ].map((item) => {
                const isActive = activeTab === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'var(--accent-primary)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: isActive ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      fontSize: '0.86rem',
                      fontWeight: isActive ? 600 : 500,
                      cursor: 'pointer',
                      minHeight: '40px',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'var(--bg-secondary)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    <IconComponent
                      size={16}
                      style={{
                        color: isActive ? '#ffffff' : 'inherit',
                        transition: 'color 0.2s ease',
                      }}
                    />
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: '#ffffff',
                          marginLeft: '2px',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Vertical Separator */}
            <div style={{ height: '26px', width: '1px', background: 'var(--border-medium)' }} />

            {/* Right-Side User Profile Menu & Sign Out */}
            <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Interactive User Identity Button */}
              <button
                id="user-profile-btn"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label="User Profile and Session Information"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px 5px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: userMenuOpen ? '#FFFFFF' : 'var(--bg-secondary)',
                  border: userMenuOpen ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                  boxShadow: '0 1px 4px rgba(74, 71, 66, 0.08)',
                  cursor: 'pointer',
                  color: 'inherit',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.background = '#FFFFFF';
                }}
                onMouseLeave={(e) => {
                  if (!userMenuOpen) {
                    e.currentTarget.style.borderColor = 'var(--border-medium)';
                    e.currentTarget.style.background = 'var(--bg-secondary)';
                  }
                }}
              >
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: '#ffffff',
                  }}
                >
                  {(user?.username || 'U')[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  @{user?.username}
                </span>
                <ChevronDown
                  size={14}
                  style={{
                    color: 'var(--text-muted)',
                    transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                />
              </button>

              {/* Analyst Profile Dropdown Popover */}
              {userMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '290px',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 10px 30px rgba(74, 71, 66, 0.12)',
                    padding: 'var(--space-md)',
                    zIndex: 200,
                    animation: 'fadeIn 0.15s ease',
                  }}
                >
                  {/* Analyst Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#ffffff',
                      }}
                    >
                      {(user?.username || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        @{user?.username}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                        {user?.email || `${user?.username}@trustguard.internal`}
                      </div>
                    </div>
                  </div>

                  {/* Status / Clearance Badge */}
                  <div style={{ margin: '12px 0', padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clearance</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                        Verified Active
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Shield size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span>Role: Forensic Analyst</span>
                    </div>
                  </div>

                  {/* Quick Action Navigation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                    <button
                      onClick={() => { setUserMenuOpen(false); onTabChange('my_reports'); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <FileText size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span>My Personal Reports</span>
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); onTabChange('upload'); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <PlusCircle size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span>New Forensic Analysis</span>
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); onTabChange('history'); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <FolderArchive size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span>Global Case Archives</span>
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); setSettingsOpen(true); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <Settings size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span>Analyst Settings & Profile</span>
                    </button>
                  </div>

                  {/* Sign Out Button in Dropdown */}
                  <button
                    onClick={() => { setUserMenuOpen(false); handleSignOut(); }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(238, 105, 46, 0.1)',
                      border: '1px solid rgba(238, 105, 46, 0.3)',
                      color: 'var(--accent-primary)',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--accent-primary)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(238, 105, 46, 0.1)';
                      e.currentTarget.style.color = 'var(--accent-primary)';
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}

              {/* Dedicated Sign Out Button */}
              <button
                onClick={handleSignOut}
                title="Sign Out of Workspace"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: '40px',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-primary)';
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = 'var(--border-medium)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* Unauthenticated Header: Clean minimal brand header */
          null
        )}
      </div>

      {/* User Settings & Profile Modal */}
      <UserSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}

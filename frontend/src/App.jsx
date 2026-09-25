import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';
import MyReportsPage from './pages/MyReportsPage';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshCw, Shield } from 'lucide-react';

/**
 * Smooth page transition animation variants.
 * Applied via framer-motion to each page swap for polished UX.
 */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

const getTabFromPath = (pathname) => {
  const p = (pathname || window.location.pathname || '').toLowerCase();
  if (p === '/history' || p === '/archives') return 'history';
  if (p === '/my_reports' || p === '/my-reports' || p === '/reports') return 'my_reports';
  if (p === '/analysis') return 'analysis';
  if (p === '/login' || p === '/auth' || p === '/signup') return 'auth';
  return 'upload'; // default dashboard route ('/' or '/dashboard')
};

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(window.location.pathname));
  const [previousTab, setPreviousTab] = useState('upload');
  const [currentCaseFile, setCurrentCaseFile] = useState(null);

  // Sync browser URL whenever activeTab changes for authenticated users
  const navigateToTab = (tab, replace = false) => {
    setActiveTab(tab);
    let targetPath = '/dashboard';
    if (tab === 'history') targetPath = '/history';
    else if (tab === 'my_reports') targetPath = '/my-reports';
    else if (tab === 'analysis') targetPath = '/analysis';
    else if (tab === 'auth') targetPath = '/login';

    if (window.location.pathname !== targetPath) {
      if (replace) {
        window.history.replaceState({ tab }, '', targetPath);
      } else {
        window.history.pushState({ tab }, '', targetPath);
      }
    }
  };

  // Listen to browser Back/Forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const tab = getTabFromPath(window.location.pathname);
      setActiveTab(tab);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // AUTH GUARD: Enforce authentication on root ('/'), '/dashboard', and all protected routes
  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      // If unauthenticated, redirect any protected route or root to /login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        window.history.replaceState({ tab: 'auth' }, '', '/login');
      }
      setActiveTab('auth');
    } else {
      // If already authenticated and visiting /login or /auth, redirect to /dashboard
      const p = window.location.pathname.toLowerCase();
      if (p === '/login' || p === '/auth' || p === '/signup') {
        window.history.replaceState({ tab: 'upload' }, '', '/dashboard');
        setActiveTab('upload');
      } else if (p === '/' || p === '') {
        window.history.replaceState({ tab: 'upload' }, '', '/dashboard');
      }
    }
  }, [isAuthenticated, loading]);

  const handleAnalysisComplete = (caseFile) => {
    setPreviousTab('upload');
    setCurrentCaseFile(caseFile);
    navigateToTab('analysis');
  };

  const handleSelectCase = (caseFile) => {
    setPreviousTab(activeTab);
    setCurrentCaseFile(caseFile);
    navigateToTab('analysis');
  };

  const handleBack = () => {
    navigateToTab(previousTab || 'my_reports');
  };

  const handleNewAnalysis = () => {
    setCurrentCaseFile(null);
    navigateToTab('upload');
  };

  // If validating session token from storage on startup
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-muted)',
        }}
      >
        <RefreshCw size={28} className="spin" style={{ color: 'var(--accent-primary)', marginBottom: '12px' }} />
        <p style={{ fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
          Validating forensic credentials...
        </p>
      </div>
    );
  }

  // ── STRICT AUTH GUARD ──
  // If not authenticated, render ONLY the Login / Signup screen.
  // Dashboard and evidence pipelines are completely blocked until successful login.
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Minimal branding header for the auth portal */}
        <header
          style={{
            borderBottom: '1px solid var(--border-medium)',
            background: 'rgba(245, 241, 233, 0.96)',
            padding: '16px var(--space-xl)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <span
              style={{
                marginLeft: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent-primary)',
                background: 'rgba(238, 105, 46, 0.12)',
                padding: '3px 8px',
                borderRadius: '4px',
              }}
            >
              Forensic Gateway
            </span>
          </div>
        </header>

        {/* Auth Guard Portal View */}
        <main
          style={{
            flex: 1,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-2xl) var(--space-md)',
          }}
        >
          <motion.div
            key="auth-guard-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
          >
            <AuthPage
              initialMode={window.location.pathname === '/signup' ? 'signup' : 'login'}
              onSuccess={() => {
                navigateToTab('upload', true);
              }}
              // No onBack callback passed: cannot bypass auth to access dashboard
            />
          </motion.div>
        </main>
      </div>
    );
  }

  // ── AUTHENTICATED USER WORKSPACE ──
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navigation with tabs, sign-in button or user profile menu */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setPreviousTab(activeTab);
          if (tab === 'upload') handleNewAnalysis();
          else navigateToTab(tab);
        }}
      />

      {/* Main Workspace Content Area with smooth page transitions */}
      <main style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width: '100%' }}>
              <UploadPage
                onAnalysisComplete={handleAnalysisComplete}
                onSignInClick={() => navigateToTab('auth')}
              />
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div key="analysis" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width: '100%' }}>
              <AnalysisPage
                caseFile={currentCaseFile}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {activeTab === 'my_reports' && (
            <motion.div key="my_reports" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width: '100%' }}>
              <MyReportsPage
                onSelectCase={handleSelectCase}
                onNewAnalysis={handleNewAnalysis}
                onBack={() => navigateToTab('upload')}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" variants={pageVariants} initial="initial" animate="animate" exit="exit" style={{ width: '100%' }}>
              <HistoryPage
                onSelectCase={handleSelectCase}
                onNewAnalysis={handleNewAnalysis}
                onBack={() => navigateToTab('upload')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

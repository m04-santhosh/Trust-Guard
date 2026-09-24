import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';
import MyReportsPage from './pages/MyReportsPage';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshCw } from 'lucide-react';

/**
 * Smooth page transition animation variants.
 * Applied via framer-motion to each page swap for polished UX.
 */
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('upload');
  const [previousTab, setPreviousTab] = useState('upload');
  const [currentCaseFile, setCurrentCaseFile] = useState(null);

  const handleAnalysisComplete = (caseFile) => {
    setPreviousTab('upload');
    setCurrentCaseFile(caseFile);
    setActiveTab('analysis');
  };

  const handleSelectCase = (caseFile) => {
    setPreviousTab(activeTab);
    setCurrentCaseFile(caseFile);
    setActiveTab('analysis');
  };

  const handleBack = () => {
    setActiveTab(previousTab || 'my_reports');
  };

  const handleNewAnalysis = () => {
    setCurrentCaseFile(null);
    setActiveTab('upload');
  };

  // If validating session token from localStorage
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

  // ── 1. Unauthenticated Gateway State: Sign In page ALWAYS comes first ──
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
        {/* Clean minimal navbar with no workspace links and no right-side buttons */}
        <Navbar activeTab="auth" onTabChange={() => {}} />

        {/* 2-Column Split Hero Auth Page */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-2xl) var(--space-md)',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <AuthPage
              onSuccess={() => {
                setActiveTab('upload');
              }}
            />
          </motion.div>
        </main>
      </div>
    );
  }

  // ── 2. Authenticated Workspace State (Entered after successful Sign In) ──
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Top Navigation with tabs & user sign-out */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setPreviousTab(activeTab);
          if (tab === 'upload') handleNewAnalysis();
          else setActiveTab(tab);
        }}
      />

      {/* Main Workspace Content Area with smooth page transitions */}
      <main style={{ flex: 1 }}>
        <AnimatePresence mode="wait">
          {activeTab === 'upload' && (
            <motion.div key="upload" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <UploadPage onAnalysisComplete={handleAnalysisComplete} />
            </motion.div>
          )}

          {activeTab === 'analysis' && (
            <motion.div key="analysis" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <AnalysisPage
                caseFile={currentCaseFile}
                onBack={handleBack}
              />
            </motion.div>
          )}

          {activeTab === 'my_reports' && (
            <motion.div key="my_reports" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <MyReportsPage
                onSelectCase={handleSelectCase}
                onNewAnalysis={handleNewAnalysis}
                onBack={() => setActiveTab('upload')}
              />
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" variants={pageVariants} initial="initial" animate="animate" exit="exit">
              <HistoryPage
                onSelectCase={handleSelectCase}
                onNewAnalysis={handleNewAnalysis}
                onBack={() => setActiveTab('upload')}
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

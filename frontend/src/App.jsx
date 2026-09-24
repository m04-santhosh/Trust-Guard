import React, { useState } from 'react';
import Navbar from './components/Navbar';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import HistoryPage from './pages/HistoryPage';
import MyReportsPage from './pages/MyReportsPage';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RefreshCw } from 'lucide-react';

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
          <AuthPage
            onSuccess={() => {
              setActiveTab('upload');
            }}
          />
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

      {/* Main Workspace Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'upload' && (
          <UploadPage onAnalysisComplete={handleAnalysisComplete} />
        )}

        {activeTab === 'analysis' && (
          <AnalysisPage
            caseFile={currentCaseFile}
            onBack={handleBack}
          />
        )}

        {activeTab === 'my_reports' && (
          <MyReportsPage
            onSelectCase={handleSelectCase}
            onNewAnalysis={handleNewAnalysis}
            onBack={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'history' && (
          <HistoryPage
            onSelectCase={handleSelectCase}
            onNewAnalysis={handleNewAnalysis}
            onBack={() => setActiveTab('upload')}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

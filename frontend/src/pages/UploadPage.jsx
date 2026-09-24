import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Sparkles,
  FileText,
  ArrowRight,
  AlertTriangle,
  Layers,
  CheckCircle2,
  FileVideo,
  X,
  PlayCircle,
  HelpCircle,
} from 'lucide-react';
import UploadZone from '../components/UploadZone';
import AnalysisProgress from '../components/AnalysisProgress';
import { analyzeMedia, analyzePreset } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PRESET_SCENARIOS = [
  {
    id: 'contradiction',
    title: 'Cross-Modal Contradiction',
    tag: 'Flagship Scenario',
    description: 'Authentic visual recording paired with synthetic audio clone. Watch the Disagreement Engine flag the contradiction.',
    caption: 'Elon Musk announces special treasury investment program offering 10x returns.',
    defaultFileName: 'musk_ai_speech_sample.mp4',
    badge: 'Contradiction Demo',
    badgeClass: 'badge-danger',
  },
  {
    id: 'clean',
    title: 'Authentic Verified Broadcast',
    tag: 'Baseline Scenario',
    description: 'Clean video and synchronized audio with consistent acoustic and visual signatures.',
    caption: 'Press conference statement on local municipal infrastructure project.',
    defaultFileName: 'press_conference_real.mp4',
    badge: 'Clean Sample',
    badgeClass: 'badge-success',
  },
  {
    id: 'financial_scam',
    title: 'High-Impact Impersonation Claim',
    tag: 'Context Risk Demo',
    description: 'Executive persona paired with urgent cryptocurrency / bank account wire demand.',
    caption: 'CEO emergency broadcast instructing immediate wire transfer to secure partner bank accounts.',
    defaultFileName: 'urgent_financial_appeal.mp4',
    badge: 'Critical Risk',
    badgeClass: 'badge-warning',
  },
];

export default function UploadPage({ onAnalysisComplete }) {
  const { token, user } = useAuth();
  const [file, setFile] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [caption, setCaption] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingTargetName, setAnalyzingTargetName] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const startAnalysis = async (mediaFile, mediaCaption) => {
    // If a benchmark is selected instead of uploaded file
    if (!mediaFile && selectedPreset) {
      handleRunPreset(selectedPreset);
      return;
    }

    if (!mediaFile) {
      setError('Please select or drop a media file to analyze, or choose a benchmark sample below.');
      return;
    }

    setIsAnalyzing(true);
    setAnalyzingTargetName(mediaFile.name);
    setError(null);
    setProgress(15);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 92;
        }
        return prev + 18;
      });
    }, 400);

    try {
      const caseFile = await analyzeMedia(mediaFile, mediaCaption, token);
      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setIsAnalyzing(false);
        if (onAnalysisComplete) {
          onAnalysisComplete(caseFile);
        }
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setIsAnalyzing(false);
      setError(err.message || 'Analysis failed. Please ensure the backend is running.');
    }
  };

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setFile(null); // Clear manual file upload to prioritize selected benchmark
    setCaption(preset.caption);
    setError(null);
  };

  const handleClearSelectedPreset = () => {
    setSelectedPreset(null);
    setCaption('');
  };

  const handleRunPreset = async (preset) => {
    setSelectedPreset(preset);
    setCaption(preset.caption);
    setIsAnalyzing(true);
    setAnalyzingTargetName(preset.defaultFileName);
    setError(null);
    setProgress(20);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 92;
        }
        return prev + 18;
      });
    }, 350);

    try {
      const caseFile = await analyzePreset(preset.id, token);
      clearInterval(interval);
      setProgress(100);

      setTimeout(() => {
        setIsAnalyzing(false);
        if (onAnalysisComplete) {
          onAnalysisComplete(caseFile);
        }
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setIsAnalyzing(false);
      setError(err.message || 'Preset analysis failed. Please verify the backend is running.');
    }
  };

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: 'var(--space-2xl) var(--space-md)' }}>
      {/* Hero Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(238, 105, 46, 0.12)',
            border: '1px solid rgba(238, 105, 46, 0.3)',
            color: 'var(--accent-primary)',
            fontSize: '0.8rem',
            fontWeight: 600,
            marginBottom: 'var(--space-md)',
          }}
        >
          <Sparkles size={14} /> Multi-Modal Disagreement & Risk Dossier Engine
        </div>
        <h1
          style={{
            fontSize: '2.5rem',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, var(--text-primary) 65%, var(--accent-primary) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: 'var(--space-md)',
          }}
        >
          We Don’t Return a Verdict. We Return a Case File.
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--text-secondary)',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Existing tools return a single deceptive score. TrustGuard isolates visual and audio modalities, surfaces cross-modal contradictions, evaluates identity risk, and structures an evidence trail for human decision-makers.
        </p>
      </motion.div>

      {/* Main Upload Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-2xl)',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
        }}
      >
        {isAnalyzing ? (
          <div style={{ padding: 'var(--space-lg) 0' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(238, 105, 46, 0.15)',
                  border: '2px solid var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Shield size={30} color="var(--accent-primary)" />
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Building Forensic Case Dossier...
              </h3>
              <p style={{ color: 'var(--accent-primary)', fontSize: '0.92rem', marginTop: '6px', fontWeight: 600 }}>
                Target File: {analyzingTargetName}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px', maxWidth: '520px', margin: '4px auto 0' }}>
                Running independent visual ELA/FFT pipelines, acoustic spectrogram engines, and cross-modal contradiction detection.
              </p>
              {user && (
                <div style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Linking evidence records to investigator @{user.username}...
                </div>
              )}
            </div>
            <AnalysisProgress progress={progress} />
          </div>
        ) : (
          <div>
            {/* If a Benchmark was loaded by the user, show prominent badge */}
            {selectedPreset && (
              <div
                style={{
                  marginBottom: 'var(--space-lg)',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(238, 105, 46, 0.12)',
                  border: '1px solid rgba(238, 105, 46, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileVideo size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Pre-Packaged Benchmark Sample Selected:{' '}
                      <span style={{ color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
                        {selectedPreset.defaultFileName}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {selectedPreset.title} — {selectedPreset.tag}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedPreset}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} /> Clear Sample
                </button>
              </div>
            )}

            {/* Upload Dropzone */}
            <UploadZone
              onFileSelected={(f) => {
                setFile(f);
                if (f) setSelectedPreset(null); // Clear preset if user drops their own file
              }}
              disabled={isAnalyzing}
            />

            {/* Optional Caption Input */}
            <div style={{ marginTop: 'var(--space-xl)' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  marginBottom: 'var(--space-xs)',
                  fontWeight: 500,
                }}
              >
                <FileText size={14} style={{ color: 'var(--accent-primary)' }} />
                Accompanying Caption or Post Text (Optional):
              </label>
              <textarea
                rows={2}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Paste associated social media caption, headline, or claim to evaluate context risk..."
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  resize: 'none',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  marginTop: 'var(--space-md)',
                  padding: '10px 16px',
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
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Action */}
            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
              {!file && !selectedPreset && (
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Select or drop a file above, or pick a benchmark sample below
                </span>
              )}
              <button
                onClick={() => startAnalysis(file, caption)}
                disabled={(!file && !selectedPreset) || isAnalyzing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 28px',
                  borderRadius: 'var(--radius-md)',
                  background: (file || selectedPreset)
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : 'var(--bg-tertiary)',
                  color: (file || selectedPreset) ? '#ffffff' : 'var(--text-muted)',
                  border: (file || selectedPreset) ? 'none' : '1px solid var(--border-subtle)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  cursor: (file || selectedPreset) ? 'pointer' : 'not-allowed',
                  transition: 'all var(--transition-base)',
                  minHeight: '46px',
                }}
              >
                {selectedPreset ? (
                  <>
                    <span>Analyze Benchmark: {selectedPreset.defaultFileName}</span>
                    <ArrowRight size={18} />
                  </>
                ) : file ? (
                  <>
                    <span>Initiate Multi-Modal Analysis</span>
                    <ArrowRight size={18} />
                  </>
                ) : (
                  <>
                    <span>Upload or Select Sample to Analyze</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preset Test Scenarios Section (Clearly Labeled as Built-in Benchmark Files) */}
      {!isAnalyzing && (
        <div style={{ marginTop: 'var(--space-3xl)' }}>
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Layers size={18} style={{ color: 'var(--accent-primary)' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Pre-Loaded Forensic Benchmark Test Samples
              </h3>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(238, 105, 46, 0.14)',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                }}
              >
                No Upload Required
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
              Don’t have a test video on your machine? These 3 cards represent built-in sample cases stored on the server. Click "Load Sample" to test the Disagreement Engine without uploading.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
              gap: 'var(--space-lg)',
            }}
          >
            {PRESET_SCENARIOS.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              return (
                <div
                  key={preset.id}
                  style={{
                    background: isSelected ? 'rgba(238, 105, 46, 0.1)' : 'var(--bg-card)',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-lg)',
                    transition: 'all var(--transition-base)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? '0 2px 10px rgba(238, 105, 46, 0.2)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {preset.tag}
                      </span>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background:
                            preset.id === 'contradiction'
                              ? 'var(--color-danger-bg)'
                              : preset.id === 'clean'
                              ? 'var(--color-success-bg)'
                              : 'var(--color-warning-bg)',
                          color:
                            preset.id === 'contradiction'
                              ? 'var(--color-danger)'
                              : preset.id === 'clean'
                              ? 'var(--color-success)'
                              : 'var(--color-warning)',
                          fontWeight: 600,
                        }}
                      >
                        {preset.badge}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 'var(--space-xs)' }}>
                      {preset.title}
                    </h4>

                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 'var(--space-sm)' }}>
                      {preset.description}
                    </p>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-secondary)',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <FileVideo size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span>{preset.defaultFileName}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--space-md)',
                      paddingTop: 'var(--space-sm)',
                      borderTop: '1px solid var(--border-subtle)',
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'var(--accent-primary)' : '#FFFFFF',
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        border: '1px solid var(--border-medium)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      {isSelected ? <CheckCircle2 size={14} /> : null}
                      {isSelected ? 'Loaded into Workspace' : 'Load Sample'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunPreset(preset)}
                      title={`Immediately run evaluation on ${preset.defaultFileName}`}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(238, 105, 46, 0.12)',
                        color: 'var(--accent-primary)',
                        border: '1px solid rgba(238, 105, 46, 0.3)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <PlayCircle size={14} />
                      <span>Run Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

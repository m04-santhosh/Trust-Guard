import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileVideo, FileAudio, Image, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ACCEPTED_TYPES = {
  'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
  'audio/*': ['.wav', '.mp3', '.flac', '.ogg', '.m4a'],
  'image/*': ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp'],
};

function getFileIcon(file) {
  if (!file) return Upload;
  const type = file.type || '';
  if (type.startsWith('video')) return FileVideo;
  if (type.startsWith('audio')) return FileAudio;
  if (type.startsWith('image')) return Image;
  return Upload;
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function UploadZone({ onFileSelected, disabled }) {
  const [file, setFile] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setFile(accepted[0]);
      onFileSelected(accepted[0]);
    }
  }, [onFileSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: 1,
    disabled,
  });

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    onFileSelected(null);
  };

  const Icon = getFileIcon(file);

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${isDragActive ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3xl) var(--space-xl)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: isDragActive ? 'var(--accent-primary-glow)' : 'var(--bg-glass)',
        transition: 'all var(--transition-base)',
        opacity: disabled ? 0.5 : 1,
        position: 'relative',
      }}
    >
      <input {...getInputProps()} />

      <AnimatePresence mode="wait">
        {file ? (
          <motion.div
            key="file-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <Icon size={48} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem' }}>
                {file.name}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
                {formatSize(file.size)} · {file.type || 'unknown type'}
              </p>
            </div>
            {!disabled && (
              <button
                onClick={clearFile}
                className="btn btn-ghost"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                <X size={14} /> Remove
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <Upload
              size={48}
              style={{
                color: isDragActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                transition: 'color var(--transition-base)',
              }}
            />
            <div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1.1rem' }}>
                {isDragActive ? 'Drop your file here' : 'Drop media here or click to browse'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '6px' }}>
                Video · Audio · Image
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useNavigate } from 'react-router-dom';

export default function QRScanner({ isOpen, onClose }) {
  const [error, setError] = useState('');
  const [manualId, setManualId] = useState('');
  const navigate = useNavigate();

  const handleScan = (detectedCodes) => {
    const code = detectedCodes?.[0];
    if (!code?.rawValue) return;
    try {
      const url = new URL(code.rawValue);
      const match = url.pathname.match(/^\/d\/(.+)/);
      if (match) {
        navigate(`/device/${match[1]}`);
        onClose();
      }
    } catch {
      // not a valid URL
    }
  };

  const handleError = (err) => {
    setError(err?.message || 'Camera access denied');
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const id = manualId.trim();
    if (id) {
      navigate(`/device/${id}`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-canvas flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0 border-b border-hairline">
        <button
          onClick={onClose}
          className="min-touch flex items-center justify-center text-ink-2 hover:text-ink border border-hairline-2 w-9 h-9"
          aria-label="Close scanner"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-[13px] font-semibold text-ink label-mono">Scan QR Code</span>
        <div className="w-9" />
      </div>

      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <div className="w-full max-w-[280px] aspect-square relative overflow-hidden">
          <Scanner
            onScan={handleScan}
            onError={handleError}
            constraints={{ facingMode: 'environment' }}
            scanDelay={500}
            styles={{
              container: { height: '100%', width: '100%' },
              video: { objectFit: 'cover' },
            }}
          />

          {/* Frame — sharp corners only, monochrome */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white" />
          </div>

          {/* Animated scan line */}
          <div
            className="absolute left-0 right-0 h-px bg-white/70 pointer-events-none"
            style={{ animation: 'scan-line 2s linear infinite' }}
          />
        </div>
      </div>

      {/* Status / fallback */}
      {error ? (
        <div className="px-4 pb-6 flex-shrink-0">
          <div className="bg-surface border border-hairline-2 text-ink text-[13px] px-4 py-3 mb-4 text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {error}
          </div>
          <p className="text-center text-ink-3 text-[12px] mb-3 label-mono">
            Enter device ID manually
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="device id"
              className="flex-1 h-12 px-4 bg-surface border border-hairline text-ink text-[15px] placeholder:text-ink-4 outline-none focus:border-white transition-colors"
            />
            <button
              type="submit"
              className="h-12 px-5 bg-white text-canvas text-[14px] font-semibold hover:bg-ink-2 transition-colors tap-highlight"
            >
              Go
            </button>
          </form>
        </div>
      ) : (
        <p className="text-center text-ink-2 text-[13px] pb-8 px-4 flex-shrink-0 label-mono">
          Point camera at device QR code
        </p>
      )}
    </div>
  );
}

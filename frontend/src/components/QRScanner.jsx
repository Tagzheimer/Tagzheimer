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
    <div className="fixed inset-0 z-[70] bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 h-14 flex-shrink-0">
        <button
          onClick={onClose}
          className="min-touch flex items-center justify-center text-white"
          aria-label="Close scanner"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <span className="text-white text-[17px] font-medium">Scan QR Code</span>
        <div className="w-12" />
      </div>

      <div className="flex-1 relative flex items-center justify-center p-8">
        <div className="w-full max-w-[280px] aspect-square relative overflow-hidden rounded-2xl">
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
          <div className="absolute inset-0 border-[3px] border-primary/60 rounded-2xl pointer-events-none" />
          <div className="absolute -top-[3px] -left-[3px] w-8 h-8 border-t-[3px] border-l-[3px] border-primary rounded-tl-2xl" />
          <div className="absolute -top-[3px] -right-[3px] w-8 h-8 border-t-[3px] border-r-[3px] border-primary rounded-tr-2xl" />
          <div className="absolute -bottom-[3px] -left-[3px] w-8 h-8 border-b-[3px] border-l-[3px] border-primary rounded-bl-2xl" />
          <div className="absolute -bottom-[3px] -right-[3px] w-8 h-8 border-b-[3px] border-r-[3px] border-primary rounded-br-2xl" />
        </div>
      </div>

      {error ? (
        <div className="px-4 pb-4 flex-shrink-0">
          <div className="bg-red-900/50 text-red-200 text-[14px] rounded-xl px-4 py-3 mb-3 text-center">
            {error}
          </div>
          <p className="text-center text-white/50 text-[13px] mb-3">
            You can enter the device ID manually below
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Paste device ID"
              className="flex-1 h-12 px-4 bg-white/10 border border-white/20 rounded-xl text-white text-[16px] placeholder-white/40 outline-none focus:border-primary/50"
            />
            <button
              type="submit"
              className="h-12 px-5 bg-primary text-white text-[15px] font-medium rounded-xl tap-highlight"
            >
              Go
            </button>
          </form>
        </div>
      ) : (
        <p className="text-center text-white/70 text-[15px] pb-8 px-4 flex-shrink-0">
          Point the camera at a device QR code
        </p>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { useDevices } from '../hooks/useDevices';
import { getBackendUrl, setBackendUrl, isCustomBackend, pingBackend } from '../services/backendConfig';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { totalDevices, activeDevices, refresh } = useDevices();

  // === Backend URL state ===
  const [backendUrl, setBackendUrlState] = useState('');
  const [custom, setCustom] = useState(false);
  const [health, setHealth] = useState({ ok: null, message: '' });
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setBackendUrlState(getBackendUrl());
    setCustom(isCustomBackend());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setHealth({ ok: null, message: 'Checking...' });
    pingBackend(backendUrl).then((r) => {
      if (!cancelled) setHealth(r);
    });
    return () => { cancelled = true; };
  }, [backendUrl]);

  const handleSave = () => {
    setBackendUrl(backendUrl);
    setCustom(isCustomBackend());
    setSavedAt(Date.now());
    // Refresh device list against new backend
    refresh();
  };

  const handleReset = () => {
    setBackendUrl(''); // clears the localStorage override
    const env = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    setBackendUrlState(env);
    setCustom(false);
    setSavedAt(Date.now());
    refresh();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('');

  return (
    <>
      <Header title="Profile" />
      <div className="flex-1 overflow-y-auto px-4 md:px-0 pt-8 md:pt-12 pb-24 md:pb-10">
        <div className="max-w-lg mx-auto">
          {/* Identity */}
          <div className="text-center mb-10">
            <div className="w-20 h-20 border border-hairline-2 mx-auto mb-5 flex items-center justify-center relative">
              <span className="text-2xl font-bold text-ink">{initials}</span>
              <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-white" />
              <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-white" />
              <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-white" />
              <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-white" />
            </div>
            <div className="label-mono mb-1">Caregiver</div>
            <h2 className="text-2xl font-bold text-ink tracking-tight">{user?.name || 'User'}</h2>
            <p className="text-[14px] text-ink-3 mt-1">{user?.email || ''}</p>
          </div>

          {/* Backend URL config — the new "deploy anywhere" feature */}
          <div className="bg-surface border border-hairline mb-6 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-hairline-3" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-hairline-3" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-hairline-3" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hairline-3" />

            <div className="label-mono px-5 py-3 border-b border-hairline flex items-center justify-between">
              <span>Backend Connection</span>
              <span className={`flex items-center gap-1.5 text-[10px] ${
                health.ok === true ? 'text-ink' : health.ok === false ? 'text-ink-3' : 'text-ink-3'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  health.ok === true ? 'bg-white animate-pulse-soft' :
                  health.ok === false ? 'bg-ink-3' : 'bg-hairline-2'
                }`} />
                {health.ok === true ? 'REACHABLE' : health.ok === false ? 'UNREACHABLE' : 'CHECKING'}
              </span>
            </div>

            <div className="p-5 space-y-3">
              <label className="block label-mono">Backend URL</label>
              <input
                type="url"
                value={backendUrl}
                onChange={(e) => setBackendUrlState(e.target.value)}
                placeholder="https://api.tagzheimer.com or empty for same-origin"
                className="w-full h-11 px-3 bg-canvas border border-hairline text-ink text-[14px] focus:border-white transition-colors outline-none placeholder:text-ink-4 font-mono"
              />

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  className="flex-1 h-10 bg-white text-canvas text-[13px] font-semibold hover:bg-ink-2 transition-colors"
                >
                  Save & Refresh
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 h-10 bg-surface-2 border border-hairline-2 text-ink-2 text-[13px] font-medium hover:text-ink transition-colors"
                >
                  Reset to default
                </button>
              </div>

              {custom && (
                <p className="text-[11px] text-ink-3 label-mono pt-1">
                  CUSTOM OVERRIDE ACTIVE · {savedAt ? `SAVED ${new Date(savedAt).toLocaleTimeString()}` : 'PERSISTED'}
                </p>
              )}
              {!custom && (
                <p className="text-[11px] text-ink-3 pt-1">
                  Using build-time default: <code className="text-ink font-mono">{backendUrl || '(same-origin / proxy)'}</code>
                </p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-surface border border-hairline mb-6 relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-hairline-3" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-hairline-3" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-hairline-3" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hairline-3" />

            <div className="label-mono px-5 py-3 border-b border-hairline">Statistics</div>
            <div className="divide-y divide-hairline">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[14px] text-ink-2">Total Devices</span>
                <span className="text-lg font-bold text-ink tabular-nums">{String(totalDevices).padStart(2, '0')}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[14px] text-ink-2">Active</span>
                <span className="text-lg font-bold text-ink tabular-nums flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-soft" />
                  {String(activeDevices).padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[14px] text-ink-2">Offline</span>
                <span className="text-lg font-bold text-ink-3 tabular-nums">{String(totalDevices - activeDevices).padStart(2, '0')}</span>
              </div>
            </div>
          </div>

          {/* Account info */}
          <div className="bg-surface border border-hairline mb-6">
            <div className="label-mono px-5 py-3 border-b border-hairline">Account</div>
            <div className="divide-y divide-hairline">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[14px] text-ink-2">Email</span>
                <span className="text-[13px] text-ink font-medium">{user?.email || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-[14px] text-ink-2">User ID</span>
                <span className="text-[12px] text-ink-3 tabular-nums">{user?.uid || '—'}</span>
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full h-12 bg-surface border border-hairline-2 text-ink text-[14px] font-semibold hover:bg-surface-2 hover:border-hairline-3 transition-colors tap-highlight flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
            Logout
          </button>

          <p className="text-center text-[11px] text-ink-3 mt-8 label-mono">
            Tagzheimer v2.0 · Patient Tracking System
          </p>
        </div>
      </div>
    </>
  );
}

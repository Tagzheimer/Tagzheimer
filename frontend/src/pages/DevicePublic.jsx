import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { devicesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../utils/constants';
import { timeAgo } from '../utils/format';

export default function DevicePublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await devicesAPI.getById(id);
        if (!cancelled) setDevice(data);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        if (status === 401) setError('This device is private. Sign in as its caregiver to view details.');
        else if (status === 403) setError('You do not have access to this device.');
        else if (status === 404) setError('Device not found. This QR code may be invalid or the device was removed.');
        else setError('Could not load this device. Check your connection and backend URL.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center">
        <span className="label-mono">Loading device…</span>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center">
        <div className="text-center px-5 max-w-sm mx-auto">
          <div className="label-mono mb-3">Device lookup</div>
          <h2 className="text-xl font-semibold text-ink mb-2">Unavailable</h2>
          <p className="text-ink-2 text-[14px] mb-6">{error || 'Device not found.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="h-11 px-6 bg-white text-canvas text-[14px] font-semibold"
          >
            Caregiver Sign In
          </button>
        </div>
      </div>
    );
  }

  const timeAgoStr = timeAgo(device.lastSeen);
  const online = device.status === 'online';

  return (
    <div className="min-h-dvh bg-canvas flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          {/* Patient identity card */}
          <div className="bg-surface border border-hairline p-6 mb-3 text-center relative">
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-hairline-3" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-hairline-3" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-hairline-3" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-hairline-3" />

            <div className="label-mono mb-1">Patient</div>
            <h1 className="text-xl font-bold text-ink mb-1 tracking-tight">{device.patientName || '—'}</h1>
            <p className="text-[13px] text-ink-3">{device.name}</p>
          </div>

          {/* Caregiver contact — only when signed in; never show fake numbers */}
          <div className="bg-surface border border-hairline p-6 mb-3">
            <div className="label-mono mb-4">Contact Caregiver</div>
            {user ? (
              <div className="space-y-2">
                <p className="text-[14px] font-semibold text-ink">{user.name || user.email}</p>
                {user.phone ? (
                  <a
                    href={`tel:${String(user.phone).replace(/\s/g, '')}`}
                    className="flex items-center gap-3 h-12 px-4 bg-canvas border border-hairline text-ink text-[14px] font-semibold tap-highlight"
                  >
                    <span>{user.phone}</span>
                  </a>
                ) : (
                  <p className="text-[13px] text-ink-3">No caregiver phone on file. Message via the dashboard.</p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-ink-2">Sign in as the caregiver to see contact details.</p>
            )}
          </div>

          {/* Device info */}
          <div className="bg-surface border border-hairline p-6">
            <div className="label-mono mb-4">Device Info</div>
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-ink-3">Serial</span>
                <span className="font-semibold text-ink tabular-nums">{device.serialNumber}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-ink-3">Status</span>
                <span className={`flex items-center gap-1.5 font-semibold ${online ? 'text-ink' : 'text-ink-3'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-white animate-pulse-soft' : 'bg-ink-3'}`} />
                  {online ? 'Online' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-hairline">
                <span className="text-ink-3">Battery</span>
                <span className="font-semibold text-ink tabular-nums">{device.battery === null || device.battery === undefined ? '—' : `${device.battery}%`}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-ink-3">Last seen</span>
                <span className="text-ink-2">{timeAgoStr}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 pb-8 flex-shrink-0">
        <button
          onClick={() => navigate('/login')}
          className="w-full h-12 bg-white text-canvas text-[14px] font-semibold hover:bg-ink-2 transition-colors tap-highlight flex items-center justify-center gap-2 group"
        >
          Caregiver Sign In
        </button>
        <p className="text-center text-[11px] text-ink-3 mt-3 label-mono">
          Tagzheimer {APP_VERSION} · Keeping loved ones safe
        </p>
        <div className="flex items-center justify-center gap-3 text-[11px] label-mono mt-2">
          <Link to="/terms" className="text-ink-3 hover:text-ink transition-colors">
            Terms
          </Link>
          <span className="text-ink-4">·</span>
          <Link to="/privacy" className="text-ink-3 hover:text-ink transition-colors">
            Privacy
          </Link>
        </div>
      </div>
    </div>
  );
}

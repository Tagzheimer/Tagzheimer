import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useDevices } from '../hooks/useDevices';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';

function getTimeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1m ago';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export default function DeviceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getDeviceById } = useDevices();
  const { location, loading: locLoading, fetchLocation, getAddress } = useLocation();
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [showInfo, setShowInfo] = useState(false);

  const device = getDeviceById(id);

  useEffect(() => {
    if (device) fetchLocation(device._id);
  }, [device, fetchLocation]);

  useEffect(() => {
    if (location) getAddress(location.latitude, location.longitude).then(setAddress);
  }, [location, getAddress]);

  if (!device) {
    return (
      <div className="min-h-dvh md:min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center px-5">
          <div className="label-mono mb-3">404</div>
          <h2 className="text-xl font-semibold text-ink mb-2">Device not found</h2>
          <p className="text-ink-2 text-[14px] mb-6">This device may have been removed.</p>
          <button onClick={() => navigate('/dashboard')} className="h-11 px-6 bg-white text-canvas text-[14px] font-semibold hover:bg-ink-2 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const online = device.status === 'online';
  // Monochrome battery levels: bright = full, mid = low, dim = critical
  const batteryClass = device.battery >= 60 ? 'text-ink' : device.battery >= 20 ? 'text-ink-2' : 'text-ink-3';
  const batteryBarClass = device.battery >= 60 ? 'bg-white' : device.battery >= 20 ? 'bg-ink-2' : 'bg-ink-3';

  const infoPanel = (
    <>
      {/* Title row */}
      <div className="flex items-start justify-between mb-4 gap-2">
        <div className="min-w-0 flex-1">
          <div className="label-mono mb-1">{device.serialNumber}</div>
          <h1 className="text-xl md:text-2xl font-bold text-ink truncate tracking-tight">{device.name}</h1>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
          online ? 'bg-white text-canvas' : 'bg-surface-3 text-ink-3'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-canvas animate-pulse-soft' : 'bg-ink-3'}`} />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Patient + battery + last seen */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 text-[13px]">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-ink-2">{device.patientName}</span>
        </div>
        <span className="text-ink-4 hidden md:inline">·</span>
        <span className={`flex items-center gap-1 font-semibold ${batteryClass}`}>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="7" width="18" height="10" rx="1" /><path d="M22 11v2" strokeLinecap="round" />
          </svg>
          {device.battery}%
        </span>
        <span className="text-ink-4 hidden md:inline">·</span>
        <span className="text-ink-3 label-mono">{getTimeAgo(device.lastSeen)}</span>
      </div>

      {/* Battery bar */}
      <div className="h-1 bg-surface-3 overflow-hidden mb-4">
        <div className={`h-full ${batteryBarClass}`} style={{ width: `${device.battery}%` }} />
      </div>

      {/* Address */}
      {address && (
        <div className="flex items-start gap-2 mb-4 text-[13px] text-ink-2 bg-surface-2 border border-hairline px-3 py-2.5">
          <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-2">{address}</span>
        </div>
      )}

      {device.notes && (
        <p className="text-[13px] text-ink-3 mb-4 italic border-l-2 border-hairline-2 pl-3">{device.notes}</p>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 mb-2">
        <button
          onClick={() => fetchLocation(device._id)}
          disabled={locLoading}
          className="h-11 bg-white text-canvas text-[13px] font-semibold tap-highlight disabled:opacity-40 flex items-center justify-center gap-1.5 hover:bg-ink-2 transition-colors"
        >
          <svg className={`w-3.5 h-3.5 ${locLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {locLoading ? '...' : 'Refresh'}
        </button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${location?.latitude || 0},${location?.longitude || 0}`}
          target="_blank" rel="noopener noreferrer"
          className="h-11 bg-surface border border-hairline-2 text-ink text-[13px] font-semibold tap-highlight flex items-center justify-center gap-1.5 hover:bg-surface-2 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Navigate
        </a>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="h-11 bg-surface border border-hairline-2 text-ink text-[13px] font-semibold tap-highlight flex items-center justify-center gap-1.5 hover:bg-surface-2 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Info
        </button>
      </div>

      {/* Info panel (toggle) */}
      {showInfo && (
        <div className="mt-3 pt-3 border-t border-hairline space-y-2 animate-fade-in">
          <div className="label-mono mb-2">Telemetry</div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Latitude</span>
            <span className="font-semibold text-ink tabular-nums">{location?.latitude?.toFixed(6) || '—'}</span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Longitude</span>
            <span className="font-semibold text-ink tabular-nums">{location?.longitude?.toFixed(6) || '—'}</span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Last Update</span>
            <span className="text-ink-2">{location?.timestamp ? new Date(location.timestamp).toLocaleTimeString() : '—'}</span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Source</span>
            <span className="font-semibold text-ink uppercase tracking-wider">
              {location?.source || '—'}
            </span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Satellites</span>
            <span className="font-semibold text-ink tabular-nums">
              {location?.satellites ?? '—'}
            </span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">HDOP</span>
            <span className="font-semibold text-ink tabular-nums">
              {location?.hdop != null ? location.hdop.toFixed(2) : '—'}
            </span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Altitude</span>
            <span className="font-semibold text-ink tabular-nums">
              {location?.altitude != null ? `${location.altitude.toFixed(1)} m` : '—'}
            </span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Speed</span>
            <span className="font-semibold text-ink tabular-nums">
              {location?.speed != null ? `${location.speed.toFixed(1)} km/h` : '—'}
            </span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Battery</span>
            <span className="font-semibold text-ink tabular-nums">
              {location?.battery != null ? `${location.battery}%` : device?.battery != null ? `${device.battery}%` : '—'}
            </span>
          </div>
          <div className="flex justify-between text-[13px] py-1">
            <span className="text-ink-3">Serial</span>
            <span className="font-semibold text-ink">{device.serialNumber}</span>
          </div>
        </div>
      )}

      {/* QR + caregiver section */}
      <div className="mt-5 pt-5 border-t border-hairline">
        <div className="flex items-center gap-2 mb-3">
          <div className="label-mono">QR Code & Caregiver</div>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-3 flex-shrink-0 self-start relative">
            <QRCodeSVG
              value={`${window.location.origin}/d/${device._id}`}
              size={96}
              bgColor="#ffffff"
              fgColor="#0a0a0a"
              level="M"
            />
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-ink-3" />
            <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-ink-3" />
            <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-ink-3" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-ink-3" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-ink-3 mb-2 label-mono leading-relaxed">Scan with phone to view caregiver contact</p>
            <p className="text-[14px] font-semibold text-ink">{user?.name || 'Caregiver'}</p>
            <a
              href={`tel:${(user?.phone || '').replace(/\s/g, '')}`}
              className="text-[13px] text-ink font-medium tap-highlight inline-flex items-center gap-1 mt-1 hover:underline underline-offset-4"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              {user?.phone || 'N/A'}
            </a>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile layout */}
      <div className="md:hidden min-h-dvh bg-canvas flex flex-col relative">
        <div className="absolute inset-0 z-0">
          {location ? (
            <MapView latitude={location.latitude} longitude={location.longitude} address={address} timestamp={location.timestamp} fullscreen />
          ) : (
            <div className="h-full flex items-center justify-center bg-canvas">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 border border-hairline-3" />
                  <div className="absolute inset-0 border-t border-white animate-spin" style={{ animationDuration: '0.8s' }} />
                </div>
                <span className="label-mono">Acquiring Signal</span>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 flex flex-col h-dvh">
          <div className="flex items-center justify-between px-4 pt-3">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-surface/90 backdrop-blur-sm border border-hairline-2 flex items-center justify-center tap-highlight" aria-label="Go back">
              <svg className="w-4 h-4 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => fetchLocation(device._id)} disabled={locLoading} className="w-10 h-10 bg-surface/90 backdrop-blur-sm border border-hairline-2 flex items-center justify-center tap-highlight disabled:opacity-50" aria-label="Refresh location">
              <svg className={`w-4 h-4 text-ink ${locLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="flex-1" />
          <div className="bg-surface border-t border-hairline-2 px-5 pt-5 pb-8 animate-slide-up safe-bottom">
            {infoPanel}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen bg-canvas">
        <aside className="w-80 border-r border-hairline bg-surface flex-shrink-0">
          <div className="flex items-center gap-3 px-5 h-16 border-b border-hairline">
            <button onClick={() => navigate('/dashboard')} className="w-9 h-9 bg-surface-2 border border-hairline-2 flex items-center justify-center text-ink-2 hover:text-ink hover:bg-surface-3 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="label-mono">Device</div>
              <span className="text-[14px] font-semibold text-ink">Details</span>
            </div>
          </div>
          <div className="p-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            {infoPanel}
          </div>
        </aside>
        <main className="flex-1 flex flex-col">
          <div className="h-16 border-b border-hairline bg-surface flex items-center justify-between px-6">
            <div>
              <div className="label-mono">Live Location</div>
              <h1 className="text-[15px] font-semibold text-ink">Tracking View</h1>
            </div>
            <div className="flex items-center gap-2 text-[12px] text-ink-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse-soft" />
              <span className="label-mono">Real-time</span>
            </div>
          </div>
          <div className="flex-1 relative min-h-0">
            {location ? (
              <MapView latitude={location.latitude} longitude={location.longitude} address={address} timestamp={location.timestamp} />
            ) : (
              <div className="h-full flex items-center justify-center bg-canvas">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 border border-hairline-3" />
                    <div className="absolute inset-0 border-t border-white animate-spin" style={{ animationDuration: '0.8s' }} />
                  </div>
                  <span className="label-mono">Acquiring Signal</span>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useDevices } from '../hooks/useDevices';
import { useLocation } from '../hooks/useLocation';
import { useAuth } from '../context/AuthContext';
import MapView from '../components/MapView';

function getTimeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
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
      <div className="min-h-dvh md:min-h-screen bg-background flex items-center justify-center">
        <div className="text-center px-5">
          <h2 className="text-[20px] font-semibold text-gray-600">Device not found</h2>
          <button onClick={() => navigate('/dashboard')} className="mt-4 h-12 px-6 bg-primary text-white text-[16px] font-medium rounded-xl">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const batteryColor = device.battery >= 60 ? 'text-success' : device.battery >= 20 ? 'text-warning' : 'text-danger';
  const batteryBarColor = device.battery >= 60 ? 'bg-success' : device.battery >= 20 ? 'bg-warning' : 'bg-danger';

  const infoPanel = (
    <>
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] md:text-2xl font-semibold text-gray-900 truncate">{device.name}</h1>
          <p className="text-[14px] text-gray-500">{device.serialNumber}</p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ml-2 ${
          device.status === 'online' ? 'bg-green-50 text-success' : 'bg-gray-100 text-gray-500'
        }`}>
          <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-success' : 'bg-gray-400'}`} />
          {device.status === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <span className="text-[15px] text-gray-600">{device.patientName}</span>
        <span className="text-gray-300 hidden md:inline">|</span>
        <span className={`text-[15px] font-medium ${batteryColor}`}>
          <svg className="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="7" width="18" height="10" rx="2" /><path d="M22 11v2" strokeLinecap="round" />
          </svg>
          {device.battery}%
        </span>
        <span className="text-gray-300 hidden md:inline">|</span>
        <span className="text-[15px] text-gray-500">{getTimeAgo(device.lastSeen)}</span>
      </div>

      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
        <div className={`h-full rounded-full ${batteryBarColor}`} style={{ width: `${device.battery}%` }} />
      </div>

      {address && (
        <div className="flex items-start gap-2 mb-4 text-[14px] text-gray-600">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="line-clamp-2">{address}</span>
        </div>
      )}

      {device.notes && <p className="text-[14px] text-gray-500 mb-4 italic">{device.notes}</p>}

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => fetchLocation(device._id)}
          disabled={locLoading}
          className="h-12 bg-primary text-white text-[14px] font-medium rounded-xl tap-highlight disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <svg className={`w-4 h-4 ${locLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {locLoading ? '...' : 'Refresh'}
        </button>
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${location?.latitude || 0},${location?.longitude || 0}`}
          target="_blank" rel="noopener noreferrer"
          className="h-12 bg-gray-100 text-gray-700 text-[14px] font-medium rounded-xl tap-highlight flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Navigate
        </a>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="h-12 bg-gray-100 text-gray-700 text-[14px] font-medium rounded-xl tap-highlight flex items-center justify-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Info
        </button>
      </div>

      {showInfo && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-fade-in">
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Latitude</span>
            <span className="font-medium text-gray-900">{location?.latitude?.toFixed(4) || '—'}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Longitude</span>
            <span className="font-medium text-gray-900">{location?.longitude?.toFixed(4) || '—'}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Last Updated</span>
            <span className="text-gray-600">{location?.timestamp ? new Date(location.timestamp).toLocaleTimeString() : '—'}</span>
          </div>
          <div className="flex justify-between text-[15px]">
            <span className="text-gray-500">Device ID</span>
            <span className="font-medium text-gray-900">{device.serialNumber}</span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
          </svg>
          <span className="text-[15px] font-semibold text-gray-900">QR Code & Contact</span>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-2 rounded-xl border border-gray-200 flex-shrink-0 self-start">
            <QRCodeSVG value={`${window.location.origin}/d/${device._id}`} size={100} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-gray-500 mb-1">Scan with your phone to view caregiver contact info</p>
            <p className="text-[15px] font-medium text-gray-900">{user?.name || 'Caregiver'}</p>
            <a
              href={`tel:${(user?.phone || '').replace(/\s/g, '')}`}
              className="text-[14px] text-primary font-medium tap-highlight inline-flex items-center gap-1 mt-0.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
      <div className="md:hidden min-h-dvh bg-black flex flex-col relative">
        <div className="absolute inset-0 z-0">
          {location ? (
            <MapView latitude={location.latitude} longitude={location.longitude} address={address} timestamp={location.timestamp} fullscreen />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          )}
        </div>
        <div className="relative z-10 flex flex-col h-dvh">
          <div className="flex items-center justify-between px-4 pt-3">
            <button onClick={() => navigate('/dashboard')} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg tap-highlight" aria-label="Go back">
              <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button onClick={() => fetchLocation(device._id)} disabled={locLoading} className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg tap-highlight disabled:opacity-50" aria-label="Refresh location">
              <svg className={`w-5 h-5 text-primary ${locLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
          <div className="flex-1" />
          <div className="bg-white rounded-t-2xl shadow-2xl px-5 pt-5 pb-8 animate-slide-up safe-bottom">
            {infoPanel}
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex min-h-screen bg-background">
        <aside className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3 px-6 h-16 border-b border-gray-100">
            <button onClick={() => navigate('/dashboard')} className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-[15px] font-semibold text-gray-900">Device Details</span>
          </div>
          <div className="p-4">
            {infoPanel}
          </div>
        </aside>
        <main className="flex-1 flex flex-col">
          <div className="h-16 border-b border-gray-200 bg-white flex items-center px-6">
            <h1 className="text-[17px] font-semibold text-gray-900">Live Location</h1>
          </div>
          <div className="flex-1 relative min-h-0">
            {location ? (
              <MapView latitude={location.latitude} longitude={location.longitude} address={address} timestamp={location.timestamp} />
            ) : (
              <div className="h-full flex items-center justify-center bg-gray-100">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

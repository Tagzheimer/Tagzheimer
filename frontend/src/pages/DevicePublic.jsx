import { useParams, useNavigate } from 'react-router-dom';
import { mockDevices } from '../services/mockData';
import { MOCK_USER } from '../utils/constants';

export default function DevicePublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const device = mockDevices.find((d) => d._id === id);

  if (!device) {
    return (
      <div className="min-h-dvh bg-canvas flex items-center justify-center">
        <div className="text-center px-5 max-w-sm mx-auto">
          <div className="w-16 h-16 border border-hairline-2 mx-auto mb-6 flex items-center justify-center relative">
            <svg className="w-7 h-7 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <div className="absolute -top-px -left-px w-2 h-2 border-t border-l border-hairline-3" />
            <div className="absolute -top-px -right-px w-2 h-2 border-t border-r border-hairline-3" />
            <div className="absolute -bottom-px -left-px w-2 h-2 border-b border-l border-hairline-3" />
            <div className="absolute -bottom-px -right-px w-2 h-2 border-b border-r border-hairline-3" />
          </div>
          <div className="label-mono mb-3">Error 404</div>
          <h2 className="text-xl font-semibold text-ink mb-2">Device not found</h2>
          <p className="text-ink-2 text-[14px]">
            This QR code may be invalid or the device has been removed.
          </p>
        </div>
      </div>
    );
  }

  const timeAgo = device.lastSeen
    ? `${Math.floor((Date.now() - new Date(device.lastSeen).getTime()) / 60000)}m ago`
    : 'Unknown';
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

            <div className="w-14 h-14 border border-hairline-2 flex items-center justify-center mx-auto mb-4 relative">
              <svg className="w-7 h-7 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <div className="absolute -top-px -left-px w-1.5 h-1.5 border-t border-l border-white" />
              <div className="absolute -top-px -right-px w-1.5 h-1.5 border-t border-r border-white" />
              <div className="absolute -bottom-px -left-px w-1.5 h-1.5 border-b border-l border-white" />
              <div className="absolute -bottom-px -right-px w-1.5 h-1.5 border-b border-r border-white" />
            </div>
            <div className="label-mono mb-1">Patient</div>
            <h1 className="text-xl font-bold text-ink mb-1 tracking-tight">{device.patientName}</h1>
            <p className="text-[13px] text-ink-3">{device.name}</p>
          </div>

          {/* Caregiver contact */}
          <div className="bg-surface border border-hairline p-6 mb-3">
            <div className="label-mono mb-4">Contact Caregiver</div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 border border-hairline-2 flex items-center justify-center flex-shrink-0">
                  <span className="text-[13px] font-bold text-ink">
                    {MOCK_USER.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-[14px] font-semibold text-ink">{MOCK_USER.name}</p>
                  <p className="text-[11px] text-ink-3 label-mono">Caregiver</p>
                </div>
              </div>
              <a
                href={`tel:${MOCK_USER.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-3 h-12 px-4 bg-canvas border border-hairline text-ink text-[14px] font-semibold tap-highlight hover:border-hairline-3 transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                <span>{MOCK_USER.phone}</span>
              </a>
              <a
                href={`mailto:${MOCK_USER.email}`}
                className="flex items-center gap-3 h-12 px-4 bg-canvas border border-hairline text-ink-2 text-[14px] font-medium tap-highlight hover:border-hairline-3 hover:text-ink transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>{MOCK_USER.email}</span>
              </a>
            </div>
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
                <span className="font-semibold text-ink tabular-nums">{device.battery}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-ink-3">Last seen</span>
                <span className="text-ink-2">{timeAgo}</span>
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
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
        <p className="text-center text-[11px] text-ink-3 mt-3 label-mono">
          Tagzheimer · Keeping loved ones safe
        </p>
      </div>
    </div>
  );
}

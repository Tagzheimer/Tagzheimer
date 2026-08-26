import { useNavigate } from 'react-router-dom';

function getTimeAgo(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1m ago';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// All status colors are now monochrome tints
function getBatteryClass(level) {
  if (level >= 60) return 'text-ink';       // bright = good
  if (level >= 20) return 'text-ink-2';     // mid = warn
  return 'text-ink-3';                       // dim = critical
}

function getBatteryBarClass(level) {
  if (level >= 60) return 'bg-white';
  if (level >= 20) return 'bg-ink-2';
  return 'bg-ink-3';
}

export default function DeviceCard({ device }) {
  const navigate = useNavigate();
  const online = device.status === 'online';

  return (
    <div
      onClick={() => navigate(`/device/${device._id}`)}
      className="bg-surface border border-hairline px-4 py-4 active:bg-surface-2 hover:border-hairline-2 transition-colors tap-highlight group cursor-pointer relative"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${device.name}`}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/device/${device._id}`); }}
    >
      {/* Top row: name + status pill */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold text-ink truncate tracking-tight">{device.name}</h3>
          <p className="text-[11px] text-ink-3 truncate label-mono mt-0.5">{device.serialNumber}</p>
        </div>
        <span className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
          online ? 'bg-white text-canvas' : 'bg-surface-3 text-ink-3'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-canvas animate-pulse-soft' : 'bg-ink-3'}`} />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Middle: metadata */}
      <div className="flex items-center gap-3 text-[12px] mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <svg className="w-3 h-3 text-ink-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-ink-2 truncate">{device.patientName}</span>
        </div>
      </div>

      {/* Battery bar */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-1 bg-surface-3 overflow-hidden">
          <div
            className={`h-full transition-all ${getBatteryBarClass(device.battery)}`}
            style={{ width: `${device.battery}%` }}
          />
        </div>
        <span className={`text-[12px] font-semibold tabular-nums ${getBatteryClass(device.battery)}`}>
          {device.battery}%
        </span>
      </div>

      {/* Footer: last seen + arrow */}
      <div className="flex items-center justify-between pt-3 border-t border-hairline">
        <div className="flex items-center gap-1.5 text-[11px] text-ink-3">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="label-mono">{getTimeAgo(device.lastSeen)}</span>
        </div>
        <span className="text-[11px] font-semibold text-ink flex items-center gap-1 label-mono group-hover:gap-2 transition-all">
          View
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

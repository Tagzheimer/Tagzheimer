import { useNavigate } from 'react-router-dom';

function getTimeAgo(dateStr) {
  if (!dateStr) return 'Unknown';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1m ago';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

function getBatteryColor(level) {
  if (level >= 60) return 'text-success';
  if (level >= 20) return 'text-warning';
  return 'text-danger';
}

export default function DeviceCard({ device }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/device/${device._id}`)}
      className="bg-white rounded-xl px-4 py-4 shadow-sm border border-gray-100 active:bg-gray-50 transition-colors tap-highlight"
      role="button"
      tabIndex={0}
      aria-label={`View details for ${device.name}`}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/device/${device._id}`); }}
      style={{ minHeight: 100 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[17px] font-semibold text-gray-900 truncate">{device.name}</h3>
          <p className="text-[13px] text-gray-500 truncate">{device.serialNumber}</p>
        </div>
        <span
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ml-2 ${
            device.status === 'online'
              ? 'bg-green-50 text-success'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              device.status === 'online' ? 'bg-success' : 'bg-gray-400'
            }`}
          />
          {device.status === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[13px]">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-gray-600 truncate">{device.patientName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="2" y="7" width="18" height="10" rx="2" /><path d="M22 11v2" strokeLinecap="round" />
          </svg>
          <span className={getBatteryColor(device.battery)}>{device.battery}%</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-500">{getTimeAgo(device.lastSeen)}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
          <div
            className={`h-full rounded-full transition-all ${
              device.battery >= 60 ? 'bg-success' : device.battery >= 20 ? 'bg-warning' : 'bg-danger'
            }`}
            style={{ width: `${device.battery}%` }}
          />
        </div>
        <span className="text-[13px] font-medium text-primary flex items-center gap-1">
          View
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

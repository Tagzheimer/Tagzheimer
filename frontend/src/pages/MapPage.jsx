import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import Header from '../components/Header';
import { useDevices } from '../hooks/useDevices';
import { mockLocations } from '../services/mockData';

// Monochrome diamond marker for the multi-device map
const buildIcon = (online) => L.divIcon({
  className: 'tagz-marker',
  html: `
    <div style="position: relative; width: 20px; height: 20px;">
      <div style="
        position: absolute; inset: 0;
        background: ${online ? '#ffffff' : '#1f1f1f'};
        border: 2px solid ${online ? '#ffffff' : '#525252'};
        transform: rotate(45deg);
      "></div>
      ${online ? '<div style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 4px; height: 4px; background: #0a0a0a; border-radius: 50%;"></div>' : ''}
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  popupAnchor: [0, -20],
});

export default function MapPage() {
  const { devices } = useDevices();
  const navigate = useNavigate();

  const onlineDevices = devices.filter((d) => d.status === 'online');
  const mapCenter = onlineDevices.length > 0 && mockLocations[onlineDevices[0]._id]
    ? [mockLocations[onlineDevices[0]._id].latitude, mockLocations[onlineDevices[0]._id].longitude]
    : [40.7128, -74.006];

  return (
    <>
      <div className="md:hidden">
        <Header title="Map" />
      </div>
      <div className="hidden md:flex h-16 border-b border-hairline bg-surface items-center justify-between px-6">
        <div>
          <div className="label-mono">Map View</div>
          <h1 className="text-[15px] font-semibold text-ink">All Devices</h1>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-2 text-ink-2">
            <span className="w-2 h-2 bg-white" style={{ transform: 'rotate(45deg)' }} />
            <span className="label-mono">Online · {onlineDevices.length}</span>
          </span>
          <span className="flex items-center gap-2 text-ink-3">
            <span className="w-2 h-2 bg-surface-3 border border-hairline-3" style={{ transform: 'rotate(45deg)' }} />
            <span className="label-mono">Offline · {devices.length - onlineDevices.length}</span>
          </span>
        </div>
      </div>
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={12} className="h-full w-full" zoomControl={true}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {devices.map((device) => {
            const loc = mockLocations[device._id];
            if (!loc) return null;
            const online = device.status === 'online';
            return (
              <Marker key={device._id} position={[loc.latitude, loc.longitude]} icon={buildIcon(online)}>
                <Popup>
                  <div className="text-[12px] min-w-[180px]">
                    <div className="label-mono mb-1">{device.serialNumber}</div>
                    <p className="font-semibold text-[14px] text-ink">{device.name}</p>
                    <p className="text-ink-3 mt-0.5 text-[12px]">{device.patientName}</p>
                    <div className="flex items-center gap-2 mt-3 pb-3 border-b border-hairline">
                      <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-white animate-pulse-soft' : 'bg-ink-3'}`} />
                      <span className="text-ink-2 text-[11px]">{online ? 'Online' : 'Offline'}</span>
                      <span className="text-ink-4">·</span>
                      <span className={`text-[11px] font-semibold ${device.battery >= 60 ? 'text-ink' : device.battery >= 20 ? 'text-ink-2' : 'text-ink-3'}`}>
                        {device.battery}%
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/device/${device._id}`)}
                      className="mt-3 w-full h-9 bg-white text-canvas text-[12px] font-semibold hover:bg-ink-2 transition-colors tap-highlight flex items-center justify-center gap-1.5"
                    >
                      View Details
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
}

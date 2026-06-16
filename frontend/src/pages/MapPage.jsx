import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import Header from '../components/Header';
import { useDevices } from '../hooks/useDevices';
import { mockLocations } from '../services/mockData';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
        <Header />
      </div>
      <div className="flex-1 relative">
        <MapContainer center={mapCenter} zoom={12} className="h-full w-full" zoomControl={true}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {devices.map((device) => {
            const loc = mockLocations[device._id];
            if (!loc) return null;
            return (
              <Marker key={device._id} position={[loc.latitude, loc.longitude]}>
                <Popup>
                  <div className="text-[13px] min-w-[160px]">
                    <p className="font-medium text-[15px]">{device.name}</p>
                    <p className="text-gray-500 mt-0.5">{device.patientName}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-success' : 'bg-gray-400'}`} />
                      <span className="text-gray-600">{device.status === 'online' ? 'Online' : 'Offline'}</span>
                      <span className="text-gray-400">|</span>
                      <span className={device.battery >= 60 ? 'text-success' : device.battery >= 20 ? 'text-warning' : 'text-danger'}>
                        {device.battery}%
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/device/${device._id}`)}
                      className="mt-2 w-full h-9 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-blue-700 transition-colors tap-highlight"
                    >
                      View Details
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

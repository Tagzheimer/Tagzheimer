import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapCenterUpdater({ center }) {
  const map = useMap();
  const didSet = useRef(false);

  useEffect(() => {
    if (center && !didSet.current) {
      map.setView(center, 15);
      didSet.current = true;
    }
  }, [center, map]);

  return null;
}

function LocationMarker({ position, address, timestamp }) {
  return (
    <Marker position={position}>
      <Popup>
        <div className="text-[13px]">
          <p className="font-medium">{address || 'Current Location'}</p>
          {timestamp && (
            <p className="text-gray-500 mt-1">
              Updated: {new Date(timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({ latitude, longitude, address, timestamp, fullscreen }) {
  const center = [latitude, longitude];
  const [mapReady, setMapReady] = useState(false);

  return (
    <div className={`${fullscreen ? 'absolute inset-0 rounded-none' : 'w-full rounded-xl h-full'} overflow-hidden bg-gray-100`}
      style={fullscreen ? { top: 0, bottom: 0, left: 0, right: 0 } : {}}
    >
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-[1000]">
          <div className="animate-spin w-6 h-6 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      )}
      <MapContainer
        center={center}
        zoom={15}
        className="h-full w-full"
        zoomControl={true}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <LocationMarker position={center} address={address} timestamp={timestamp} />
        <MapCenterUpdater center={center} />
      </MapContainer>
    </div>
  );
}

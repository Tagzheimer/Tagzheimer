import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { TILE_LAYERS, useSettings } from '../services/settings';
import { formatClock } from '../utils/format';

// Build a custom monochrome div-icon — a small white square with crosshair,
// fits the terminal aesthetic better than the default orange Leaflet pin.
const customIcon = L.divIcon({
  className: 'tagz-marker',
  html: `
    <div style="
      position: relative;
      width: 24px;
      height: 24px;
    ">
      <div style="
        position: absolute; inset: 0;
        background: #0a0a0a;
        border: 2px solid #ffffff;
        transform: rotate(45deg);
      "></div>
      <div style="
        position: absolute; left: 50%; top: 50%;
        transform: translate(-50%, -50%);
        width: 6px; height: 6px;
        background: #ffffff;
        border-radius: 50%;
      "></div>
      <div style="
        position: absolute;
        left: 50%; top: 100%;
        transform: translateX(-50%);
        width: 1px; height: 12px;
        background: #ffffff;
        opacity: 0.5;
      "></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

function MapCenterUpdater({ center, zoom }) {
  const map = useMap();
  const didSet = useRef(false);

  useEffect(() => {
    if (center && !didSet.current) {
      map.setView(center, zoom);
      didSet.current = true;
    }
  }, [center, zoom, map]);

  return null;
}

function LocationMarker({ position, address, timestamp, clock }) {
  return (
    <Marker position={position} icon={customIcon}>
      <Popup>
        <div className="text-[12px]">
          <div className="label-mono mb-1">Location</div>
          <p className="font-semibold text-ink">{address || 'Current Location'}</p>
          {timestamp && (
            <p className="text-ink-3 mt-1 text-[11px]">
              Updated: {formatClock(timestamp, { clock })}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

export default function MapView({ latitude, longitude, address, timestamp, trail = [], fullscreen }) {
  const { map: mapPrefs, display } = useSettings();
  const center = [latitude, longitude];
  const [mapReady, setMapReady] = useState(false);
  const layer = TILE_LAYERS[mapPrefs.tiles] || TILE_LAYERS.dark;
  const trailPositions = (Array.isArray(trail) ? trail : [])
    .filter((f) => typeof f?.latitude === 'number' && typeof f?.longitude === 'number' && Number.isFinite(f.latitude) && Number.isFinite(f.longitude))
    .map((f) => [f.latitude, f.longitude]);

  return (
    <div
      // NOTE: `relative` must NOT be present in fullscreen mode — Tailwind
      // emits `relative` after `absolute`, so it would win the cascade and
      // collapse the map to 0px tall (tiles load but never paint).
      className={`${fullscreen ? 'absolute inset-0' : 'w-full h-full relative'} overflow-hidden bg-canvas`}
      style={fullscreen ? { top: 0, bottom: 0, left: 0, right: 0 } : {}}
    >
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas z-[1000]">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="w-8 h-8 border border-hairline-3" />
              <div className="absolute inset-0 border-t border-white animate-spin" style={{ animationDuration: '0.8s' }} />
            </div>
            <span className="label-mono">Loading Map</span>
          </div>
        </div>
      )}
      <MapContainer
        center={center}
        zoom={mapPrefs.zoom}
        className="h-full w-full"
        zoomControl={true}
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          url={layer.url}
          attribution={`&copy; ${layer.attribution}`}
        />
        {trailPositions.length > 1 && (
          <Polyline
            positions={trailPositions}
            pathOptions={{ color: '#ffffff', weight: 2, opacity: 0.65, dashArray: '1 7', lineCap: 'round' }}
          />
        )}
        <LocationMarker position={center} address={address} timestamp={timestamp} clock={display.clock} />
        <MapCenterUpdater center={center} zoom={mapPrefs.zoom} />
      </MapContainer>

      {/* Crosshair overlay for telemetry feel — non-interactive, toggleable */}
      {mapPrefs.crosshair && (
        <div className="absolute inset-0 pointer-events-none z-[500]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white/30">
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-full w-px h-3 bg-white/30" />
            <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-full w-px h-3 bg-white/30" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full h-px w-3 bg-white/30" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-y-0 translate-x-full h-px w-3 bg-white/30" />
          </div>
        </div>
      )}
    </div>
  );
}

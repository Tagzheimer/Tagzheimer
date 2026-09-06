import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import Header from '../components/Header';
import { useDevices } from '../hooks/useDevices';
import { locationAPI } from '../services/api';
import { TILE_LAYERS, batteryTier, useSettings } from '../services/settings';

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

/**
 * Live locations for the visible devices.
 *
 * Every device gets a live fix attempt (telemetry endpoint → legacy
 * endpoint). Failures render nothing for that tag — never synthetic
 * fallback positions in a safety-critical map.
 */
function useDeviceLocations(devices, refreshSec) {
  const [locations, setLocations] = useState({});
  const [locLoading, setLocLoading] = useState(false);
  const idsKey = useMemo(
    () => (devices || []).map((d) => d._id).filter(Boolean).sort().join(','),
    [devices]
  );

  const fetchAll = useCallback(async () => {
    const list = (devices || []).filter((d) => d._id);
    if (list.length === 0) {
      setLocations({});
      return;
    }
    setLocLoading(true);
    try {
      const entries = await Promise.all(
        list.map(async (d) => {
          try {
            const latest = await locationAPI.getCurrentWithMeta(d._id);
            if (latest && typeof latest.latitude === 'number' && typeof latest.longitude === 'number' && Number.isFinite(latest.latitude) && Number.isFinite(latest.longitude)) {
              return [d._id, { latitude: latest.latitude, longitude: latest.longitude }];
            }
          } catch { /* fall through to legacy endpoint */ }
          try {
            const { data } = await locationAPI.getCurrent(d._id);
            if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number' && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) {
              return [d._id, { latitude: data.latitude, longitude: data.longitude }];
            }
          } catch { /* no position for this tag */ }
          return [d._id, null];
        })
      );
      const next = {};
      for (const [id, loc] of entries) {
        if (loc) next[id] = loc;
      }
      setLocations(next);
    } finally {
      setLocLoading(false);
    }
  }, [devices]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial/device-set location fetch
    fetchAll();
  }, [fetchAll, idsKey]);

  // Stay live on the same cadence as the device list.
  useEffect(() => {
    if (!refreshSec || refreshSec <= 0) return undefined;
    const t = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, refreshSec * 1000);
    return () => clearInterval(t);
  }, [fetchAll, refreshSec]);

  return { locations, locLoading, refetchLocations: fetchAll };
}

// Fit the viewport to all located markers (runs when the marker set changes).
function FitBounds({ points }) {
  const map = useMap();
  const key = (points || []).map((p) => p.join(',')).join(';');
  useEffect(() => {
    if ((points || []).length > 1) {
      map.fitBounds(points, { padding: [48, 48] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

function RefreshButton({ onRefresh, spinning, label = 'Refresh locations' }) {
  return (
    <button
      onClick={onRefresh}
      className="min-touch flex items-center justify-center gap-2 text-ink-2 hover:text-ink border border-hairline-2 h-9 px-3 hover:bg-surface-2 transition-colors tap-highlight text-[12px] font-mono"
      aria-label={label}
      title={label}
    >
      <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      <span className="hidden sm:inline label-mono">Refresh</span>
    </button>
  );
}

export default function MapPage() {
  const { devices, allDevices, hiddenCount, refresh } = useDevices();
  const settings = useSettings();
  const mapPrefs = settings.map;
  const lowAt = settings.devices.lowBattery;
  const navigate = useNavigate();
  const layer = TILE_LAYERS[mapPrefs.tiles] || TILE_LAYERS.dark;

  const { locations, locLoading, refetchLocations } = useDeviceLocations(devices, settings.devices.refresh);

  const located = devices.filter((d) => locations[d._id]);
  const points = located.map((d) => [locations[d._id].latitude, locations[d._id].longitude]);
  const onlineCount = allDevices.filter((d) => d.status === 'online').length;
  const offlineCount = allDevices.filter((d) => d.status === 'offline').length;
  const mapCenter = points.length > 0 ? points[0] : [40.7128, -74.006];

  const handleRefresh = () => {
    refresh();
    refetchLocations();
  };

  return (
    <>
      <div className="md:hidden">
        <Header title="Map" rightAction={<RefreshButton onRefresh={handleRefresh} spinning={locLoading} />} />
      </div>
      <div className="hidden md:flex h-16 border-b border-hairline bg-surface items-center justify-between px-6">
        <div>
          <div className="label-mono">Map View</div>
          <h1 className="text-[15px] font-semibold text-ink">All Devices</h1>
        </div>
        <div className="flex items-center gap-4 text-[12px]">
          <span className="flex items-center gap-2 text-ink-2">
            <span className="w-2 h-2 bg-white" style={{ transform: 'rotate(45deg)' }} />
            <span className="label-mono">Online · {onlineCount}</span>
          </span>
          <span className="flex items-center gap-2 text-ink-3">
            <span className="w-2 h-2 bg-surface-3 border border-hairline-3" style={{ transform: 'rotate(45deg)' }} />
            <span className="label-mono">Offline · {offlineCount}</span>
          </span>
          {hiddenCount > 0 && (
            <span className="label-mono text-ink-3 border border-hairline-2 px-2 py-1">
              {hiddenCount} hidden by filter
            </span>
          )}
          <RefreshButton onRefresh={handleRefresh} spinning={locLoading} />
        </div>
      </div>
      {/* No footer on this page (hidden via AppLayout) — keep mobile
          clearance above the fixed BottomNav instead. */}
      <div className="flex-1 relative min-h-[50dvh] md:min-h-0 pb-16 md:pb-0">
        <MapContainer center={mapCenter} zoom={12} className="h-full w-full" zoomControl={true}>
          <TileLayer
            url={layer.url}
            attribution={`&copy; ${layer.attribution}`}
          />
          <FitBounds points={points} />
          {located.map((device) => {
            const loc = locations[device._id];
            const online = device.status === 'online';
            const tier = batteryTier(device.battery, lowAt);
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
                      <span className={`text-[11px] font-semibold ${tier === 'full' ? 'text-ink' : tier === 'mid' ? 'text-ink-2' : 'text-ink-3'}`}>
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

        {/* Empty state — no located devices (never reported, or filter hides all) */}
        {!locLoading && located.length === 0 && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none px-6">
            <div className="bg-surface/95 border border-hairline-2 px-6 py-5 text-center max-w-xs pointer-events-auto">
              <div className="label-mono mb-2">No tags on the map</div>
              <p className="text-[13px] text-ink-2 leading-relaxed mb-4">
                {devices.length === 0
                  ? 'No devices to show. Add a tracker or adjust the list filter in Settings → Devices.'
                  : 'None of the visible devices have reported a position yet. Start tracking and refresh.'}
              </p>
              <button
                onClick={handleRefresh}
                className="h-10 px-5 bg-white text-canvas text-[13px] font-semibold hover:bg-ink-2 transition-colors tap-highlight"
              >
                Refresh now
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

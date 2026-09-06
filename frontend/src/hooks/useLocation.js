import { useState, useCallback, useRef } from 'react';
import { locationAPI } from '../services/api';
import { getSettings } from '../services/settings';

/**
 * Location hook — uses the v2 /history endpoint to get the latest fix
 * (which includes telemetry fields like battery, satellites, hdop, etc.).
 *
 * Falls back to mock data on error — logs a clear warning so developers
 * know they're seeing fake data.
 */
export function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addressCache = useRef(new Map());

  const fetchLocation = useCallback(async (deviceId) => {
    if (!deviceId) {
      setError('No device selected');
      setLocation(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Use v2 history endpoint with limit=1 — returns telemetry
      const latest = await locationAPI.getCurrentWithMeta(deviceId);
      if (latest && Number.isFinite(Number(latest.latitude)) && Number.isFinite(Number(latest.longitude)) && typeof latest.latitude === 'number' && typeof latest.longitude === 'number') {
        setLocation(latest);
      } else if (latest) {
        // Backend returned corrupt coordinates — surface, don't render.
        console.error('[useLocation] invalid coordinates from backend:', latest);
        setLocation(null);
        setError('Invalid location data');
      } else {
        // Fall back to legacy /api/location/:deviceId endpoint (lat/lon only)
        const { data } = await locationAPI.getCurrent(deviceId);
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setLocation(data);
        } else {
          setLocation(null);
          setError('No location yet for this device');
        }
      }
    } catch (err) {
      const msg = err?.response?.status === 404
        ? 'No location yet for this device'
        : err?.response?.status
          ? `HTTP ${err.response.status}: ${err.response.data?.message || 'request failed'}`
          : (err?.message || 'Backend unreachable');
      console.error('[useLocation] fetch failed:', msg);
      setLocation(null);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (deviceId, limit) => {
    const n = limit ?? getSettings().map.trail;
    if (!n || n <= 0) return [];
    try {
      return await locationAPI.getHistory(deviceId, n);
    } catch (err) {
      console.warn('[useLocation] history fetch failed:', err?.message);
      return [];
    }
  }, []);

  const getAddress = useCallback(async (lat, lng) => {
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return 'Unknown location';
    const key = `${Number(lat).toFixed(3)},${Number(lng).toFixed(3)}`;
    if (addressCache.current.has(key)) return addressCache.current.get(key);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
        { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
      );
      clearTimeout(timer);
      if (!res.ok) return 'Unknown location';
      const data = await res.json();
      const addr = data.display_name || 'Unknown location';
      // Bound the cache so long sessions can't grow it without limit.
      if (addressCache.current.size > 200) addressCache.current.clear();
      addressCache.current.set(key, addr);
      return addr;
    } catch {
      return 'Unknown location';
    }
  }, []);

  return { location, loading, error, fetchLocation, fetchHistory, getAddress };
}

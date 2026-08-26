import { useState, useCallback } from 'react';
import { locationAPI } from '../services/api';
import { mockLocations } from '../services/mockData';

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

  const fetchLocation = useCallback(async (deviceId) => {
    setLoading(true);
    setError(null);
    try {
      // Use v2 history endpoint with limit=1 — returns telemetry
      const latest = await locationAPI.getCurrentWithMeta(deviceId);
      if (latest) {
        setLocation(latest);
      } else {
        // Fall back to legacy /api/location/:deviceId endpoint (lat/lon only)
        try {
          const { data } = await locationAPI.getCurrent(deviceId);
          setLocation(data);
        } catch {
          // Last resort — mock
          console.warn(
            '%c[useLocation] Falling back to mock location — backend unreachable',
            'color:#fbbf24;font-weight:bold'
          );
          const mock = mockLocations[deviceId] || Object.values(mockLocations)[0];
          setLocation({ ...mock, timestamp: new Date().toISOString() });
        }
      }
    } catch (err) {
      const msg = err?.response?.status
        ? `HTTP ${err.response.status}`
        : (err?.message || 'Backend unreachable');
      console.warn(
        '%c[useLocation] Falling back to mock: ' + msg,
        'color:#fbbf24;font-weight:bold'
      );
      const mock = mockLocations[deviceId] || Object.values(mockLocations)[0];
      setLocation({ ...mock, timestamp: new Date().toISOString() });
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (deviceId, limit = 50) => {
    try {
      return await locationAPI.getHistory(deviceId, limit);
    } catch (err) {
      console.warn('[useLocation] history fetch failed:', err?.message);
      return [];
    }
  }, []);

  const getAddress = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      return data.display_name || 'Unknown location';
    } catch {
      return 'Unknown location';
    }
  }, []);

  return { location, loading, error, fetchLocation, fetchHistory, getAddress };
}

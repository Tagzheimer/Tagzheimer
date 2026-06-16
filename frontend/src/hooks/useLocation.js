import { useState, useCallback } from 'react';
import { mockLocations } from '../services/mockData';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLocation = useCallback(async (deviceId) => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      const loc = mockLocations[deviceId] || Object.values(mockLocations)[0];
      setLocation({ ...loc, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
    }
  }, []);

  const getAddress = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      return data.display_name || 'Unknown location';
    } catch {
      return 'Unknown location';
    }
  }, []);

  return { location, loading, fetchLocation, getAddress };
}

import { useState, useEffect, useCallback } from 'react';
import { devicesAPI } from '../services/api';
import { mockDevices } from '../services/mockData';

/**
 * Device list hook — calls the real backend.
 *
 * If the backend is unreachable, falls back to mock data so the UI doesn't
 * crash — but logs a clear console warning so the developer knows the data
 * is fake.
 *
 * Set `VITE_API_URL` or use Profile → Backend Settings to point at the
 * real backend.
 */
export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await devicesAPI.getAll();
      setDevices(Array.isArray(data) ? data : []);
      setUsingMockData(false);
    } catch (err) {
      // Backend unreachable — fall back to mock so UI still renders
      const msg = err?.response?.status
        ? `HTTP ${err.response.status}: ${err.response.statusText}`
        : (err?.message || 'Backend unreachable');

      console.warn(
        '%c[useDevices] Falling back to mock data — backend unreachable: ' + msg,
        'color:#fbbf24;font-weight:bold'
      );
      setDevices(mockDevices);
      setError(msg);
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const addDevice = async (deviceData) => {
    try {
      const { data } = await devicesAPI.create(deviceData);
      setDevices((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || err.message;
      throw new Error(msg);
    }
  };

  const deleteDevice = async (id) => {
    await devicesAPI.delete(id);
    setDevices((prev) => prev.filter((d) => d._id !== id));
  };

  const getDeviceById = (id) => devices.find((d) => d._id === id) || null;

  const totalDevices   = devices.length;
  const activeDevices  = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;

  return {
    devices,
    loading,
    error,
    usingMockData,
    totalDevices,
    activeDevices,
    offlineDevices,
    addDevice,
    deleteDevice,
    getDeviceById,
    refresh: fetchDevices,
  };
}

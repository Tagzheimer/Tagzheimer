import { useState, useEffect, useCallback } from 'react';
import { mockDevices } from '../services/mockData';

let _nextId = 5;
const MID = (n) => `00000000000000000000000${n}`.slice(-24);

export function useDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      setDevices(mockDevices);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const addDevice = async (deviceData) => {
    const exists = mockDevices.find((d) => d.serialNumber === deviceData.serialNumber);
    if (exists) {
      throw new Error('Device with this serial number already exists');
    }
    const newDevice = {
      _id: MID(_nextId++),
      ...deviceData,
      status: 'offline',
      battery: 100,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    mockDevices.unshift(newDevice);
    setDevices([...mockDevices]);
    return newDevice;
  };

  const deleteDevice = async (id) => {
    const idx = mockDevices.findIndex((d) => d._id === id);
    if (idx !== -1) {
      mockDevices.splice(idx, 1);
      setDevices([...mockDevices]);
    }
  };

  const getDeviceById = (id) => {
    return devices.find((d) => d._id === id) || null;
  };

  const totalDevices = devices.length;
  const activeDevices = devices.filter((d) => d.status === 'online').length;
  const offlineDevices = devices.filter((d) => d.status === 'offline').length;

  return {
    devices,
    loading,
    error,
    totalDevices,
    activeDevices,
    offlineDevices,
    addDevice,
    deleteDevice,
    getDeviceById,
    refresh: fetchDevices,
  };
}

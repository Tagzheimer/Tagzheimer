import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { devicesAPI } from '../services/api';
import { getSettings, subscribe, sortFilterDevices, isLowBattery } from '../services/settings';
import { diffDeviceAlerts, alertText, sendBrowserAlert } from '../services/alerts';
import { useAuth } from './AuthContext';

const DevicesContext = createContext(null);
const EMPTY = [];

/**
 * Single source of truth for the device list.
 *
 * - Fetches once per mount tree (previously every page fetched separately).
 * - Auto-refresh polls on the user's `devices.refresh` interval; ticks are
 *   skipped while the tab is hidden to save battery/data.
 * - Watches status transitions and fires browser alerts per `alerts` prefs.
 * - Exposes the raw list (stats) AND the sorted/filtered list (display).
 *
 * The shape is a superset of the old useDevices() hook, so all existing
 * consumers keep working unchanged.
 */
export function DevicesProvider({ children }) {
  const { user } = useAuth();
  const [allDevices, setAllDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [refreshSec, setRefreshSec] = useState(() => getSettings().devices.refresh);

  // Track the live settings snapshot so selectors stay reactive
  // (getSettings() itself isn't a reactive source).
  const [settings, setSettings] = useState(() => getSettings());

  useEffect(
    () =>
      subscribe(() => {
        const s = getSettings();
        setRefreshSec(s.devices.refresh);
        setSettings(s);
      }),
    []
  );

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await devicesAPI.getAll();
      setAllDevices(Array.isArray(data) ? data : []);
      setUsingMockData(false);
    } catch (err) {
      const msg = err?.response?.status
        ? `HTTP ${err.response.status}: ${err.response.data?.message || err.response.statusText}`
        : err?.message || 'Backend unreachable';

      console.error('[Devices] backend unreachable:', msg);
      // Fail visibly with an empty list — never synthesize fake trackers in
      // a safety-critical app. The dashboard shows the error + retry.
      setAllDevices([]);
      setError(msg);
      setUsingMockData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + refetch on sign-in. This is a data fetch (syncing with
  // an external system — the canonical effect use case), not derived state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial/auth-change fetch
    if (user) fetchDevices();
  }, [user, fetchDevices]);

  // Auto-refresh polling.
  useEffect(() => {
    if (!user || !refreshSec || refreshSec <= 0) return undefined;
    const t = setInterval(fetchDevices, refreshSec * 1000);
    return () => clearInterval(t);
  }, [user, refreshSec, fetchDevices]);

  // Visible list honors sort + hide-offline prefs. Everything below is
  // gated on `user` so public pages render empty without extra state writes.
  const storedDevices = user ? allDevices : EMPTY;
  const devices = useMemo(
    () => sortFilterDevices(storedDevices, settings),
    [storedDevices, settings]
  );

  // Alert watcher (status transitions + low battery). Gated on `user`
  // so sign-out never fires stale alerts.
  const prevRef = useRef(new Map());
  useEffect(() => {
    if (!user) {
      prevRef.current = new Map();
      return;
    }
    const events = diffDeviceAlerts(prevRef.current, storedDevices, settings);
    for (const e of events) {
      const { title, body } = alertText(e, settings.devices.lowBattery);
      sendBrowserAlert(title, body, `${e.type}:${e.device._id}`);
    }
    // Snapshot current state for the next diff. Low-battery notifies once
    // per crossing: re-arm only after the battery recovers above threshold.
    const next = new Map();
    const threshold = settings.devices.lowBattery;
    for (const d of storedDevices) {
      if (!d._id) continue;
      const lowNow = isLowBattery(d.battery, threshold);
      const wasNotified = prevRef.current.get(d._id)?.batteryNotified === true;
      const firedNow = events.some((e) => e.type === 'lowBattery' && e.device._id === d._id);
      next.set(d._id, {
        status: d.status,
        batteryNotified: wasNotified ? lowNow : firedNow || lowNow,
      });
    }
    prevRef.current = next;
  }, [storedDevices, user, settings]);

  const addDevice = async (deviceData) => {
    try {
      const { data } = await devicesAPI.create(deviceData);
      setAllDevices((prev) => [data, ...prev]);
      return data;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        err.message;
      throw new Error(msg, { cause: err });
    }
  };

  const deleteDevice = async (id) => {
    await devicesAPI.delete(id);
    setAllDevices((prev) => prev.filter((d) => d._id !== id));
  };

  // Detail pages resolve against the raw list so a hidden-offline device
  // still opens from a direct link / QR.
  const getDeviceById = useCallback(
    (id) => allDevices.find((d) => d._id === id) || null,
    [allDevices]
  );

  const value = useMemo(
    () => ({
      devices, // sorted + filtered (for lists, map, counts of visible)
      allDevices: storedDevices, // raw, gated on auth (for stats, exports)
      loading: user ? loading : false,
      error: user ? error : null,
      usingMockData: user ? usingMockData : false,
      totalDevices: storedDevices.length,
      activeDevices: storedDevices.filter((d) => d.status === 'online').length,
      offlineDevices: storedDevices.filter((d) => d.status === 'offline').length,
      hiddenCount: storedDevices.length - devices.length,
      addDevice,
      deleteDevice,
      getDeviceById,
      refresh: fetchDevices,
    }),
    [devices, storedDevices, user, loading, error, usingMockData, getDeviceById, fetchDevices]
  );

  return <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>;
}

export { DevicesContext };

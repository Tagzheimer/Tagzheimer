/**
 * Persistent state for the tracker.
 *
 * - deviceId, accessToken → SecureStore (encrypted on-device)
 * - backend URL, serialNumber, interval → AsyncStorage (plain JSON)
 * - tracking state (running / paused / stopped) → AsyncStorage
 *
 * The companion settings screen reads/writes the same keys.
 *
 * v2.1: added tracking state — survives app kill / device reboot. The
 * background task reads this on boot to decide whether to re-register
 * itself.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  deviceId:    'tagz.deviceId',
  accessToken: 'tagz.accessToken',
  serial:      'tagz.serial',
  backend:     'tagz.backend',
  interval:    'tagz.interval',
  trackingState: 'tagz.trackingState',
  prefs:       'tagz.prefs',
};

export interface TrackerConfig {
  deviceId:    string | null;
  accessToken: string | null;
  serial:      string;
  backend:     string;
  interval:    number;
}

export type TrackingState = 'stopped' | 'running' | 'paused';

/** Tracker behaviour preferences — edited in the settings screen, read by
 *  the background task on every cycle (no restart needed to take effect,
 *  except where noted). Unknown keys fall back to defaults. */
export type GpsAccuracy = 'saver' | 'balanced' | 'precise';

/** How hard the tracker works for each fix (battery ↔ freshness trade-off). */
export type FixMode = 'efficient' | 'precise';

export interface TrackerPrefs {
  accuracy: GpsAccuracy;      // GPS accuracy ↔ battery trade-off
  distanceInterval: number;   // min movement (m) between fixes, 0 = time-based only
  queueLimit: number;         // max offline fixes held in memory
  failureAlerts: boolean;     // notify after 3 consecutive send failures
  batteryAlerts: boolean;     // notify when battery crosses the threshold
  batteryThreshold: number;   // low-battery % (10–50)
  autoResume: boolean;        // re-register tracking after app kill / reboot
  fixMode: FixMode;           // efficient = reuse free/cached fixes; precise = always fresh GPS
  gpsTimeoutSec: number;      // bound on a single GPS acquisition (10–30s)
}

export const DEFAULT_PREFS: TrackerPrefs = {
  accuracy: 'balanced',
  distanceInterval: 0,
  queueLimit: 50,
  failureAlerts: true,
  batteryAlerts: true,
  batteryThreshold: 20,
  autoResume: true,
  fixMode: 'efficient',
  gpsTimeoutSec: 20,
};

export interface TrackingStatus {
  state: TrackingState;
  startedAt: number | null;     // epoch ms
  lastFixAt: number | null;
  lastSendAt: number | null;
  lastSendOk: boolean | null;
  lastError: string | null;
  queuedCount: number;
  totalSent: number;
  totalFailed: number;
  lastFixSource?: string | null; // task | cached | gps | gps-stale (battery transparency)
}

export const DEFAULTS: Omit<TrackerConfig, 'deviceId' | 'accessToken'> = {
  serial:   '',
  backend:  'http://10.0.2.2:5000'.replace(/\/+$/, ''),
  interval: 60,
};

export const DEFAULT_TRACKING_STATUS: TrackingStatus = {
  state: 'stopped',
  startedAt: null,
  lastFixAt: null,
  lastSendAt: null,
  lastSendOk: null,
  lastError: null,
  queuedCount: 0,
  totalSent: 0,
  totalFailed: 0,
};

function sanitizeInterval(raw: string | null): number {
  const n = raw ? parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return DEFAULTS.interval;
  return Math.min(3600, Math.max(15, n));
}

function sanitizeBackend(raw: string | null): string {
  const clean = (raw ?? '').trim().replace(/\/+$/, '');
  if (!clean) return DEFAULTS.backend;
  // Must look like http(s)://host — otherwise fall back so later fetch()
  // calls fail loudly with a valid URL instead of a relative path.
  if (!/^https?:\/\/.+/i.test(clean)) return DEFAULTS.backend;
  return clean;
}

export async function loadConfig(): Promise<TrackerConfig> {
  const [deviceId, accessToken, serial, backend, interval] = await Promise.all([
    SecureStore.getItemAsync(KEYS.deviceId),
    SecureStore.getItemAsync(KEYS.accessToken),
    AsyncStorage.getItem(KEYS.serial),
    AsyncStorage.getItem(KEYS.backend),
    AsyncStorage.getItem(KEYS.interval),
  ]);

  return {
    deviceId:    deviceId    ?? null,
    accessToken: accessToken ?? null,
    serial:      (serial ?? DEFAULTS.serial).trim(),
    backend:     sanitizeBackend(backend),
    interval:    sanitizeInterval(interval),
  };
}

export async function savePairing(deviceId: string, accessToken: string, serial: string) {
  await Promise.all([
    SecureStore.setItemAsync(KEYS.deviceId, deviceId),
    SecureStore.setItemAsync(KEYS.accessToken, accessToken),
    AsyncStorage.setItem(KEYS.serial, serial),
  ]);
}

export async function saveBackend(backend: string) {
  await AsyncStorage.setItem(KEYS.backend, sanitizeBackend(backend));
}

export async function saveInterval(intervalSec: number) {
  const n = Number.isFinite(intervalSec) ? Math.min(3600, Math.max(15, Math.round(intervalSec))) : DEFAULTS.interval;
  await AsyncStorage.setItem(KEYS.interval, String(n));
}

const ACCURACIES: GpsAccuracy[] = ['saver', 'balanced', 'precise'];
const FIX_MODES: FixMode[] = ['efficient', 'precise'];

function sanitizePrefs(raw: any): TrackerPrefs {
  const p = (raw && typeof raw === 'object') ? raw : {};
  return {
    accuracy: ACCURACIES.includes(p.accuracy) ? p.accuracy : DEFAULT_PREFS.accuracy,
    distanceInterval: [0, 5, 10, 25, 50].includes(Number(p.distanceInterval))
      ? Number(p.distanceInterval) : DEFAULT_PREFS.distanceInterval,
    queueLimit: [25, 50, 100].includes(Number(p.queueLimit))
      ? Number(p.queueLimit) : DEFAULT_PREFS.queueLimit,
    failureAlerts: p.failureAlerts !== false,
    batteryAlerts: p.batteryAlerts !== false,
    batteryThreshold: [10, 15, 20, 30].includes(Number(p.batteryThreshold))
      ? Number(p.batteryThreshold) : DEFAULT_PREFS.batteryThreshold,
    autoResume: p.autoResume !== false,
    fixMode: FIX_MODES.includes(p.fixMode) ? p.fixMode : DEFAULT_PREFS.fixMode,
    gpsTimeoutSec: [10, 15, 20, 30].includes(Number(p.gpsTimeoutSec))
      ? Number(p.gpsTimeoutSec) : DEFAULT_PREFS.gpsTimeoutSec,
  };
}

export async function loadPrefs(): Promise<TrackerPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.prefs);
    if (!raw) return { ...DEFAULT_PREFS };
    return sanitizePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(patch: Partial<TrackerPrefs>): Promise<TrackerPrefs> {
  const current = await loadPrefs();
  const next = sanitizePrefs({ ...current, ...patch });
  await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(next));
  return next;
}

export async function resetPrefs(): Promise<TrackerPrefs> {
  await AsyncStorage.removeItem(KEYS.prefs);
  return { ...DEFAULT_PREFS };
}

export async function clearPairing() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.deviceId).catch(() => {}),
    SecureStore.deleteItemAsync(KEYS.accessToken).catch(() => {}),
    AsyncStorage.removeItem(KEYS.serial),
    // also clear tracking state on unpair
    AsyncStorage.removeItem(KEYS.trackingState),
  ]);
}

export async function isPaired(): Promise<boolean> {
  const token = await SecureStore.getItemAsync(KEYS.accessToken);
  return !!token;
}

// === Tracking state (new in v2.1) ===

export async function loadTrackingStatus(): Promise<TrackingStatus> {
  const raw = await AsyncStorage.getItem(KEYS.trackingState);
  if (!raw) return { ...DEFAULT_TRACKING_STATUS };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TRACKING_STATUS, ...parsed };
  } catch {
    return { ...DEFAULT_TRACKING_STATUS };
  }
}

export async function saveTrackingStatus(status: Partial<TrackingStatus>): Promise<void> {
  const current = await loadTrackingStatus();
  const next = { ...current, ...status };
  await AsyncStorage.setItem(KEYS.trackingState, JSON.stringify(next));
}

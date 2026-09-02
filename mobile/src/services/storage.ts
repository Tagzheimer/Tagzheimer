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
};

export interface TrackerConfig {
  deviceId:    string | null;
  accessToken: string | null;
  serial:      string;
  backend:     string;
  interval:    number;
}

export type TrackingState = 'stopped' | 'running' | 'paused';

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
    serial:      serial      ?? DEFAULTS.serial,
    backend:     backend     ?? DEFAULTS.backend,
    interval:    interval    ? parseInt(interval, 10) : DEFAULTS.interval,
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
  await AsyncStorage.setItem(KEYS.backend, backend.trim().replace(/\/+$/, ''));
}

export async function saveInterval(intervalSec: number) {
  await AsyncStorage.setItem(KEYS.interval, String(intervalSec));
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

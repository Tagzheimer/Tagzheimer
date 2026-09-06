import { useSyncExternalStore } from 'react';

/**
 * Central settings store — the "super customisable" control center.
 * ------------------------------------------------------------------
 * Every preference lives here, persists to localStorage, applies instantly
 * (no save button, no reload), and is consumed by real UI:
 *
 *   appearance → index.css via <html data-*> attributes (text size,
 *                contrast, motion, focus rings) + map tile filter
 *   map        → MapView / MapPage tile layer, device zoom, crosshair,
 *                trail length (DeviceDetails polyline)
 *   display    → units / coordinate + clock formatting (format.js)
 *   devices    → list sort + offline filter + low-battery threshold +
 *                dashboard auto-refresh (DevicesContext polling)
 *   alerts     → browser notifications on status transitions (alerts.js)
 *   network    → axios + health-check timeouts (api.js, backendConfig.js)
 *
 * Schema is versioned (STORAGE_KEY). Unknown/missing keys fall back to
 * defaults so old or hand-edited payloads can never break the UI.
 */

const STORAGE_KEY = 'tagzheimer.settings.v1';

export const TILE_LAYERS = {
  dark: {
    label: 'Dark',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    darkFilter: true,
  },
  light: {
    label: 'Light',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    darkFilter: false,
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Esri World Imagery',
    darkFilter: false,
  },
};

export const DEFAULT_SETTINGS = {
  appearance: {
    textSize: 'm', // 's' | 'm' | 'l'
    contrast: 'standard', // 'standard' | 'high'
    reduceMotion: false,
    focusRing: true,
  },
  map: {
    tiles: 'dark', // 'dark' | 'light' | 'satellite'
    zoom: 15, // 3–18, single-device view
    crosshair: true,
    trail: 50, // history fixes drawn on the device map (0 = off)
  },
  display: {
    units: 'metric', // 'metric' | 'imperial'
    coords: 'decimal', // 'decimal' | 'dms'
    clock: '24h', // '24h' | '12h'
    relativeTime: true,
  },
  devices: {
    sort: 'status', // 'status' | 'name' | 'battery' | 'recent'
    hideOffline: false,
    lowBattery: 20, // 5–50, % below which battery reads "critical"
    refresh: 30, // dashboard auto-refresh seconds (0 = off)
  },
  alerts: {
    enabled: false, // master switch (still needs browser permission)
    offline: true, // device went offline
    reconnect: true, // device came back online
    lowBattery: true, // battery crossed below threshold
  },
  network: {
    timeout: 10, // API + health-check timeout, seconds (5–30)
  },
};

const ENUMS = {
  'appearance.textSize': ['s', 'm', 'l'],
  'appearance.contrast': ['standard', 'high'],
  'map.tiles': ['dark', 'light', 'satellite'],
  'display.units': ['metric', 'imperial'],
  'display.coords': ['decimal', 'dms'],
  'display.clock': ['24h', '12h'],
  'devices.sort': ['status', 'name', 'battery', 'recent'],
};

const RANGES = {
  'map.zoom': [3, 18],
  'map.trail': [0, 500],
  'devices.lowBattery': [5, 50],
  'devices.refresh': [0, 600],
  'network.timeout': [5, 30],
};

const BOOLEANS = [
  'appearance.reduceMotion',
  'appearance.focusRing',
  'map.crosshair',
  'display.relativeTime',
  'devices.hideOffline',
  'alerts.enabled',
  'alerts.offline',
  'alerts.reconnect',
  'alerts.lowBattery',
];

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function sanitizeSection(section, value) {
  const def = DEFAULT_SETTINGS[section];
  if (!def || typeof value !== 'object' || value === null) return { ...def };
  const out = { ...def };
  for (const key of Object.keys(def)) {
    const path = `${section}.${key}`;
    const incoming = value[key];
    if (incoming === undefined) continue;
    if (BOOLEANS.includes(path)) {
      out[key] = incoming === true;
    } else if (ENUMS[path]) {
      out[key] = ENUMS[path].includes(incoming) ? incoming : def[key];
    } else if (RANGES[path]) {
      const [min, max] = RANGES[path];
      const n = Math.round(Number(incoming));
      out[key] = Number.isFinite(n) ? clamp(n, min, max) : def[key];
    }
  }
  return out;
}

export function sanitizeSettings(raw) {
  const out = {};
  for (const section of Object.keys(DEFAULT_SETTINGS)) {
    out[section] = sanitizeSection(section, raw?.[section]);
  }
  return out;
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return sanitizeSettings(null);
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return sanitizeSettings(null);
  }
}

let current = typeof localStorage !== 'undefined' ? readStored() : sanitizeSettings(null);
const listeners = new Set();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Private mode / quota — settings still apply for this session.
  }
}

export function getSettings() {
  return current;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A broken subscriber must never break settings saves.
    }
  });
}

/**
 * Deep-merge one level per section: updateSettings({ map: { zoom: 12 } }).
 * Applies appearance + persists + notifies instantly.
 */
export function updateSettings(patch) {
  if (!patch || typeof patch !== 'object') return current;
  const next = { ...current };
  for (const section of Object.keys(DEFAULT_SETTINGS)) {
    if (patch[section] && typeof patch[section] === 'object') {
      next[section] = sanitizeSection(section, { ...current[section], ...patch[section] });
    }
  }
  current = next;
  persist();
  applyAppearance(current);
  emit();
  return current;
}

export function resetSettings() {
  current = sanitizeSettings(null);
  persist();
  applyAppearance(current);
  emit();
  return current;
}

export function exportSettings() {
  return JSON.stringify({ app: 'tagzheimer', version: 1, settings: current }, null, 2);
}

/**
 * Import a previously exported payload. Returns { ok, error? }.
 * Invalid values are sanitized (never rejected wholesale) — only
 * non-object / unparsable input fails.
 */
export function importSettings(json) {
  let parsed;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return { ok: false, error: 'Not valid JSON.' };
  }
  const payload = parsed?.settings ?? parsed;
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'No settings object found in file.' };
  }
  current = sanitizeSettings(payload);
  persist();
  applyAppearance(current);
  emit();
  return { ok: true };
}

/**
 * Push appearance prefs into <html data-*> attributes. index.css keys all
 * global appearance overrides off these (no per-component wiring needed).
 */
export function applyAppearance(s = current) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.textSize = s.appearance.textSize;
  root.dataset.contrast = s.appearance.contrast;
  root.dataset.motion = s.appearance.reduceMotion ? 'reduced' : 'full';
  root.dataset.focus = s.appearance.focusRing ? 'visible' : 'subtle';
  root.dataset.tiles = TILE_LAYERS[s.map.tiles] ? s.map.tiles : 'dark';
}

/** Reactive hook — re-renders the component on any settings change. */
export function useSettings() {
  return useSyncExternalStore(subscribe, getSettings, getSettings);
}

// === Device-list helpers (consumed by DevicesContext) ===

/** 'full' (≥60) · 'mid' (≥ threshold) · 'low' (< threshold). Unknown (null/undefined/NaN) is 'mid' — never alarming. */
export function batteryTier(level, threshold = DEFAULT_SETTINGS.devices.lowBattery) {
  if (level === null || level === undefined) return 'mid';
  const n = Number(level);
  if (!Number.isFinite(n)) return 'mid';
  if (n >= 60) return 'full';
  if (n >= threshold) return 'mid';
  return 'low';
}

export function isLowBattery(level, threshold = DEFAULT_SETTINGS.devices.lowBattery) {
  return batteryTier(level, threshold) === 'low';
}

function lastSeenMs(d) {
  const t = d?.lastSeen ? new Date(d.lastSeen).getTime() : NaN;
  return Number.isFinite(t) ? t : -Infinity;
}

/**
 * Filter + sort for display. Never mutates the input.
 * sort: status (online first, then most recent) · name (A–Z) ·
 *       battery (lowest first — needs attention) · recent (last seen)
 */
export function sortFilterDevices(devices, settings = current) {
  const list = Array.isArray(devices) ? [...devices] : [];
  const { sort, hideOffline } = settings.devices;
  const visible = hideOffline ? list.filter((d) => d.status === 'online') : list;
  switch (sort) {
    case 'name':
      visible.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      break;
    case 'battery':
      visible.sort((a, b) => (Number(a.battery) || 0) - (Number(b.battery) || 0));
      break;
    case 'recent':
      visible.sort((a, b) => lastSeenMs(b) - lastSeenMs(a));
      break;
    case 'status':
    default:
      visible.sort((a, b) => {
        const ao = a.status === 'online' ? 0 : 1;
        const bo = b.status === 'online' ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return lastSeenMs(b) - lastSeenMs(a);
      });
      break;
  }
  return visible;
}

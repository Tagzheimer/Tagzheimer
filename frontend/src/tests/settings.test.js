import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  getSettings,
  updateSettings,
  resetSettings,
  importSettings,
  exportSettings,
  subscribe,
  sanitizeSettings,
  sortFilterDevices,
  batteryTier,
  isLowBattery,
} from '../services/settings';
import {
  timeAgo,
  formatTimestamp,
  formatCoords,
  formatSpeed,
  formatAltitude,
  devicesToCSV,
} from '../utils/format';

beforeEach(() => {
  localStorage.clear();
  resetSettings();
});

describe('settings store', () => {
  it('loads defaults on first run', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('sanitizes garbage input back to defaults', () => {
    const s = sanitizeSettings({ map: { zoom: 999, tiles: 'neon' }, devices: { lowBattery: -5 } });
    expect(s.map.zoom).toBe(18);
    expect(s.map.tiles).toBe('dark');
    expect(s.devices.lowBattery).toBe(5);
  });

  it('merges section patches and persists', () => {
    updateSettings({ map: { zoom: 10 } });
    expect(getSettings().map.zoom).toBe(10);
    expect(getSettings().devices.sort).toBe('status'); // untouched
    expect(JSON.parse(localStorage.getItem('tagzheimer.settings.v1')).map.zoom).toBe(10);
  });

  it('notifies subscribers on change', () => {
    const fn = vi.fn();
    const unsub = subscribe(fn);
    updateSettings({ display: { units: 'imperial' } });
    expect(fn).toHaveBeenCalledTimes(1);
    unsub();
    updateSettings({ display: { units: 'metric' } });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('resets to defaults', () => {
    updateSettings({ map: { zoom: 5 } });
    resetSettings();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('imports valid payloads and rejects junk', () => {
    expect(importSettings(JSON.stringify({ settings: { map: { zoom: 8 } } }))).toEqual({ ok: true });
    expect(getSettings().map.zoom).toBe(8);
    expect(importSettings('not json')).toEqual({ ok: false, error: 'Not valid JSON.' });
    expect(importSettings('42')).toEqual({ ok: false, error: 'No settings object found in file.' });
  });

  it('exports a parseable payload', () => {
    const parsed = JSON.parse(exportSettings());
    expect(parsed.app).toBe('tagzheimer');
    expect(parsed.settings.map.zoom).toBe(DEFAULT_SETTINGS.map.zoom);
  });
});

describe('battery tiers', () => {
  it('uses 60+ as full and the user threshold as the critical line', () => {
    expect(batteryTier(80, 20)).toBe('full');
    expect(batteryTier(40, 20)).toBe('mid');
    expect(batteryTier(19, 20)).toBe('low');
    expect(batteryTier(29, 30)).toBe('low');
    expect(isLowBattery(15, 20)).toBe(true);
    expect(isLowBattery(25, 20)).toBe(false);
  });
});

describe('sort + filter', () => {
  const devices = [
    { _id: 'a', name: 'Zulu', status: 'offline', battery: 90, lastSeen: '2026-01-01T00:00:00Z' },
    { _id: 'b', name: 'Alpha', status: 'online', battery: 10, lastSeen: '2026-09-01T00:00:00Z' },
    { _id: 'c', name: 'Mike', status: 'online', battery: 70, lastSeen: '2026-06-01T00:00:00Z' },
  ];

  it('sorts online-first by default', () => {
    const ids = sortFilterDevices(devices, getSettings()).map((d) => d._id);
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('hides offline when enabled', () => {
    updateSettings({ devices: { hideOffline: true } });
    const ids = sortFilterDevices(devices, getSettings()).map((d) => d._id);
    expect(ids).toEqual(['b', 'c']);
  });

  it('sorts by name and battery', () => {
    updateSettings({ devices: { sort: 'name' } });
    expect(sortFilterDevices(devices, getSettings()).map((d) => d._id)).toEqual(['b', 'c', 'a']);
    updateSettings({ devices: { sort: 'battery' } });
    expect(sortFilterDevices(devices, getSettings()).map((d) => d._id)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input', () => {
    const frozen = [...devices];
    sortFilterDevices(devices, getSettings());
    expect(devices).toEqual(frozen);
  });
});

describe('format utils', () => {
  it('timeAgo handles null and future dates', () => {
    expect(timeAgo(null)).toBe('—');
    expect(timeAgo(new Date(Date.now() + 60000).toISOString())).toBe('in the future');
  });

  it('formatTimestamp honors the relative toggle', () => {
    const iso = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatTimestamp(iso, { relative: true })).toBe('5m ago');
    expect(formatTimestamp(iso, { relative: false, clock: '24h' })).not.toBe('5m ago');
  });

  it('formats coordinates in both modes', () => {
    expect(formatCoords(48.8584, 2.2945, 'decimal')).toBe('48.858400, 2.294500');
    expect(formatCoords(48.8584, 2.2945, 'dms')).toContain('N');
    expect(formatCoords(null, 2, 'decimal')).toBe('—');
  });

  it('converts speed and altitude for imperial', () => {
    expect(formatSpeed(10, 'metric')).toBe('10.0 km/h');
    expect(formatSpeed(10, 'imperial')).toBe('6.2 mph');
    expect(formatAltitude(100, 'metric')).toBe('100.0 m');
    expect(formatAltitude(100, 'imperial')).toBe('328 ft');
    expect(formatSpeed(null)).toBe('—');
  });

  it('builds CSV with quoted cells', () => {
    const csv = devicesToCSV([{ name: 'A,"B"', serialNumber: 'TAG-1', patientName: 'P', status: 'online', battery: 50, lastSeen: 'x', notes: '' }]);
    expect(csv.split('\n')).toHaveLength(2);
    expect(csv).toContain('"A,""B"""');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string,string>();
  return { default: {
    getItem: vi.fn(async (k:string)=> store.get(k) ?? null),
    setItem: vi.fn(async (k:string,v:string)=>{store.set(k,v)}),
    removeItem: vi.fn(async (k:string)=>{store.delete(k)}),
    clear: vi.fn(async ()=>{store.clear()}),
  } };
});
vi.mock('expo-secure-store', () => {
  const s=new Map<string,string>();
  return {
    getItemAsync: vi.fn(async (k:string)=> s.get(k)??null),
    setItemAsync: vi.fn(async (k:string,v:string)=>{s.set(k,v)}),
    deleteItemAsync: vi.fn(async (k:string)=>{s.delete(k)}),
  };
});

import { DEFAULTS, DEFAULT_TRACKING_STATUS, loadConfig, savePairing, saveBackend, saveInterval, isPaired, clearPairing, loadTrackingStatus, saveTrackingStatus } from '../services/storage';

describe('storage', () => {
  it('defaults', () => {
    expect(DEFAULTS.backend).toBe('http://10.0.2.2:5000');
    expect(DEFAULTS.interval).toBe(60);
    expect(DEFAULT_TRACKING_STATUS.state).toBe('stopped');
  });
  it('loadConfig returns defaults when empty', async () => {
    const c = await loadConfig();
    expect(c.serial).toBe('');
    expect(c.backend).toBe(DEFAULTS.backend);
    expect(c.interval).toBe(60);
    expect(c.deviceId).toBeNull();
  });
  it('savePairing + isPaired', async () => {
    await savePairing('dev-123','tok-abc','TAG-001');
    expect(await isPaired()).toBe(true);
    const c = await loadConfig();
    expect(c.deviceId).toBe('dev-123');
    expect(c.serial).toBe('TAG-001');
  });
  it('saveBackend + saveInterval', async () => {
    await saveBackend('http://192.168.1.50:5000');
    await saveInterval(120);
    const c = await loadConfig();
    expect(c.backend).toBe('http://192.168.1.50:5000');
    expect(c.interval).toBe(120);
  });
  it('tracking status roundtrip', async () => {
    await saveTrackingStatus({ state:'running', totalSent:5 });
    const s = await loadTrackingStatus();
    expect(s.state).toBe('running');
    expect(s.totalSent).toBe(5);
  });
  it('clearPairing', async () => {
    await clearPairing();
    expect(await isPaired()).toBe(false);
  });
});

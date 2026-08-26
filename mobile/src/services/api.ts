/**
 * Backend client — thin wrapper around fetch().
 * Standalone module (no React dependencies) so it can be called
 * from the background task.
 *
 * Exposes:
 *   - pair(serialNumber)        → POST /api/devices/pair
 *   - sendFix(payload)          → POST /api/location/update
 *   - syncBatch(fixes)          → POST /api/location/batch
 *   - pingBackend(url)          → GET  /api/health
 */
import { TrackerConfig } from './storage';

export interface GpsFix {
  latitude:  number;
  longitude: number;
  timestamp: string;       // ISO 8601
  accuracy?:  number | null;
  altitude?:  number | null;
  speed?:     number | null;
  satellites?: number | null;
}

export interface PairResponse {
  success:     boolean;
  created:     boolean;
  deviceId:    string;
  serialNumber:string;
  deviceName:  string;
  patientName: string;
  accessToken: string;
}

function authHeaders(accessToken: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

function demoHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer mock-token',
  };
}

export async function pair(
  backendUrl: string,
  serialNumber: string,
  opts?: { name?: string; patientName?: string; notes?: string },
): Promise<PairResponse> {
  const url = `${backendUrl}/api/devices/pair`;
  const res = await fetch(url, {
    method: 'POST',
    headers: demoHeaders(),
    body: JSON.stringify({ serialNumber, ...opts }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pairing failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<PairResponse>;
}

export async function sendFix(
  config: TrackerConfig,
  fix: GpsFix,
  batteryPct: number | null,
): Promise<{ success: boolean; location?: any; error?: string }> {
  if (!config.serial) {
    return { success: false, error: 'No serial number configured' };
  }
  const headers = config.accessToken
    ? authHeaders(config.accessToken)
    : demoHeaders();

  const body = {
    serialNumber: config.serial,
    latitude:  fix.latitude,
    longitude: fix.longitude,
    meta: {
      battery: batteryPct ?? undefined,
      source:  'mobile',
      altitude: fix.altitude ?? undefined,
      speed:    fix.speed ?? undefined,
      satellites: fix.satellites ?? undefined,
      accuracy: fix.accuracy ?? undefined,
      device: 'Tagzheimer-Android-Tracker',
    },
  };

  try {
    const res = await fetch(`${config.backend}/api/location/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }
    return { success: true, location: await res.json() };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function syncBatch(
  config: TrackerConfig,
  fixes: GpsFix[],
  batteryPct: number | null,
): Promise<{ success: boolean; inserted?: number; error?: string }> {
  if (!config.serial) {
    return { success: false, error: 'No serial number configured' };
  }
  const headers = config.accessToken
    ? authHeaders(config.accessToken)
    : demoHeaders();

  const body = {
    serialNumber: config.serial,
    fixes: fixes.map((f) => ({
      latitude:  f.latitude,
      longitude: f.longitude,
      timestamp: f.timestamp,
      meta: {
        battery: batteryPct ?? undefined,
        source:  'mobile',
        altitude: f.altitude ?? undefined,
        speed:    f.speed ?? undefined,
      },
    })),
  };

  try {
    const res = await fetch(`${config.backend}/api/location/batch`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${text}` };
    }
    const data = await res.json();
    return { success: true, inserted: data.inserted };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function pingBackend(backendUrl: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${backendUrl}/api/health`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      return { ok: true, message: data.message || 'OK' };
    }
    return { ok: false, message: `HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Unreachable' };
  }
}

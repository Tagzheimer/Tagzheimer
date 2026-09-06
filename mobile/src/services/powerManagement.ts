/**
 * Power management
 * ----------------
 * Keeps the device awake during location acquisition + backend send
 * (so a doze cycle doesn't kill the in-flight request), and requests
 * exemption from Android battery optimizations.
 */
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Battery from 'expo-battery';

let _wakeLockTag = 'tagz-send';

/**
 * Acquire a partial wake lock for the duration of an async operation.
 * Releases automatically when the promise resolves or rejects.
 */
export async function withWakeLock<T>(fn: () => Promise<T>): Promise<T> {
  try {
    await activateKeepAwakeAsync(_wakeLockTag);
  } catch {
    // Keep-awake is best-effort — if it fails, continue without it
  }
  try {
    return await fn();
  } finally {
    try { deactivateKeepAwake(_wakeLockTag); } catch {}
  }
}

/**
 * Returns the current battery level (0–100) and whether it's low.
 * The low threshold is configurable (settings screen); default 20%.
 */
export async function getBatteryState(threshold = 20): Promise<{ level: number; isLow: boolean; isCharging: boolean }> {
  const level = await Battery.getBatteryLevelAsync();  // 0..1
  const state = await Battery.getBatteryStateAsync();
  const pct = Math.round(level * 100);
  return {
    level: pct,
    isLow: pct < threshold,
    isCharging: state === Battery.BatteryState.CHARGING || state === Battery.BatteryState.FULL,
  };
}

/**
 * Subscribe to low-battery events.
 * Calls the callback when the level crosses below the threshold.
 */
export function subscribeToBatteryLow(
  onLow: (level: number) => void,
  threshold = 20,
): () => void {
  let lastLow = false;
  const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
    const pct = Math.round(batteryLevel * 100);
    const isLow = pct < threshold;
    if (isLow && !lastLow) onLow(pct);
    lastLow = isLow;
  });
  return () => sub.remove();
}

// NOTE: Requesting battery optimization exemption requires a native module
// (e.g. expo-intent-launcher to fire ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).
// For now, we guide the user via the UI to disable battery optimization manually
// in system settings. See "Power Management" section in the tracker screen.

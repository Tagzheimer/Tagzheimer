/**
 * GPS service — thin wrapper around expo-location.
 *
 * Provides:
 *   - requestPermissions()  → foreground + background location
 *   - startForeground()       → returns a subscription that emits fixes
 *   - getOneShot()            → single immediate fix
 */
import * as Location from 'expo-location';

export async function requestPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  if (fg !== 'granted') return 'denied';

  // Background permission is optional — app still works in foreground
  try {
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    return bg === 'granted' ? 'granted' : 'granted'; // foreground granted is enough
  } catch {
    return 'granted';
  }
}

/**
 * Get a single accurate GPS fix.
 * Returns null if location services are unavailable.
 */
export async function getOneShot(timeoutMs = 20000): Promise<Location.LocationObject | null> {
  try {
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.BestForNavigation,
    });
    return loc;
  } catch (err) {
    console.warn('[GPS] one-shot failed', err);
    return null;
  }
}

/**
 * Subscribe to continuous location updates. Returns an unsubscribe function.
 *
 * For Android, `distanceInterval` = 5 meters means we get a callback every
 * 5+ meters of movement (or every ~5s when stationary). Set
 * `deferTimeMs` to allow batching for battery savings.
 */
export async function startTracking(
  callback: (loc: Location.LocationObject) => void,
  options?: { distanceMeters?: number; intervalMs?: number },
): Promise<() => void> {
  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: options?.intervalMs ?? 10000,
      distanceInterval: options?.distanceMeters ?? 0,
    },
    callback,
  );

  return () => {
    try { sub.remove(); } catch {}
  };
}

/**
 * Returns the satellite count if available on Android.
 * expo-location exposes `loc.coords.altitudeAccuracy` etc. but not
 * satellite count directly — we approximate via accuracy.
 *
 * For real satellite info on Android you'd need a native module; for now
 * we return null and the backend handles it gracefully.
 */
export function getSatellites(_loc: Location.LocationObject): number | null {
  return null;
}

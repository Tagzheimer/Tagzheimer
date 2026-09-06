/**
 * Fix-acquisition strategy — pure helpers (no expo imports) so the policy
 * is easy to reason about and review.
 *
 * Battery problem this solves: the old cycle powered up the GPS chip on
 * EVERY tick via getCurrentPositionAsync, even when the OS had just
 * delivered a fresh fix to the background task, or the OS location cache
 * already held a usable one. GPS acquisition is the single most expensive
 * operation on this screen — often 5–15s of full radio power per fix.
 *
 * Efficient mode (default) avoids powering the radio when possible:
 *   1. task fix   — delivered free by the OS location task, if fresh
 *   2. cached fix — last-known position, if fresh AND accurate enough
 *   3. fresh GPS  — one-shot, bounded by a timeout so a cold start in a
 *                   parking garage can't hold the radio on forever
 *   4. stale cache — last resort so the cycle still reports *something*
 *
 * Precise mode skips 1–2 and always takes a fresh GPS fix (old behavior).
 */

export type FixSource = 'task' | 'cached' | 'gps' | 'gps-stale' | 'none';

export interface FixCandidate {
  latitude: number;
  longitude: number;
  timestamp: number;       // epoch ms (loc.timestamp)
  accuracy: number | null; // meters, null when unknown
}

/** Freshness window scales with the update interval (min 60s). */
export function freshnessWindowMs(intervalSec: number): number {
  const s = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : 60;
  return Math.max(60_000, s * 1500);
}

/** Max cached accuracy we'll trust without powering the radio (meters). */
export const MAX_CACHED_ACCURACY_M = 150;

export function isFresh(loc: FixCandidate | null | undefined, nowMs: number, windowMs: number): boolean {
  if (!loc || !Number.isFinite(loc.timestamp)) return false;
  const age = nowMs - loc.timestamp;
  return age >= 0 && age <= windowMs;
}

export function isAccurateEnough(loc: FixCandidate | null | undefined): boolean {
  if (!loc) return false;
  if (loc.accuracy == null) return true; // unknown — trust freshness only
  return loc.accuracy <= MAX_CACHED_ACCURACY_M;
}

/**
 * Pick the cheapest usable fix. Returns { fix, source } or { fix: null,
 * source: 'none' }. `cached` may be stale — callers decide whether a stale
 * fallback is acceptable (it is, after a GPS timeout).
 */
export function pickCheapestFix(
  taskFix: FixCandidate | null | undefined,
  cachedFix: FixCandidate | null | undefined,
  nowMs: number,
  windowMs: number,
): { fix: FixCandidate | null; source: FixSource } {
  if (taskFix && isFresh(taskFix, nowMs, windowMs)) {
    return { fix: taskFix, source: 'task' };
  }
  if (cachedFix && isFresh(cachedFix, nowMs, windowMs) && isAccurateEnough(cachedFix)) {
    return { fix: cachedFix, source: 'cached' };
  }
  return { fix: null, source: 'none' };
}

/** Haversine distance in meters — used to log how far a reused fix is. */
export function distanceM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a =
    s1 * s1 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Background tracking task
 * -----------------------
 * The core of the tracker. Runs even when the app is swiped away
 * (Android foreground service). Uses expo-task-manager's
 * `registerTaskAsync` with a LOCATION task type — Android runs this on
 * its own schedule (~every `intervalSec` seconds OR when the device
 * moves `distanceMeters` meters, whichever comes first).
 *
 * Lifecycle:
 *   1. startTracking(config)   — registers the task, shows foreground notification
 *   2. The OS calls task()    — acquires a fix (OS-delivered → cached → fresh
 *      GPS with timeout, per the fixMode pref), sends to backend, updates status
 *   3. pauseTracking()         — task stays registered but skips sends (notification updates)
 *   4. stopTracking()          — unregisters the task, dismisses notification
 *   5. On app boot — loadTrackingStatus() shows if tracking was active before reboot
 *
 * Offline fixes are queued in memory + flushed on the next successful send
 * via the batch endpoint.
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BackgroundFetchResult } from 'expo-background-fetch';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadConfig, saveTrackingStatus, loadTrackingStatus, loadPrefs, TrackerConfig, TrackerPrefs, TrackingStatus } from './storage';
import { sendFix, syncBatch, GpsFix } from './api';
import { notifyAlert } from './notifications';  // foreground notification is managed by Android itself via startLocationUpdatesAsync
import { withWakeLock, getBatteryState } from './powerManagement';
import { pickCheapestFix, freshnessWindowMs, FixCandidate, FixSource } from './fixStrategy';

const LOCATION_TASK = 'tagz-location-task';
const SYNC_TASK     = 'tagz-sync-task';        // periodic sync check
const STATUS_EVENT  = 'tagz-status-event';

// === Offline queue: in-memory for speed + AsyncStorage for survival ===
// The queue survives app kill/reboot (bounded FIFO, oldest dropped first).
// Persisted copy is best-effort: corruption resets to empty, never crashes.
const QUEUE_KEY = 'tagz.queue.v1';
const offlineQueue: GpsFix[] = [];
let queueLoaded = false;
let consecutiveFailures = 0;
let lowBatteryNotified = false;  // once per tracking session
let statusSnapshot: TrackingStatus | null = null;

async function loadQueue(prefsQueueLimit: number): Promise<void> {
  if (queueLoaded) return;
  queueLoaded = true;
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      for (const f of parsed.slice(-prefsQueueLimit)) {
        if (f && typeof f.latitude === 'number' && typeof f.longitude === 'number') {
          offlineQueue.push(f as GpsFix);
        }
      }
    }
  } catch { /* corrupt queue — start empty */ }
}

async function persistQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(offlineQueue));
  } catch { /* quota/private mode — keep in-memory only */ }
}

async function pushQueued(fix: GpsFix, limit: number): Promise<void> {
  await loadQueue(limit);
  offlineQueue.push(fix);
  // FIFO bound: drop oldest first and count the loss via status counters.
  while (offlineQueue.length > limit) offlineQueue.shift();
  await persistQueue();
}

async function clearQueue(): Promise<void> {
  offlineQueue.length = 0;
  await persistQueue();
}

// === Status pub/sub — components subscribe to update UI ===
type StatusListener = (status: TrackingStatus) => void;
const listeners = new Set<StatusListener>();

export function subscribeToStatus(listener: StatusListener): () => void {
  listeners.add(listener);
  // Push current snapshot on subscribe
  if (statusSnapshot) listener(statusSnapshot);
  return () => listeners.delete(listener);
}

async function emitStatus(patch: Partial<TrackingStatus>) {
  const current = await loadTrackingStatus();
  const next = { ...current, ...patch };
  await saveTrackingStatus(next);
  statusSnapshot = next;
  listeners.forEach((l) => l(next));
}

/** Map the user-facing accuracy pref to an expo-location accuracy. */
function toExpoAccuracy(prefs: TrackerPrefs): Location.Accuracy {
  switch (prefs.accuracy) {
    case 'saver':   return Location.Accuracy.Low;
    case 'precise': return Location.Accuracy.High;
    case 'balanced':
    default:        return Location.Accuracy.Balanced;
  }
}

/** Shared location-task options so start / bootstrap / reconfigure agree. */
function buildTaskOptions(config: TrackerConfig, prefs: TrackerPrefs) {
  const intervalSec = Number.isFinite(config.interval) ? Math.min(3600, Math.max(60, config.interval)) : 60;
  return {
    accuracy: toExpoAccuracy(prefs),
    timeInterval: intervalSec * 1000,  // Android clamps to 60s min
    distanceInterval: prefs.distanceInterval,  // 0 = fire on schedule regardless of movement
    foregroundService: {
      notificationTitle: 'Tagzheimer tracking',
      notificationBody:  `Serial: ${config.serial}`,
      notificationColor: '#0a0a0a',
    },
    pausesUpdatesAutomatically: false, // don't pause when stationary
    showsBackgroundLocationIndicator: true,
  };
}

function toCandidate(loc: Location.LocationObject): FixCandidate {
  return {
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    timestamp: loc.timestamp,
    accuracy: loc.coords.accuracy ?? null,
  };
}

async function readCachedFix(): Promise<FixCandidate | null> {
  try {
    const loc = await Location.getLastKnownPositionAsync();
    return loc ? toCandidate(loc) : null;
  } catch {
    return null;
  }
}

/**
 * Fresh GPS one-shot, bounded by the user's timeout so a cold start with
 * no sky view can't hold the radio on indefinitely (the old code had no
 * bound at all). Resolves null on timeout or provider error.
 */
async function readFreshLoc(prefs: TrackerPrefs): Promise<Location.LocationObject | null> {
  const timeoutMs = Math.max(5, prefs.gpsTimeoutSec) * 1000;
  try {
    return await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: toExpoAccuracy(prefs) }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

// === Background task definition ===

async function performTrackingCycle(taskFix?: FixCandidate | null) {
  // Skip if paused
  const status = await loadTrackingStatus();
  if (status.state === 'paused') {
    // Update notification to show paused state
    // (foreground notification is managed by Android — no need to update)
    return;
  }
  if (status.state !== 'running') return;  // stopped

  const config = await loadConfig();
  if (!config.serial) {
    await emitStatus({ lastError: 'No serial configured', lastSendAt: Date.now() });
    return;
  }
  const prefs = await loadPrefs();

  await withWakeLock(async () => {
    // 1. Acquire a fix — cheapest usable source wins (see fixStrategy.ts).
    //    Precise mode always powers the GPS; efficient mode reuses the free
    //    OS-delivered fix or a fresh-enough cached one first.
    const windowMs = freshnessWindowMs(config.interval);
    const nowMs = Date.now();
    let candidate: FixCandidate | null = null;
    let source: FixSource = 'none';
    let fullLoc: Location.LocationObject | null = null;

    if (prefs.fixMode === 'efficient') {
      const picked = pickCheapestFix(taskFix ?? null, await readCachedFix(), nowMs, windowMs);
      candidate = picked.fix;
      source = picked.source;
    }

    if (!candidate) {
      fullLoc = await readFreshLoc(prefs);
      if (fullLoc) {
        candidate = toCandidate(fullLoc);
        source = 'gps';
      } else if (prefs.fixMode === 'efficient') {
        // GPS timed out — a stale cached fix still beats reporting nothing.
        candidate = await readCachedFix();
        source = candidate ? 'gps-stale' : 'none';
      }
    }

    if (!candidate) {
      await emitStatus({ lastError: 'GPS unavailable (timeout, no cached fix)', lastSendAt: Date.now() });
      return;
    }

    const fix: GpsFix = {
      latitude:  candidate.latitude,
      longitude: candidate.longitude,
      timestamp: new Date(candidate.timestamp).toISOString(),
      accuracy:  candidate.accuracy,
      altitude:  fullLoc?.coords.altitude  ?? null,
      speed:      fullLoc?.coords.speed      ?? null,
    };

    // 2. Get battery (low threshold follows the user's pref)
    const battery = await getBatteryState(prefs.batteryThreshold);

    // 3. Send (or queue)
    const result = await sendFix(config, fix, battery.level);

    if (result.success) {
      consecutiveFailures = 0;
      const patch: Partial<TrackingStatus> = {
        lastFixAt:   Date.now(),
        lastSendAt:  Date.now(),
        lastSendOk:  true,
        lastError:   null,
        lastFixSource: source,
        totalSent:   (status.totalSent || 0) + 1,
      };
      await emitStatus(patch);

      // Drain any queued offline fixes
      await loadQueue(prefs.queueLimit);
      if (offlineQueue.length > 0) {
        const batchResult = await syncBatch(config, [...offlineQueue], battery.level);
        if (batchResult.success) {
          await clearQueue();
        }
      }
    } else {
      consecutiveFailures++;
      await pushQueued(fix, prefs.queueLimit);
      const patch: Partial<TrackingStatus> = {
        lastFixAt:   Date.now(),
        lastSendAt:  Date.now(),
        lastSendOk:  false,
        lastError:   result.error || 'Unknown error',
        lastFixSource: source,
        queuedCount: offlineQueue.length,
        totalFailed: (status.totalFailed || 0) + 1,
      };
      await emitStatus(patch);

      // Notify on 3rd consecutive failure (don't spam on every miss)
      if (consecutiveFailures === 3 && prefs.failureAlerts) {
        await notifyAlert(
          'Backend unreachable',
          `3 consecutive failures. Last error: ${(result.error || '').slice(0, 80)}`,
          { screen: 'paired' },
        );
      }
    }

    // 4. Update foreground notification
    // (foreground notification is managed by Android — status shown in-app via subscribeToStatus)

    // 5. Battery alert — once per tracking session when crossing the
    // user's threshold (and not charging)
    if (battery.isLow && !battery.isCharging && prefs.batteryAlerts && !lowBatteryNotified) {
      lowBatteryNotified = true;
      await notifyAlert(
        'Tracker battery low',
        `Battery at ${battery.level}% (threshold ${prefs.batteryThreshold}%). Charge this device soon.`,
        { screen: 'paired' },
      );
    }
  });
}

// === Define the location task (must be at module scope, not inside a component) ===
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BG] location task error:', error);
    return;
  }
  // The OS delivers its own fix with the task wakeup — passing it in lets
  // efficient mode skip powering the GPS chip entirely this cycle.
  let taskFix: FixCandidate | null = null;
  try {
    const locs = (data as unknown as { locations?: Location.LocationObject[] })?.locations;
    const last = Array.isArray(locs) && locs.length > 0 ? locs[locs.length - 1] : null;
    taskFix = last ? toCandidate(last) : null;
  } catch {
    taskFix = null;
  }
  try {
    await performTrackingCycle(taskFix);
  } catch (err) {
    console.error('[BG] tracking cycle failed:', err);
  }
});

// === Define the periodic sync task (fallback when location doesn't fire) ===
BackgroundFetch.registerTaskAsync(SYNC_TASK, {
  minimumInterval: 60, // seconds — actual interval is OS-controlled, often 15 min
});

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    const status = await loadTrackingStatus();
    if (status.state !== 'running') return BackgroundFetchResult.NoData;
    // The location task already fires on schedule — only run a sync cycle
    // when the last send is stale. Without this gate both tasks fire every
    // interval and the tracker burns 2× requests (and 2× per-device rate
    // budget) for zero extra freshness.
    const config = await loadConfig();
    const intervalMs = (Number.isFinite(config.interval)
      ? Math.min(3600, Math.max(15, config.interval))
      : 60) * 1000;
    if (status.lastSendAt && Date.now() - status.lastSendAt < intervalMs * 0.9) {
      return BackgroundFetchResult.NoData;
    }
    await performTrackingCycle();
    return BackgroundFetchResult.NewData;
  } catch (err) {
    console.error('[BG] sync task failed:', err);
    return BackgroundFetchResult.Failed;
  }
});

// === Public API ===

/**
 * Start background tracking. Must be called from a foregrounded app
 * (Android requires foreground to register a location task + show the
 * foreground notification).
 */
export async function startTracking(): Promise<{ ok: boolean; error?: string }> {
  // 1. Make sure permissions are granted
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return { ok: false, error: 'Foreground location permission denied' };

  try {
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      // Continue anyway — foreground tracking still works
      console.warn('[BG] background location denied — will only track in foreground');
    }
  } catch {
    // Older Android may not have a separate prompt
  }

  // 2. Register the location task
  const config = await loadConfig();
  const prefs = await loadPrefs();
  try {
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!isRegistered) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, buildTaskOptions(config, prefs));
    }
  } catch (err: any) {
    return { ok: false, error: `Task registration failed: ${err.message}` };
  }

  // 3. Update state
  await emitStatus({
    state: 'running',
    startedAt: Date.now(),
    lastError: null,
  });
  consecutiveFailures = 0;
  lowBatteryNotified = false;

  // 4. The persistent foreground notification is created by Android itself
  // (via the `foregroundService` config above). We DON'T schedule a separate
  // one — that would create a duplicate. Status updates flow through:
  //   - this foreground service notification (static title set above)
  //   - separate non-sticky alert notifications via notifyAlert()
  //   - the app's UI on the tracker screen (live status from subscribeToStatus)

  // 5. Notify user via a separate one-shot alert
  await notifyAlert('Tracking started', `Tagzheimer is now tracking serial ${config.serial}`);

  // 6. Fire one immediate cycle (so the user sees a fix right away, not after the first interval)
  performTrackingCycle().catch((err) => console.error('[BG] immediate cycle failed:', err));

  return { ok: true };
}

export async function pauseTracking(): Promise<void> {
  await emitStatus({ state: 'paused' });
  const status = await loadTrackingStatus();
  await notifyAlert('Tracking paused', 'Tap the persistent notification to resume');
}

export async function resumeTracking(): Promise<void> {
  await emitStatus({ state: 'running', lastError: null });
  const status = await loadTrackingStatus();
  await notifyAlert('Tracking resumed', 'Tagzheimer is active again');
  // Fire an immediate cycle on resume
  performTrackingCycle().catch(() => {});
}

export async function stopTracking(): Promise<void> {
  // Stop the location task
  try {
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    }
  } catch (err) {
    console.warn('[BG] failed to stop location task:', err);
  }

  // Reset state
  await emitStatus({
    state: 'stopped',
    startedAt: null,
    lastError: null,
    queuedCount: 0,
  });

  // (foreground service notification is auto-dismissed by Android when we stop the task)
  await notifyAlert('Tracking stopped', 'Tagzheimer is no longer tracking this device');

  // Clear queue (memory + persisted)
  await clearQueue();
  consecutiveFailures = 0;
  lowBatteryNotified = false;
}

/**
 * Re-register the OS location task with the current interval / accuracy /
 * distance prefs — called by the settings screen so changes apply without
 * stopping tracking. No-op when tracking isn't active.
 */
export async function reconfigureTask(): Promise<void> {
  try {
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!isRegistered) return;
    const config = await loadConfig();
    const prefs = await loadPrefs();
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    await Location.startLocationUpdatesAsync(LOCATION_TASK, buildTaskOptions(config, prefs));
  } catch (err) {
    console.warn('[BG] reconfigure failed:', err);
  }
}

/**
 * Bootstrap on app start — call from the root layout effect.
 * Checks if tracking was active before and re-registers the task if so
 * (unless the user disabled auto-resume in settings).
 */
export async function bootstrapTracking() {
  const status = await loadTrackingStatus();
  statusSnapshot = status;

  if (status.state === 'running' || status.state === 'paused') {
    const prefs = await loadPrefs();
    if (!prefs.autoResume) {
      // User opted out — park the state instead of silently restarting.
      await emitStatus({ state: 'stopped', startedAt: null });
      return;
    }
    // Was running before — restart the OS-level task (it doesn't survive app kill
    // on some Android versions)
    const config = await loadConfig();
    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (!isRegistered) {
        const safeInterval = Number.isFinite(config.interval) ? Math.min(3600, Math.max(60, config.interval)) : 60;
        const intervalMs = safeInterval * 1000;
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: toExpoAccuracy(prefs),
          timeInterval: intervalMs,
          distanceInterval: prefs.distanceInterval,
          foregroundService: {
            notificationTitle: 'Tagzheimer tracking',
            notificationBody:  `Serial: ${config.serial}`,
            notificationColor: '#0a0a0a',
          },
          pausesUpdatesAutomatically: false,
        });
      }
      // (foreground notification is recreated by Android when the task re-registers)
    } catch (err) {
      console.error('[BG] bootstrap re-register failed:', err);
    }
  }
}

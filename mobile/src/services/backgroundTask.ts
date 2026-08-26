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
 *   2. The OS calls task()    — fetches GPS, sends to backend, updates notification
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

import { loadConfig, saveTrackingStatus, loadTrackingStatus, TrackingStatus } from './storage';
import { sendFix, syncBatch, GpsFix } from './api';
import { notifyAlert } from './notifications';  // foreground notification is managed by Android itself via startLocationUpdatesAsync
import { withWakeLock, getBatteryState } from './powerManagement';

const LOCATION_TASK = 'tagz-location-task';
const SYNC_TASK     = 'tagz-sync-task';        // periodic sync check
const STATUS_EVENT  = 'tagz-status-event';

// === In-memory queue (lost on app kill — main purpose is to coalesce
// backend-unreachable retries within a session) ===
const offlineQueue: GpsFix[] = [];
let consecutiveFailures = 0;
let statusSnapshot: TrackingStatus | null = null;

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

// === Background task definition ===

async function performTrackingCycle() {
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

  await withWakeLock(async () => {
    // 1. Get current location
    let loc: Location.LocationObject | null = null;
    try {
      loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,  // lower accuracy = less battery drain in background
      });
    } catch (err: any) {
      await emitStatus({ lastError: `GPS error: ${err.message}` });
      return;
    }

    const fix: GpsFix = {
      latitude:  loc.coords.latitude,
      longitude: loc.coords.longitude,
      timestamp: new Date(loc.timestamp).toISOString(),
      accuracy:  loc.coords.accuracy  ?? null,
      altitude:  loc.coords.altitude  ?? null,
      speed:      loc.coords.speed      ?? null,
    };

    // 2. Get battery
    const battery = await getBatteryState();

    // 3. Send (or queue)
    const result = await sendFix(config, fix, battery.level);

    if (result.success) {
      consecutiveFailures = 0;
      const patch: Partial<TrackingStatus> = {
        lastFixAt:   Date.now(),
        lastSendAt:  Date.now(),
        lastSendOk:  true,
        lastError:   null,
        totalSent:   (status.totalSent || 0) + 1,
      };
      await emitStatus(patch);

      // Drain any queued offline fixes
      if (offlineQueue.length > 0) {
        const batchResult = await syncBatch(config, offlineQueue, battery.level);
        if (batchResult.success) {
          offlineQueue.length = 0;
        }
      }
    } else {
      consecutiveFailures++;
      offlineQueue.push(fix);
      if (offlineQueue.length > 50) offlineQueue.shift();  // bound the queue
      const patch: Partial<TrackingStatus> = {
        lastFixAt:   Date.now(),
        lastSendAt:  Date.now(),
        lastSendOk:  false,
        lastError:   result.error || 'Unknown error',
        queuedCount: offlineQueue.length,
        totalFailed: (status.totalFailed || 0) + 1,
      };
      await emitStatus(patch);

      // Notify on 3rd consecutive failure (don't spam on every miss)
      if (consecutiveFailures === 3) {
        await notifyAlert(
          'Backend unreachable',
          `3 consecutive failures. Last error: ${(result.error || '').slice(0, 80)}`,
          { screen: 'paired' },
        );
      }
    }

    // 4. Update foreground notification
    // (foreground notification is managed by Android — status shown in-app via subscribeToStatus)

    // 5. Battery alert
    if (battery.isLow && !battery.isCharging) {
      // Only alert once when crossing threshold — could use a flag in storage
      // For simplicity, just include it in the notification body
    }
  });
}

// === Define the location task (must be at module scope, not inside a component) ===
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BG] location task error:', error);
    return;
  }
  // data contains the new location if we use watchPosition; since we
  // use getCurrentPositionAsync inside the task, we ignore data here.
  try {
    await performTrackingCycle();
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
  try {
    const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
    if (!isRegistered) {
      // Convert interval (seconds) to timeInterval (ms); minimum 60000 (60s) on Android
      const intervalMs = Math.max(60, config.interval) * 1000;
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: intervalMs,
        distanceInterval: 0,    // 0 = fire on schedule regardless of movement
        foregroundService: {
          notificationTitle: 'Tagzheimer tracking',
          notificationBody:  `Serial: ${config.serial}`,
          notificationColor: '#0a0a0a',
        },
        pausesUpdatesAutomatically: false, // don't pause when stationary
        showsBackgroundLocationIndicator: true,
      });
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

  // Clear in-memory queue
  offlineQueue.length = 0;
  consecutiveFailures = 0;
}

/**
 * Bootstrap on app start — call from the root layout effect.
 * Checks if tracking was active before and re-registers the task if so.
 */
export async function bootstrapTracking() {
  const status = await loadTrackingStatus();
  statusSnapshot = status;

  if (status.state === 'running' || status.state === 'paused') {
    // Was running before — restart the OS-level task (it doesn't survive app kill
    // on some Android versions)
    const config = await loadConfig();
    try {
      const isRegistered = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (!isRegistered) {
        const intervalMs = Math.max(60, config.interval) * 1000;
        await Location.startLocationUpdatesAsync(LOCATION_TASK, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: intervalMs,
          distanceInterval: 0,
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

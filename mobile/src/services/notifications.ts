/**
 * Notifications service
 * --------------------
 * Manages two kinds of notifications:
 *
 *  1. Foreground service notification — persistent, low-priority, can't be
 *     dismissed. Required by Android for any foreground service running
 *     location in the background. Shows the current tracking state.
 *     Updated in-place (same notification ID) — no spam.
 *
 *  2. Status alerts — non-persistent, normal-priority. Fires on:
 *     - Tracking started / stopped
 *     - Backend unreachable (3 consecutive failures)
 *     - Battery low (<20%)
 *     - Pairing success / failure
 *
 * Action buttons:
 *  - PAUSE     — pauses tracking (notification stays, state changes)
 *  - STOP      — stops tracking entirely (notification dismissed)
 *  - OPEN      — opens the app to the tracker screen
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { TrackingStatus } from './storage';

const CHANNEL_ID = 'tagzheimer-tracking';
const CHANNEL_NAME = 'Tracking Status';
const ALERTS_CHANNEL_ID = 'tagzheimer-alerts';
const FOREGROUND_NOTIF_ID = 1;

// === Initialization ===

export async function initNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: CHANNEL_NAME,
      importance: Notifications.AndroidImportance.LOW,  // no sound for the persistent one
      description: 'Persistent notification while tracking is active',
      showBadge: false,
    });

    await Notifications.setNotificationChannelAsync(ALERTS_CHANNEL_ID, {
      name: 'Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      description: 'Tracking events: errors, pairing, low battery',
      showBadge: true,
    });
  }

  const { status } = await Notifications.requestPermissionsAsync({
    android: {
      allowAlert: true,
      allowBadge: true,
      allowPriority: true,
      allowSound: true,
    },
  });
  return status;
}

// === Foreground service notification ===

/**
 * Show / update the persistent foreground notification.
 * Call this whenever the tracking status changes — it updates in place
 * so the user doesn't get spammed.
 */
export async function updateForegroundNotification(status: TrackingStatus, serial: string) {
  if (status.state === 'stopped') {
    await dismissForegroundNotification();
    return;
  }

  const title = status.state === 'running'
    ? 'Tagzheimer tracking'
    : 'Tagzheimer paused';

  const subtitle = `Serial: ${serial}`;

  const queuedStr = status.queuedCount > 0
    ? ` · ${status.queuedCount} queued`
    : '';

  const body = status.state === 'running'
    ? (status.lastSendOk === true
        ? `Last send OK${queuedStr}`
        : status.lastError
          ? `Last error: ${status.lastError.slice(0, 50)}${queuedStr}`
          : `Waiting for GPS fix${queuedStr}`)
    : 'Tap to resume';

  const trigger = { type: 'channel' as const, channelId: CHANNEL_ID };
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      subtitle,
      body,
      data: { screen: 'paired' },
      sticky: true,             // can't be swiped away
      priority: 'low',
      categoryIdentifier: status.state === 'running' ? 'tracking-running' : 'tracking-paused',
    },
    trigger,
    identifier: String(FOREGROUND_NOTIF_ID),
  });
}

export async function dismissForegroundNotification() {
  await Notifications.dismissNotificationAsync(String(FOREGROUND_NOTIF_ID));
}

// === Status alerts ===

export async function notifyAlert(
  title: string,
  body: string,
  data: Record<string, any> = {},
) {
  const trigger = { type: 'channel' as const, channelId: ALERTS_CHANNEL_ID };
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      priority: 'high',
    },
    trigger,
  });
}

// === Notification categories (action buttons) ===

export async function setupNotificationCategories() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationCategoryAsync('tracking-running', [
    {
      identifier: 'PAUSE',
      buttonTitle: 'Pause',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'STOP',
      buttonTitle: 'Stop',
      options: {
        opensAppToForeground: false,
        isDestructive: true,
      },
    },
    {
      identifier: 'OPEN',
      buttonTitle: 'Open',
      options: { opensAppToForeground: true },
    },
  ]);

  await Notifications.setNotificationCategoryAsync('tracking-paused', [
    {
      identifier: 'RESUME',
      buttonTitle: 'Resume',
      options: { opensAppToForeground: false },
    },
    {
      identifier: 'STOP',
      buttonTitle: 'Stop',
      options: {
        opensAppToForeground: false,
        isDestructive: true,
      },
    },
    {
      identifier: 'OPEN',
      buttonTitle: 'Open',
      options: { opensAppToForeground: true },
    },
  ]);
}

// === Notification tap handler — returns action identifier ===
//
// Call this once on app startup with a callback that handles
// 'PAUSE' / 'RESUME' / 'STOP' / 'OPEN'.
export function subscribeToNotifications(
  onAction: (action: string, data?: any) => void
) {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const actionId = response.actionIdentifier || 'OPEN';
    const data = response.notification.request.content.data;
    onAction(actionId, data);
  });
  return () => sub.remove();
}

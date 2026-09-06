/**
 * Browser notification helpers for device alerts.
 * Pure helpers + thin Notification wrapper. The transition watcher lives
 * here so DevicesContext stays lean; all functions are safe to call
 * during render except requestAlertPermission / sendBrowserAlert (user
 * gesture / effect only).
 */
import { isLowBattery } from './settings';

export function isAlertSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getAlertPermission() {
  if (!isAlertSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestAlertPermission() {
  if (!isAlertSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function sendBrowserAlert(title, body, tag) {
  try {
    if (!isAlertSupported() || Notification.permission !== 'granted') return false;
    const n = new Notification(title, { body, tag: tag || title });
    return !!n;
  } catch {
    return false;
  }
}

/**
 * Diff previous device state against the new list and return alert events.
 * prev is a Map(id → { status, batteryNotified }) maintained by the caller.
 *
 * Events: { type: 'offline' | 'reconnect' | 'lowBattery', device }
 */
export function diffDeviceAlerts(prev, devices, settings) {
  const events = [];
  if (!settings?.alerts?.enabled) return events;
  const threshold = settings.devices.lowBattery;

  for (const d of devices || []) {
    const id = d._id;
    if (!id) continue;
    const was = prev.get(id);
    if (!was) continue; // first sighting — never alert on initial load

    if (was.status === 'online' && d.status === 'offline' && settings.alerts.offline) {
      events.push({ type: 'offline', device: d });
    }
    if (was.status === 'offline' && d.status === 'online' && settings.alerts.reconnect) {
      events.push({ type: 'reconnect', device: d });
    }
    if (
      settings.alerts.lowBattery &&
      !was.batteryNotified &&
      isLowBattery(d.battery, threshold)
    ) {
      events.push({ type: 'lowBattery', device: d });
    }
  }
  return events;
}

export function alertText(event, threshold) {
  const name = event.device?.name || event.device?.serialNumber || 'Device';
  switch (event.type) {
    case 'offline':
      return { title: `${name} went offline`, body: 'No fixes received. The tracker may be out of coverage or out of battery.' };
    case 'reconnect':
      return { title: `${name} is back online`, body: 'Tracking resumed — fresh fixes are coming in.' };
    case 'lowBattery':
      return {
        title: `${name} battery low`,
        body: `Battery at ${event.device?.battery ?? '?'}% (threshold ${threshold}%). Charge the tracker soon.`,
      };
    default:
      return { title: name, body: '' };
  }
}

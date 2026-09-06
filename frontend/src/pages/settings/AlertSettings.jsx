import { useState } from 'react';
import { Section, Row, Switch, Note } from '../../components/settings/SettingsControls';
import { useDevices } from '../../hooks/useDevices';
import {
  getAlertPermission,
  requestAlertPermission,
  sendBrowserAlert,
  isAlertSupported,
} from '../../services/alerts';
import { usePrefs } from './usePrefs';

export default function AlertSettings() {
  const [settings, set] = usePrefs();
  const { totalDevices } = useDevices();
  const [perm, setPerm] = useState(() => getAlertPermission());

  const handleEnableAlerts = async () => {
    const p = await requestAlertPermission();
    setPerm(p);
    if (p === 'granted') {
      set({ alerts: { enabled: true } });
      sendBrowserAlert('Alerts on', 'Tagzheimer will notify you about device status changes.', 'tagz-test');
    }
  };

  const handleTestAlert = () => {
    const ok = sendBrowserAlert(
      'Test alert',
      `Tagzheimer notifications are working · ${totalDevices} device(s) tracked.`,
      'tagz-test'
    );
    if (!ok) setPerm(getAlertPermission());
  };

  const alertsOn = settings.alerts.enabled;
  const permGranted = perm === 'granted';

  return (
    <Section index="05" title="Notifications" desc="Browser alerts when trackers change state. Needs this tab open — the dashboard watches while you work.">
      {!isAlertSupported() ? (
        <Note>This browser does not support notifications — alerts are unavailable here.</Note>
      ) : (
        <>
          <Row label="Device alerts" hint={permGranted ? 'Permission granted' : 'Requires browser permission'}>
            <Switch
              checked={alertsOn && permGranted}
              onChange={(v) => {
                if (v) handleEnableAlerts();
                else set({ alerts: { enabled: false } });
              }}
              label="Device alerts"
            />
          </Row>
          {alertsOn && !permGranted && (
            <div className="px-5 py-4">
              <button
                onClick={handleEnableAlerts}
                className="w-full h-11 bg-white text-canvas text-[13px] font-semibold hover:bg-ink-2 transition-colors tap-highlight"
              >
                Grant notification permission
              </button>
            </div>
          )}
          <Row label="Went offline" hint="A tracker stops reporting">
            <Switch checked={settings.alerts.offline} onChange={(v) => set({ alerts: { offline: v } })} label="Offline alerts" />
          </Row>
          <Row label="Back online" hint="A tracker resumes reporting">
            <Switch checked={settings.alerts.reconnect} onChange={(v) => set({ alerts: { reconnect: v } })} label="Reconnect alerts" />
          </Row>
          <Row label="Low battery" hint={`Fires once per crossing below ${settings.devices.lowBattery}%`}>
            <Switch checked={settings.alerts.lowBattery} onChange={(v) => set({ alerts: { lowBattery: v } })} label="Low battery alerts" />
          </Row>
          <div className="px-5 py-4">
            <button
              onClick={handleTestAlert}
              className="w-full h-11 bg-surface-2 border border-hairline-2 text-ink-2 text-[13px] font-medium hover:text-ink transition-colors tap-highlight"
            >
              Send test notification
            </button>
          </div>
        </>
      )}
    </Section>
  );
}

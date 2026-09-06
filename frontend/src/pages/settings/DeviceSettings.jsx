import { Section, Row, Segmented, Switch, Slider } from '../../components/settings/SettingsControls';
import { usePrefs } from './usePrefs';

const REFRESH_OPTS = [
  { value: 0, label: 'Off', title: 'No auto-refresh' },
  { value: 15, label: '15s' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
];

export default function DeviceSettings() {
  const [settings, set] = usePrefs();

  return (
    <Section index="04" title="Devices" desc="List order, filtering, thresholds and live refresh.">
      <Row label="Sort order" hint="Battery puts the weakest tracker first" stacked>
        <Segmented
          ariaLabel="Device sort order"
          value={settings.devices.sort}
          onChange={(v) => set({ devices: { sort: v } })}
          options={[
            { value: 'status', label: 'Status' },
            { value: 'name', label: 'Name' },
            { value: 'battery', label: 'Battery' },
            { value: 'recent', label: 'Recent' },
          ]}
        />
      </Row>
      <Row label="Hide offline" hint="Offline trackers disappear from dashboard and map">
        <Switch checked={settings.devices.hideOffline} onChange={(v) => set({ devices: { hideOffline: v } })} label="Hide offline devices" />
      </Row>
      <Row label="Low-battery threshold" hint="Below this the battery reads critical (dim)">
        <Slider value={settings.devices.lowBattery} min={5} max={50} step={5} onChange={(v) => set({ devices: { lowBattery: v } })} format={(v) => `${v}%`} ariaLabel="Low battery threshold" />
      </Row>
      <Row label="Auto-refresh" hint="Re-fetch the list while the tab is visible">
        <Segmented
          ariaLabel="Auto-refresh interval"
          value={settings.devices.refresh}
          onChange={(v) => set({ devices: { refresh: v } })}
          options={REFRESH_OPTS}
        />
      </Row>
    </Section>
  );
}

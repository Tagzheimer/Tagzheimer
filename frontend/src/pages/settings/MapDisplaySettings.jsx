import { Section, Row, Segmented, Switch, Slider } from '../../components/settings/SettingsControls';
import { usePrefs } from './usePrefs';

export default function MapDisplaySettings() {
  const [settings, set] = usePrefs();

  return (
    <Section index="03" title="Map & display" desc="Tiles, zoom, trail and how numbers read.">
      <Row label="Map style" hint="Dark inverts OpenStreetMap · satellite uses Esri imagery" stacked>
        <Segmented
          ariaLabel="Map style"
          value={settings.map.tiles}
          onChange={(v) => set({ map: { tiles: v } })}
          options={[
            { value: 'dark', label: 'Dark' },
            { value: 'light', label: 'Light' },
            { value: 'satellite', label: 'Satellite' },
          ]}
        />
      </Row>
      <Row label="Device zoom" hint="Default zoom on the single-device map">
        <Slider value={settings.map.zoom} min={3} max={18} step={1} onChange={(v) => set({ map: { zoom: v } })} format={(v) => `${v}`} ariaLabel="Device map zoom" />
      </Row>
      <Row label="Trail length" hint="Recent fixes drawn on the device map · 0 hides the trail">
        <Slider value={settings.map.trail} min={0} max={500} step={10} onChange={(v) => set({ map: { trail: v } })} format={(v) => (v === 0 ? 'Off' : `${v}`)} ariaLabel="Trail length" />
      </Row>
      <Row label="Crosshair" hint="Telemetry overlay on the device map">
        <Switch checked={settings.map.crosshair} onChange={(v) => set({ map: { crosshair: v } })} label="Crosshair overlay" />
      </Row>
      <Row label="Units" hint="Speed and altitude across device pages">
        <Segmented
          ariaLabel="Units"
          value={settings.display.units}
          onChange={(v) => set({ display: { units: v } })}
          options={[
            { value: 'metric', label: 'Metric' },
            { value: 'imperial', label: 'Imperial' },
          ]}
        />
      </Row>
      <Row label="Coordinates" hint="Decimal or degrees-minutes-seconds">
        <Segmented
          ariaLabel="Coordinate format"
          value={settings.display.coords}
          onChange={(v) => set({ display: { coords: v } })}
          options={[
            { value: 'decimal', label: 'Decimal' },
            { value: 'dms', label: 'DMS' },
          ]}
        />
      </Row>
      <Row label="Clock" hint="12h or 24h wherever times render">
        <Segmented
          ariaLabel="Clock format"
          value={settings.display.clock}
          onChange={(v) => set({ display: { clock: v } })}
          options={[
            { value: '24h', label: '24h' },
            { value: '12h', label: '12h' },
          ]}
        />
      </Row>
      <Row label="Relative times" hint="“5m ago” instead of absolute timestamps in lists">
        <Switch checked={settings.display.relativeTime} onChange={(v) => set({ display: { relativeTime: v } })} label="Relative times" />
      </Row>
    </Section>
  );
}

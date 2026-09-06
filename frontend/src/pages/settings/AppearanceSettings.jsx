import { Section, Row, Segmented, Switch } from '../../components/settings/SettingsControls';
import { usePrefs } from './usePrefs';

export default function AppearanceSettings() {
  const [settings, set] = usePrefs();

  return (
    <Section index="02" title="Appearance" desc="Monochrome, always — but tuned to your eyes. Applies instantly.">
      <Row label="Text size" hint="Scales the whole dashboard">
        <Segmented
          ariaLabel="Text size"
          value={settings.appearance.textSize}
          onChange={(v) => set({ appearance: { textSize: v } })}
          options={[
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
            { value: 'l', label: 'L' },
          ]}
        />
      </Row>
      <Row label="Contrast" hint="Brightens secondary text and borders">
        <Segmented
          ariaLabel="Contrast"
          value={settings.appearance.contrast}
          onChange={(v) => set({ appearance: { contrast: v } })}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'high', label: 'High' },
          ]}
        />
      </Row>
      <Row label="Reduce motion" hint="Disables pulses, spins and transitions">
        <Switch checked={settings.appearance.reduceMotion} onChange={(v) => set({ appearance: { reduceMotion: v } })} label="Reduce motion" />
      </Row>
      <Row label="Focus rings" hint="Visible keyboard-navigation outlines">
        <Switch checked={settings.appearance.focusRing} onChange={(v) => set({ appearance: { focusRing: v } })} label="Focus rings" />
      </Row>
    </Section>
  );
}

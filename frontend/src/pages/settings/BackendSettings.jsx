import { useEffect, useState } from 'react';
import { Section, Row, Segmented } from '../../components/settings/SettingsControls';
import { useDevices } from '../../hooks/useDevices';
import { getBackendUrl, setBackendUrl, isCustomBackend, pingBackend } from '../../services/backendConfig';
import { getSettings } from '../../services/settings';
import { APP_VERSION } from '../../utils/constants';
import { usePrefs } from './usePrefs';

const TIMEOUT_OPTS = [
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
  { value: 20, label: '20s' },
  { value: 30, label: '30s' },
];

export default function BackendSettings() {
  const [settings, set] = usePrefs();
  const { totalDevices, activeDevices, refresh } = useDevices();

  // === Backend URL state (lazy init — no setState-in-effect) ===
  const [backendUrl, setBackendUrlState] = useState(() => getBackendUrl());
  const [custom, setCustom] = useState(() => isCustomBackend());
  const [health, setHealth] = useState({ ok: null, message: 'Checking…' });
  const [copied, setCopied] = useState(false);

  // Health ping — re-runs when the URL or the timeout pref changes.
  useEffect(() => {
    let cancelled = false;
    pingBackend(backendUrl).then((r) => {
      if (!cancelled) setHealth(r);
    });
    return () => {
      cancelled = true;
    };
  }, [backendUrl, settings.network.timeout]);

  const handleSaveBackend = () => {
    setBackendUrl(backendUrl);
    setCustom(isCustomBackend());
    refresh();
  };

  const handleResetBackend = () => {
    setBackendUrl(''); // clears the localStorage override
    const env = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    setBackendUrlState(env);
    setCustom(false);
    refresh();
  };

  const handleCopyDiagnostics = async () => {
    const s = getSettings();
    const text = [
      `Tagzheimer ${APP_VERSION} diagnostics`,
      `backend: ${getBackendUrl() || '(same-origin / proxy)'}`,
      `health: ${health.ok === true ? 'reachable' : health.ok === false ? 'unreachable' : 'checking'} (${health.message})`,
      `devices: ${totalDevices} total · ${activeDevices} online`,
      `tiles: ${s.map.tiles} · zoom: ${s.map.zoom} · trail: ${s.map.trail}`,
      `sort: ${s.devices.sort} · hideOffline: ${s.devices.hideOffline} · lowBattery: ${s.devices.lowBattery}%`,
      `refresh: ${s.devices.refresh}s · timeout: ${s.network.timeout}s · alerts: ${s.alerts.enabled}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Section index="06" title="Backend & network" desc="Point this dashboard at any backend — no rebuild. Timeout applies to API calls and health checks.">
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="label-mono">Backend URL</span>
          <span className="flex items-center gap-1.5 text-[10px] label-mono">
            <span className={`w-1.5 h-1.5 rounded-full ${health.ok === true ? 'bg-white animate-pulse-soft' : health.ok === false ? 'bg-ink-3' : 'bg-hairline-2'}`} />
            {health.ok === true ? 'REACHABLE' : health.ok === false ? 'UNREACHABLE' : 'CHECKING'}
          </span>
        </div>
        <input
          type="url"
          value={backendUrl}
          onChange={(e) => setBackendUrlState(e.target.value)}
          placeholder="https://api.tagzheimer.com or empty for same-origin"
          className="w-full h-11 px-3 bg-canvas border border-hairline text-ink text-[14px] focus:border-white transition-colors outline-none placeholder:text-ink-4 font-mono"
        />
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSaveBackend}
            className="flex-1 h-10 bg-white text-canvas text-[13px] font-semibold hover:bg-ink-2 transition-colors tap-highlight"
          >
            Save & Refresh
          </button>
          <button
            onClick={handleResetBackend}
            className="flex-1 h-10 bg-surface-2 border border-hairline-2 text-ink-2 text-[13px] font-medium hover:text-ink transition-colors tap-highlight"
          >
            Reset to default
          </button>
        </div>
        <p className="text-[11px] text-ink-3 label-mono pt-1">
          {custom ? 'CUSTOM OVERRIDE ACTIVE' : `BUILD DEFAULT · ${backendUrl || '(same-origin / proxy)'} · ${health.message}`}
        </p>
      </div>
      <Row label="Request timeout" hint="How long API calls wait before failing">
        <Segmented
          ariaLabel="Request timeout"
          value={settings.network.timeout}
          onChange={(v) => set({ network: { timeout: v } })}
          options={TIMEOUT_OPTS}
        />
      </Row>
      <div className="px-5 py-4">
        <button
          onClick={handleCopyDiagnostics}
          className="w-full h-11 bg-surface-2 border border-hairline-2 text-ink-2 text-[13px] font-medium hover:text-ink transition-colors tap-highlight"
        >
          {copied ? 'Copied to clipboard' : 'Copy diagnostics'}
        </button>
      </div>
    </Section>
  );
}

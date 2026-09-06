import { useRef, useState } from 'react';
import { Section, Row, Note } from '../../components/settings/SettingsControls';
import { useDevices } from '../../hooks/useDevices';
import { resetSettings, exportSettings, importSettings } from '../../services/settings';
import { downloadFile, devicesToCSV } from '../../utils/format';

function todayStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

export default function DataSettings() {
  const { allDevices, totalDevices } = useDevices();
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef(null);

  const handleExportDevices = (format) => {
    if (format === 'csv') {
      downloadFile(`tagzheimer-devices-${todayStamp()}.csv`, devicesToCSV(allDevices), 'text/csv');
    } else {
      downloadFile(
        `tagzheimer-devices-${todayStamp()}.json`,
        JSON.stringify({ exportedAt: new Date().toISOString(), devices: allDevices }, null, 2)
      );
    }
  };

  const handleExportSettings = () => {
    downloadFile(`tagzheimer-settings-${todayStamp()}.json`, exportSettings());
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const r = importSettings(text);
      setImportMsg(r.ok ? 'Settings imported and applied.' : r.error || 'Import failed.');
    } catch {
      setImportMsg('Could not read that file.');
    }
  };

  const handleResetAll = () => {
    if (window.confirm('Reset all settings to defaults? Your backend URL override is kept — use “Reset to default” in Backend to clear that too.')) {
      resetSettings();
    }
  };

  return (
    <Section index="07" title="Data" desc="Your rows, your files. Exports include everything this account can see.">
      <Row label="Export devices" hint={`${totalDevices} device(s) · JSON keeps every field`} stacked>
        <div className="flex gap-2">
          <button
            onClick={() => handleExportDevices('json')}
            className="flex-1 h-11 px-4 bg-surface-2 border border-hairline-2 text-ink text-[13px] font-semibold hover:bg-surface-3 transition-colors tap-highlight"
          >
            JSON
          </button>
          <button
            onClick={() => handleExportDevices('csv')}
            className="flex-1 h-11 px-4 bg-surface-2 border border-hairline-2 text-ink text-[13px] font-semibold hover:bg-surface-3 transition-colors tap-highlight"
          >
            CSV
          </button>
        </div>
      </Row>
      <Row label="Settings file" hint="Back up or move your preferences">
        <div className="flex gap-2">
          <button
            onClick={handleExportSettings}
            className="flex-1 h-11 px-4 bg-surface-2 border border-hairline-2 text-ink text-[13px] font-semibold hover:bg-surface-3 transition-colors tap-highlight"
          >
            Export
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 h-11 px-4 bg-surface-2 border border-hairline-2 text-ink text-[13px] font-semibold hover:bg-surface-3 transition-colors tap-highlight"
          >
            Import
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} aria-label="Import settings file" />
        </div>
      </Row>
      {importMsg && (
        <div className="px-5 py-3">
          <p className="text-[12px] text-ink-2" role="status">{importMsg}</p>
        </div>
      )}
      <Row label="Reset settings" hint="Back to factory defaults (appearance, map, devices, alerts, network)">
        <button
          onClick={handleResetAll}
          className="h-11 px-4 bg-transparent border border-hairline-2 text-ink-2 text-[13px] font-medium hover:bg-surface-2 hover:text-ink transition-colors tap-highlight"
        >
          Reset all
        </button>
      </Row>
      <Note>
        Deleting devices or erasing history happens in your database (Supabase dashboard or SQL).
        Exports never include auth tokens.
      </Note>
    </Section>
  );
}

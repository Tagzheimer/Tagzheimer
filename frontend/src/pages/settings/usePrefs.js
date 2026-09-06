import { useEffect, useState } from 'react';
import { getSettings, updateSettings, subscribe } from '../../services/settings';

/**
 * Reactive snapshot of the settings store for settings pages.
 * The store applies + persists instantly; this hook only re-renders
 * the page holding it. Returns [settings, updateSettings].
 */
export function usePrefs() {
  const [settings, setSettings] = useState(() => getSettings());

  useEffect(() => subscribe(() => setSettings(getSettings())), []);

  return [settings, updateSettings];
}

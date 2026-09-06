/**
 * Settings sidebar navigation — single source of truth for section
 * labels, descriptions, and sub-route paths. Used by SettingsLayout
 * (chips + rail) and App.jsx (route definitions).
 */
export const SETTINGS_NAV = [
  { id: 'account', label: 'Account', desc: 'Profile & sign out', path: '/profile/account' },
  { id: 'appearance', label: 'Appearance', desc: 'Text, contrast, motion', path: '/profile/appearance' },
  { id: 'map', label: 'Map & display', desc: 'Tiles, units, formats', path: '/profile/map' },
  { id: 'devices', label: 'Devices', desc: 'Sort, filter, refresh', path: '/profile/devices' },
  { id: 'alerts', label: 'Alerts', desc: 'Browser notifications', path: '/profile/alerts' },
  { id: 'backend', label: 'Backend', desc: 'URL, timeout, diagnostics', path: '/profile/backend' },
  { id: 'data', label: 'Data', desc: 'Export, backup, reset', path: '/profile/data' },
  { id: 'about', label: 'About', desc: 'Docs, repo, legal', path: '/profile/about' },
];

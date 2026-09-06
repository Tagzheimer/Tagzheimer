/**
 * Display formatting driven by settings (display section).
 * All functions are pure — safe to call during render.
 */

export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const t = new Date(dateStr).getTime();
  if (!Number.isFinite(t)) return '—';
  const diff = Date.now() - t;
  if (diff < 0) return 'in the future';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1m ago';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Timestamp for lists/details. Relative ("5m ago") when enabled,
 * otherwise a locale string honoring the 12h/24h clock pref.
 */
export function formatTimestamp(dateStr, { clock = '24h', relative = true, relativeTime } = {}) {
  if (!dateStr) return '—';
  const useRelative = relativeTime !== undefined ? relativeTime : relative;
  if (useRelative) return timeAgo(dateStr);
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: clock !== '24h',
  });
}

export function formatClock(dateStr, { clock = '24h' } = {}) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: clock !== '24h',
  });
}

/**
 * Coordinates. Decimal matches the old UI exactly (6dp).
 * DMS renders like 48°51'29"N 2°17'40"E.
 */
export function formatCoords(lat, lon, mode = 'decimal') {
  if (lat == null || lon == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon))) {
    return '—';
  }
  if (mode === 'dms') return `${toDMS(lat, true)} ${toDMS(lon, false)}`;
  return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
}

function toDMS(value, isLat) {
  const abs = Math.abs(Number(value));
  let deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  let min = Math.floor(minFloat);
  let sec = Math.round((minFloat - min) * 60);
  if (sec >= 60) { sec = 0; min += 1; }
  if (min >= 60) { min = 0; deg += 1; }
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
  return `${deg}°${min}'${sec}"${dir}`;
}

const KMH_TO_MPH = 0.621371;
const M_TO_FT = 3.28084;

/**
 * Speed. The backend stores the tracker's raw speed value; the dashboard
 * has always rendered it as km/h, so metric mode preserves that exactly
 * and imperial converts to mph.
 */
export function formatSpeed(speed, units = 'metric') {
  if (speed == null || !Number.isFinite(Number(speed))) return '—';
  if (units === 'imperial') return `${(Number(speed) * KMH_TO_MPH).toFixed(1)} mph`;
  return `${Number(speed).toFixed(1)} km/h`;
}

export function formatAltitude(alt, units = 'metric') {
  if (alt == null || !Number.isFinite(Number(alt))) return '—';
  if (units === 'imperial') return `${(Number(alt) * M_TO_FT).toFixed(0)} ft`;
  return `${Number(alt).toFixed(1)} m`;
}

/** Trigger a client-side file download (exports). */
export function downloadFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v) {
  let s = v == null ? '' : String(v);
  // CSV injection guard: prefix =, +, -, @, tab/CR formulas with a quote.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function devicesToCSV(devices) {
  const rows = [
    ['name', 'serialNumber', 'patientName', 'status', 'battery', 'lastSeen', 'notes'],
    ...(Array.isArray(devices) ? devices : []).map((d) => [
      d.name, d.serialNumber, d.patientName, d.status, d.battery, d.lastSeen, d.notes,
    ]),
  ];
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

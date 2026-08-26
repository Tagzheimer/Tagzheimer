/**
 * Backend URL resolution
 * ----------------------
 * Priority order (highest wins):
 *   1. Runtime override saved by the user (localStorage) — Profile page
 *   2. Build-time env var (VITE_API_URL)
 *   3. '' → same-origin, so dev uses the Vite proxy at /api
 *
 * The override lets caregivers point a deployed frontend at any backend
 * without rebuilding (the "deploy anywhere" feature).
 */

const STORAGE_KEY = 'tagzheimer.backendUrl';

function normalize(url) {
  if (!url) return '';
  return String(url).trim().replace(/\/+$/, '');
}

export function getBackendUrl() {
  const override = normalize(localStorage.getItem(STORAGE_KEY));
  if (override !== '') return override;
  return normalize(import.meta.env.VITE_API_URL);
}

export function setBackendUrl(url) {
  const clean = normalize(url);
  if (clean === '') {
    localStorage.removeItem(STORAGE_KEY); // clear override
  } else {
    localStorage.setItem(STORAGE_KEY, clean);
  }
}

export function isCustomBackend() {
  return normalize(localStorage.getItem(STORAGE_KEY)) !== '';
}

/**
 * Ping a backend's health endpoint.
 * Returns { ok: boolean, message: string }.
 */
export async function pingBackend(baseUrl) {
  const target = normalize(baseUrl);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${target}/api/health`, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, message: `HTTP ${res.status}` };
    }
    const body = await res.json();
    return { ok: true, message: body?.database ? `${body.mode} · ${body.database}` : 'reachable' };
  } catch (err) {
    return { ok: false, message: err.name === 'AbortError' ? 'Timeout (5s)' : 'Unreachable' };
  }
}

import axios from 'axios';
import { getBackendUrl } from './backendConfig';

/**
 * Axios instance for the Tagzheimer backend.
 *
 * baseURL is resolved lazily on every request so that runtime overrides
 * (via the Settings UI) take effect immediately without reload.
 *
 * In dev mode with no override and no VITE_API_URL, baseURL is '' which
 * makes axios use the Vite dev-server proxy at /api → http://localhost:5000
 * (see vite.config.js).
 */
const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

// Resolve baseURL at request time so Settings changes apply instantly
api.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl();
  return config;
});

function getToken() {
  return localStorage.getItem('token') || sessionStorage.getItem('token');
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// === Auth ===
export const authAPI = {
  verifyToken: () => api.post('/api/auth/verify'),
};

// === Devices (caregiver-facing) ===
export const devicesAPI = {
  getAll:     () => api.get('/api/devices'),
  getById:    (id) => api.get(`/api/devices/${id}`),
  getBySerial: (serialNumber) => api.get(`/api/devices/serial/${encodeURIComponent(serialNumber)}`),
  create:     (data) => api.post('/api/devices', data),
  pair:       (data) => api.post('/api/devices/pair', data),
  delete:     (id) => api.delete(`/api/devices/${id}`),
};

// === Location ===
export const locationAPI = {
  // Latest fix
  getCurrent: (deviceId) => api.get(`/api/location/${deviceId}`),

  // Latest fix WITH telemetry (v2 endpoint)
  getCurrentWithMeta: async (deviceId) => {
    // /history returns array newest-first; take the first entry
    const r = await api.get(`/api/location/${deviceId}/history?limit=1`);
    return r.data?.locations?.[0] || null;
  },

  // Trail — up to N historical fixes
  getHistory: (deviceId, limit = 50) =>
    api.get(`/api/location/${deviceId}/history`, { params: { limit } })
      .then((r) => r.data?.locations || []),

  // Push a single fix (firmware / mobile app — but available for testing from UI)
  update: (data) => api.post('/api/location/update', data),

  // Batch sync an offline queue
  batch: (data) => api.post('/api/location/batch', data),
};

export default api;

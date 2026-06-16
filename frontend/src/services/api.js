import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
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

export const authAPI = {
  verifyToken: () => api.post('/api/auth/verify'),
};

export const devicesAPI = {
  getAll: () => api.get('/api/devices'),
  getById: (id) => api.get(`/api/devices/${id}`),
  create: (data) => api.post('/api/devices', data),
  delete: (id) => api.delete(`/api/devices/${id}`),
};

export const locationAPI = {
  getCurrent: (deviceId) => api.get(`/api/location/${deviceId}`),
  update: (data) => api.post('/api/location/update', data),
};

export default api;

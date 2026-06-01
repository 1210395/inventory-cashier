import axios from 'axios';
import { useRouter } from 'vue-router';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach Bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: redirect to /login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // Hash route so it works under file:// in the Electron cashier shell.
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

// --- Request caching for GET requests that don't change often ---
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

export async function cachedGet(path, config) {
  const now = Date.now();
  const key = typeof config?.params === 'object'
    ? path + '?' + new URLSearchParams(config.params).toString()
    : path;
  if (cache.has(key) && (now - cache.get(key).time) < CACHE_TTL) {
    return cache.get(key).data;
  }
  const response = await api.get(path, config);
  cache.set(key, { data: response, time: now });
  return response;
}

export function clearCache(path) {
  if (path) {
    // Delete all cache entries that start with the given path
    for (const key of cache.keys()) {
      if (key === path || key.startsWith(path + '?')) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

export function setToken(token) {
  localStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

export function getToken() {
  return localStorage.getItem('auth_token');
}

export default api;

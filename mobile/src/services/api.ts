// Axios instance with JWT interceptor and automatic fallback for Web
import axios from 'axios';
import { Platform } from 'react-native';
import { clearAll, getToken } from '../utils/storage';

const PRODUCTION_API_URL = 'https://infut.vercel.app/api';

// Use EXPO_PUBLIC_API_URL for custom endpoints.
// On Web outside localhost, automatically use the same origin (/api) so Vercel/production works seamlessly.
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const { hostname, origin } = window.location;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${origin}/api`;
    }
  }
  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${defaultHost}:3333/api`;
}

export const API_URL = resolveApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - fallback to production API if local backend is offline, and clear invalid session on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as any;

    if (
      !error.response &&
      config &&
      !config._retriedProduction &&
      !process.env.EXPO_PUBLIC_API_URL &&
      String(api.defaults.baseURL || '').includes('localhost:3333')
    ) {
      config._retriedProduction = true;
      api.defaults.baseURL = PRODUCTION_API_URL;
      config.baseURL = PRODUCTION_API_URL;
      return api.request(config);
    }

    if (error.response?.status === 401) {
      await clearAll();
      console.warn('Token expired or invalid');
    }
    return Promise.reject(error);
  }
);

export default api;

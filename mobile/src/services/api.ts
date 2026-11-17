// Axios instance with JWT interceptor
import axios from 'axios';
import { Platform } from 'react-native';
import { getToken } from '../utils/storage';

// Use EXPO_PUBLIC_API_URL for physical device testing (e.g. http://192.168.x.x:3333/api)
// For emulator/web, defaults to 10.0.2.2 (Android) or localhost (Web/iOS)
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${DEFAULT_HOST}:3333/api`;

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

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — could trigger logout here
      console.warn('Token expired or invalid');
    }
    return Promise.reject(error);
  }
);

export default api;
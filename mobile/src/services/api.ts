// Axios instance with JWT interceptor
import axios from 'axios';
import { getToken } from '../utils/storage';

// Use your machine's local IP for physical device testing
// For emulator, use 10.0.2.2 (Android) or localhost (iOS)
const API_URL = 'http://10.0.2.2:3333/api';

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
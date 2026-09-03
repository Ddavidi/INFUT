// Auth API calls
import api from './api';
import { AuthResponse } from '../types';

export async function registerUser(name: string, email: string, password: string): Promise<AuthResponse> {
  const response = await api.post('/auth/register', { name, email, password });
  return response.data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}
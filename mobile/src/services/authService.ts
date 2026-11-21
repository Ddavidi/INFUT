// Auth API calls
import api from './api';
import { AuthResponse, ProfileExtras } from '../types';

export async function registerUser(
  name: string,
  email: string,
  password: string,
  extras: ProfileExtras = {}
): Promise<AuthResponse> {
  const response = await api.post('/auth/register', { name, email, password, ...extras });
  return response.data;
}

export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
}
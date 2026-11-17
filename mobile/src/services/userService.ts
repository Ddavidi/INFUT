// User API calls
import api from './api';
import { User, UpdateProfileInput, RankingPlayer } from '../types';

export async function getProfile(): Promise<User> {
  const response = await api.get('/users/me');
  return response.data;
}

export async function getRanking(): Promise<RankingPlayer[]> {
  const response = await api.get('/users/ranking');
  return response.data;
}

export async function updateProfile(data: UpdateProfileInput): Promise<User> {
  const response = await api.put('/users/me', data);
  return response.data;
}

export async function deleteAccount(): Promise<void> {
  await api.delete('/users/me');
}

// Pelada API calls
import api from './api';
import { Pelada, CreatePeladaInput } from '../types';

export async function createPelada(data: CreatePeladaInput): Promise<Pelada> {
  const response = await api.post('/peladas', data);
  return response.data;
}

export async function listPeladas(): Promise<Pelada[]> {
  const response = await api.get('/peladas');
  return response.data;
}

export async function getPeladaById(id: string): Promise<Pelada> {
  const response = await api.get(`/peladas/${id}`);
  return response.data;
}

export async function deletePelada(id: string): Promise<void> {
  await api.delete(`/peladas/${id}`);
}

export async function joinPelada(inviteCode: string): Promise<{ message: string, pelada: Pelada }> {
  const response = await api.post('/peladas/join', { inviteCode });
  return response.data;
}
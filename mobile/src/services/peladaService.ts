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

export async function rsvpPelada(id: string, status: string, reason?: string): Promise<any> {
  const response = await api.put(`/peladas/${id}/rsvp`, { status, reason });
  return response.data;
}

export async function togglePayment(id: string, paid: boolean): Promise<any> {
  const response = await api.patch(`/peladas/${id}/payment`, { paid });
  return response.data;
}

export async function updateStats(peladaId: string, participantId: string, stats: { goals: number, assists: number, defenses: number }): Promise<any> {
  const response = await api.patch(`/peladas/${peladaId}/participants/${participantId}/stats`, stats);
  return response.data;
}

export async function voteMvp(peladaId: string, candidateParticipantId: string): Promise<any> {
  const response = await api.post(`/peladas/${peladaId}/mvp-vote`, { candidateParticipantId });
  return response.data;
}
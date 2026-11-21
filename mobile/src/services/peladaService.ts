// Pelada API calls
import api from './api';
import {
  AttendanceStatus,
  CreatePeladaInput,
  MemberType,
  PaymentStatus,
  Pelada,
  PeladaDrawMode,
  PeladaGameConfig,
  PeladaGameMode,
  PeladaLifecycleStatus,
  PeladaVotingStatus,
} from '../types';

export async function createPelada(data: CreatePeladaInput): Promise<Pelada> {
  const response = await api.post('/peladas', data);
  return response.data;
}

export async function updatePelada(
  id: string,
  data: Partial<CreatePeladaInput>
): Promise<Pelada> {
  const response = await api.put(`/peladas/${id}`, data);
  return response.data;
}

export async function listPeladas(): Promise<Pelada[]> {
  const response = await api.get('/peladas');
  return response.data;
}

export async function explorePeladas(params?: {
  sport?: string;
  region?: string;
  search?: string;
}): Promise<Pelada[]> {
  const response = await api.get('/peladas/explore', { params });
  return response.data;
}

export async function getPeladaById(id: string): Promise<Pelada> {
  const response = await api.get(`/peladas/${id}`);
  return response.data;
}

export async function getPublicPeladaByCode(inviteCode: string): Promise<Pelada> {
  const response = await api.get(`/peladas/public/${encodeURIComponent(inviteCode.trim())}`);
  return response.data;
}

export async function deletePelada(id: string): Promise<void> {
  await api.delete(`/peladas/${id}`);
}

export async function joinPeladaByCode(inviteCode: string): Promise<Pelada> {
  const response = await api.post('/peladas/join-code', { inviteCode });
  return response.data;
}

export async function rsvpPelada(
  peladaId: string,
  data: { status: 'CONFIRMED' | 'DECLINED'; isGoalkeeper?: boolean; position?: string | null }
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/rsvp`, data);
  return response.data;
}

export async function addGuestPlayer(
  peladaId: string,
  data: { guestName: string; isGoalkeeper?: boolean; position?: string | null }
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/guests`, data);
  return response.data;
}

export async function removePlayerFromPelada(
  peladaId: string,
  playerId: string
): Promise<Pelada> {
  const response = await api.delete(`/peladas/${peladaId}/players/${playerId}`);
  return response.data;
}

export async function updatePlayerRole(
  peladaId: string,
  playerId: string,
  role: 'CO_ORGANIZER' | 'PLAYER'
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/players/${playerId}/role`, { role });
  return response.data;
}

export async function updatePlayerPayment(
  peladaId: string,
  playerId: string,
  paymentStatus: PaymentStatus
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/players/${playerId}/payment`, {
    paymentStatus,
  });
  return response.data;
}

export async function updatePlayerCheckin(
  peladaId: string,
  playerId: string,
  data: { attendanceStatus?: AttendanceStatus; memberType?: MemberType }
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/players/${playerId}/checkin`, data);
  return response.data;
}

export async function updatePlayerStats(
  peladaId: string,
  playerId: string,
  data: { goals: number; assists: number }
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/players/${playerId}/stats`, data);
  return response.data;
}

export async function drawPeladaTeams(
  peladaId: string,
  data: {
    playersPerTeam?: number;
    balancedByPosition?: boolean;
    teamNames?: string[];
    gameMode?: PeladaGameMode;
    drawMode?: PeladaDrawMode;
    fixedTeamsCount?: number;
  }
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/draw-teams`, data);
  return response.data;
}

export async function updatePeladaGameConfig(
  peladaId: string,
  config: Partial<PeladaGameConfig>
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/game-config`, config);
  return response.data;
}

export async function batchUpdatePlayerCheckin(
  peladaId: string,
  data: { attendanceStatus: 'PENDING' | 'PRESENT' | 'INJURED'; playerIds?: string[] }
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/checkin-batch`, data);
  return response.data;
}

export async function updatePeladaVotingStatus(
  peladaId: string,
  votingStatus: PeladaVotingStatus
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/voting-status`, { votingStatus });
  return response.data;
}

export async function setManualPeladaTeams(
  peladaId: string,
  teams: { name: string; playerIds: string[] }[]
): Promise<Pelada> {
  const response = await api.put(`/peladas/${peladaId}/teams`, { teams });
  return response.data;
}

export async function updatePeladaStatus(
  peladaId: string,
  status: PeladaLifecycleStatus
): Promise<Pelada> {
  const response = await api.patch(`/peladas/${peladaId}/status`, { status });
  return response.data;
}

export async function startNextPeladaCycle(peladaId: string): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/next-cycle`);
  return response.data;
}

export async function recordPeladaMatch(
  peladaId: string,
  data: {
    teamAName: string;
    teamBName: string;
    scoreA: number;
    scoreB: number;
    leavingTeamName?: string;
  }
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/matches`, data);
  return response.data;
}

export async function voteMvp(
  peladaId: string,
  targetPlayerId: string
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/vote-mvp`, { targetPlayerId });
  return response.data;
}

export async function voteGoalkeeper(
  peladaId: string,
  targetPlayerId: string
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/vote-goalkeeper`, { targetPlayerId });
  return response.data;
}

// ---------- Sincronizacao em tempo real ----------

export async function getPeladaSyncVersion(
  peladaId: string
): Promise<{ syncVersion: string; status: string; serverNow: number }> {
  const response = await api.get(`/peladas/${peladaId}/sync`, {
    params: { t: Date.now() },
  });
  return response.data;
}

// ---------- Sumula ao vivo ----------

export async function addLiveGoal(
  peladaId: string,
  data: { teamName: string; scorerId?: string | null; assistId?: string | null; ownGoal?: boolean }
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/live/goals`, data);
  return response.data;
}

export async function removeLiveGoal(peladaId: string, eventId: string): Promise<Pelada> {
  const response = await api.delete(`/peladas/${peladaId}/live/goals/${eventId}`);
  return response.data;
}

export async function setLiveMatchup(
  peladaId: string,
  data: { teamAName: string; teamBName: string }
): Promise<Pelada> {
  const response = await api.put(`/peladas/${peladaId}/live/matchup`, data);
  return response.data;
}

export async function controlLiveTimer(
  peladaId: string,
  action: 'START' | 'PAUSE' | 'RESET'
): Promise<Pelada> {
  const response = await api.post(`/peladas/${peladaId}/live/timer`, { action });
  return response.data;
}

export async function setTeamPhoto(
  peladaId: string,
  teamName: string,
  photoUrl: string | null
): Promise<Pelada> {
  const response = await api.put(`/peladas/${peladaId}/team-photo`, { teamName, photoUrl });
  return response.data;
}

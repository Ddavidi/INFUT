// src/schemas/pelada.schema.ts
import { z } from 'zod';

export const createPeladaSchema = z.object({
  title: z.string().min(3, 'Titulo deve ter pelo menos 3 caracteres'),
  sport: z.string().min(1, 'Esporte e obrigatorio'),
  dateTime: z.string().datetime({ message: 'Data/hora invalida (use formato ISO 8601)' }),
  location: z.string().min(1, 'Local e obrigatorio'),
  locationAddress: z.string().optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceDay: z.string().optional().nullable(),
  maxPlayers: z.number().int().min(2).optional().nullable(),
  isPublic: z.boolean().optional().default(true),
  pixKey: z.string().optional().nullable(),
  goalkeepersExempt: z.boolean().optional().default(true),
  playersPerTeam: z.number().int().min(1).max(20).optional().default(5),
  cancelDeadlineHours: z.number().int().min(0).max(72).optional().default(4),
  durationHours: z.number().min(0.5).max(12).optional().default(2),
  whatsappGroupUrl: z.string().optional().nullable(),
});

export const updatePeladaSchema = createPeladaSchema.partial();

export const rsvpSchema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED']),
  isGoalkeeper: z.boolean().optional().default(false),
  position: z.string().optional().nullable(),
});

export const joinByCodeSchema = z.object({
  inviteCode: z.string().min(3, 'Codigo de convite invalido'),
});

export const addGuestSchema = z.object({
  guestName: z.string().min(2, 'Nome do convidado deve ter pelo menos 2 caracteres'),
  isGoalkeeper: z.boolean().optional().default(false),
  position: z.string().optional().nullable(),
});

export const updatePaymentSchema = z.object({
  paymentStatus: z.enum(['PENDING', 'WAITING_CONFIRMATION', 'PAID', 'EXEMPT']),
});

export const updateRoleSchema = z.object({
  role: z.enum(['CO_ORGANIZER', 'PLAYER']),
});

export const updateCheckinSchema = z.object({
  attendanceStatus: z.enum(['PENDING', 'PRESENT', 'NO_SHOW']).optional(),
  memberType: z.enum(['MENSALISTA', 'DIARISTA']).optional(),
});

export const updateStatsSchema = z.object({
  goals: z.number().int().min(0),
  assists: z.number().int().min(0),
});

export const voteMvpSchema = z.object({
  targetPlayerId: z.string().min(1, 'Selecione um jogador'),
});

export const voteGoalkeeperSchema = z.object({
  targetPlayerId: z.string().min(1, 'Selecione um goleiro'),
});

export const recordMatchSchema = z.object({
  teamAName: z.string().min(1, 'Time A e obrigatorio'),
  teamBName: z.string().min(1, 'Time B e obrigatorio'),
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
});

export const drawTeamsSchema = z.object({
  playersPerTeam: z.number().int().min(2).max(15).optional(),
  balancedByPosition: z.boolean().optional().default(true),
  teamNames: z.array(z.string().min(1).max(60)).min(2).max(10).optional(),
});

export const updatePeladaStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'FINISHED']),
});

export const setManualTeamsSchema = z.object({
  teams: z.array(
    z.object({
      name: z.string().min(1).max(60),
      playerIds: z.array(z.string().min(1)),
    })
  ).min(1),
});

export type CreatePeladaInput = z.infer<typeof createPeladaSchema>;
export type UpdatePeladaInput = z.infer<typeof updatePeladaSchema>;
export type RsvpInput = z.infer<typeof rsvpSchema>;
export type JoinByCodeInput = z.infer<typeof joinByCodeSchema>;
export type AddGuestInput = z.infer<typeof addGuestSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateCheckinInput = z.infer<typeof updateCheckinSchema>;
export type UpdateStatsInput = z.infer<typeof updateStatsSchema>;
export type VoteMvpInput = z.infer<typeof voteMvpSchema>;
export type VoteGoalkeeperInput = z.infer<typeof voteGoalkeeperSchema>;
export type RecordMatchInput = z.infer<typeof recordMatchSchema>;
export type DrawTeamsInput = z.infer<typeof drawTeamsSchema>;
export type UpdatePeladaStatusInput = z.infer<typeof updatePeladaStatusSchema>;
export type SetManualTeamsInput = z.infer<typeof setManualTeamsSchema>;

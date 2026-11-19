// src/services/pelada.service.ts
import prisma from '../utils/prisma';
import {
  AddGuestInput,
  BatchCheckinInput,
  CreatePeladaInput,
  DrawTeamsInput,
  RecordMatchInput,
  RsvpInput,
  SetManualTeamsInput,
  UpdateCheckinInput,
  UpdateGameConfigInput,
  UpdatePeladaInput,
  UpdatePeladaStatusInput,
  UpdateStatsInput,
} from '../schemas/pelada.schema';

export type PeladaGameMode = 'WINNER_STAYS_QUEUE' | 'FIXED_TEAMS';
export type PeladaDrawMode = 'POSITION' | 'RANDOM' | 'MANUAL';
export type PeladaVotingStatus = 'OPEN' | 'CLOSED';

export interface PeladaGameConfig {
  matchDurationMinutes: number;
  playersPerTeam: number;
  gameMode: PeladaGameMode;
  drawMode: PeladaDrawMode;
  fixedTeamsCount: number;
  teamNames: string[];
}

export interface DrawnTeamPlayer {
  id: string;
  name: string;
  position: string | null;
  isGoalkeeper: boolean;
}

export interface DrawnTeam {
  name: string;
  players: DrawnTeamPlayer[];
}

export interface StoredTeamsEnvelope {
  version: 2;
  teams: DrawnTeam[];
  waitingQueue: DrawnTeamPlayer[];
  lastLoserPool: DrawnTeamPlayer[];
  lastRotationSummary: string | null;
  config: PeladaGameConfig;
  votingStatus: PeladaVotingStatus;
}

export interface MatchRecord {
  id: string;
  teamAName: string;
  teamBName: string;
  scoreA: number;
  scoreB: number;
  winner: string;
  finishedAt: string;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getPositionBucket(position: string | null | undefined): number {
  if (!position) return 3;
  const pos = normalizeText(position);
  if (
    pos.includes('zagueir') ||
    pos.includes('lateral') ||
    pos.includes('fixo') ||
    pos.includes('libero') ||
    pos.includes('defens')
  ) {
    return 0;
  }
  if (
    pos.includes('meia') ||
    pos.includes('meio') ||
    pos.includes('volante') ||
    pos.includes('armador') ||
    pos.includes('levantador') ||
    pos.includes('ala')
  ) {
    return 1;
  }
  if (
    pos.includes('atac') ||
    pos.includes('pivo') ||
    pos.includes('ponta') ||
    pos.includes('oposto') ||
    pos.includes('central')
  ) {
    return 2;
  }
  return 3;
}

export class PeladaService {
  private readonly peladaInclude = {
    organizer: {
      select: {
        id: true,
        name: true,
        email: true,
        photoUrl: true,
        region: true,
      },
    },
    players: {
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            sport: true,
            position: true,
            photoUrl: true,
            region: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' as const },
    },
  };

  private createHttpError(message: string, statusCode: number) {
    const error: any = new Error(message);
    error.statusCode = statusCode;
    return error;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 15; attempt++) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await prisma.pelada.findUnique({
        where: { inviteCode: code },
        select: { id: true },
      });
      if (!existing) return code;
    }
    return `INF${Date.now().toString(36).slice(-5).toUpperCase()}`;
  }

  private buildVoteRanking(
    players: any[],
    field: 'votedMvpForId' | 'votedGoalkeeperForId'
  ) {
    const voteCounts: Record<string, number> = {};
    for (const p of players) {
      if (p[field]) {
        voteCounts[p[field]] = (voteCounts[p[field]] || 0) + 1;
      }
    }

    return Object.entries(voteCounts)
      .map(([playerId, votes]) => {
        const target = players.find((p: any) => p.id === playerId);
        return {
          playerId,
          displayName: target?.displayName || 'Jogador',
          votes,
        };
      })
      .sort((a, b) => b.votes - a.votes);
  }

  private safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  private getDefaultConfig(pelada: any): PeladaGameConfig {
    return {
      matchDurationMinutes: 10,
      playersPerTeam: pelada.playersPerTeam || 5,
      gameMode: 'WINNER_STAYS_QUEUE',
      drawMode: 'POSITION',
      fixedTeamsCount: 3,
      teamNames: ['Time Amarelo', 'Time Azul', 'Time Vermelho'],
    };
  }

  private parseTeamsEnvelope(pelada: any): StoredTeamsEnvelope {
    const defaultConfig = this.getDefaultConfig(pelada);
    const parsed = this.safeJsonParse<any>(pelada.teamsJson, null);

    if (!parsed) {
      return {
        version: 2,
        teams: [],
        waitingQueue: [],
        lastLoserPool: [],
        lastRotationSummary: null,
        config: defaultConfig,
        votingStatus: 'OPEN',
      };
    }

    if (Array.isArray(parsed)) {
      return {
        version: 2,
        teams: parsed,
        waitingQueue: [],
        lastLoserPool: [],
        lastRotationSummary: null,
        config: {
          ...defaultConfig,
          fixedTeamsCount: Math.max(2, parsed.length || 3),
          teamNames:
            parsed.length >= 2
              ? parsed.map((t: any, i: number) => t?.name || `Time ${i + 1}`)
              : defaultConfig.teamNames,
        },
        votingStatus: 'OPEN',
      };
    }

    const parsedConfig = parsed.config || {};
    const mergedTeamNames =
      Array.isArray(parsedConfig.teamNames) && parsedConfig.teamNames.length >= 2
        ? parsedConfig.teamNames
        : defaultConfig.teamNames;

    return {
      version: 2,
      teams: Array.isArray(parsed.teams) ? parsed.teams : [],
      waitingQueue: Array.isArray(parsed.waitingQueue) ? parsed.waitingQueue : [],
      lastLoserPool: Array.isArray(parsed.lastLoserPool) ? parsed.lastLoserPool : [],
      lastRotationSummary:
        typeof parsed.lastRotationSummary === 'string' ? parsed.lastRotationSummary : null,
      config: {
        matchDurationMinutes:
          typeof parsedConfig.matchDurationMinutes === 'number'
            ? parsedConfig.matchDurationMinutes
            : defaultConfig.matchDurationMinutes,
        playersPerTeam:
          typeof parsedConfig.playersPerTeam === 'number'
            ? parsedConfig.playersPerTeam
            : defaultConfig.playersPerTeam,
        gameMode:
          parsedConfig.gameMode === 'FIXED_TEAMS' || parsedConfig.gameMode === 'WINNER_STAYS_QUEUE'
            ? parsedConfig.gameMode
            : defaultConfig.gameMode,
        drawMode:
          parsedConfig.drawMode === 'POSITION' ||
          parsedConfig.drawMode === 'RANDOM' ||
          parsedConfig.drawMode === 'MANUAL'
            ? parsedConfig.drawMode
            : defaultConfig.drawMode,
        fixedTeamsCount:
          typeof parsedConfig.fixedTeamsCount === 'number'
            ? parsedConfig.fixedTeamsCount
            : defaultConfig.fixedTeamsCount,
        teamNames: mergedTeamNames,
      },
      votingStatus: parsed.votingStatus === 'CLOSED' ? 'CLOSED' : 'OPEN',
    };
  }

  private formatPelada(pelada: any, currentUserId?: string) {
    const players = (pelada.players || []).map((p: any) => ({
      ...p,
      displayName: p.user?.name || p.guestName || 'Convidado',
    }));

    const confirmedPlayers = players.filter((p: any) => p.status === 'CONFIRMED');
    const confirmedFieldCount = confirmedPlayers.filter((p: any) => !p.isGoalkeeper).length;
    const confirmedGoalkeepersCount = confirmedPlayers.filter((p: any) => p.isGoalkeeper).length;
    const waitlistCount = players.filter((p: any) => p.status === 'WAITLIST').length;

    const myPlayer = currentUserId
      ? players.find((p: any) => p.userId === currentUserId) || null
      : null;

    const myRole =
      pelada.organizerId === currentUserId
        ? 'ORGANIZER'
        : myPlayer?.role || null;

    const unitPrice = pelada.price || 0;
    const payableConfirmed = confirmedPlayers.filter((p: any) => p.paymentStatus !== 'EXEMPT');
    const paidCount = confirmedPlayers.filter((p: any) => p.paymentStatus === 'PAID').length;
    const waitingCount = confirmedPlayers.filter((p: any) => p.paymentStatus === 'WAITING_CONFIRMATION').length;
    const pendingCount = confirmedPlayers.filter((p: any) => p.paymentStatus === 'PENDING').length;
    const exemptCount = confirmedPlayers.filter((p: any) => p.paymentStatus === 'EXEMPT').length;

    const financialSummary = {
      unitPrice,
      totalExpected: Number((payableConfirmed.length * unitPrice).toFixed(2)),
      totalPaid: Number((paidCount * unitPrice).toFixed(2)),
      paidCount,
      waitingCount,
      pendingCount,
      exemptCount,
    };

    const envelope = this.parseTeamsEnvelope(pelada);
    const matches = this.safeJsonParse<MatchRecord[]>(pelada.matchesJson, []);

    const eligibleVoters = confirmedPlayers.filter((p: any) => p.attendanceStatus !== 'NO_SHOW');
    const votesCastCount = eligibleVoters.filter((p: any) => Boolean(p.votedMvpForId)).length;
    const eligibleVotersCount = eligibleVoters.length;

    const isVotingClosed = envelope.votingStatus === 'CLOSED';
    const mvpRanking = isVotingClosed ? this.buildVoteRanking(players, 'votedMvpForId') : [];
    const goalkeeperRanking = isVotingClosed
      ? this.buildVoteRanking(players, 'votedGoalkeeperForId')
      : [];

    const { teamsJson, matchesJson, ...rest } = pelada;
    return {
      ...rest,
      players,
      teams: envelope.teams,
      waitingQueue: envelope.waitingQueue,
      lastLoserPool: envelope.lastLoserPool,
      lastRotationSummary: envelope.lastRotationSummary,
      gameConfig: envelope.config,
      votingStatus: envelope.votingStatus,
      votesCastCount,
      eligibleVotersCount,
      matches,
      confirmedCount: confirmedPlayers.length,
      confirmedFieldCount,
      confirmedGoalkeepersCount,
      waitlistCount,
      myRole,
      myStatus: myPlayer?.status || null,
      myPlayer,
      financialSummary,
      mvpRanking,
      goalkeeperRanking,
    };
  }

  private async ensurePeladaExists(peladaId: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
      include: { players: true },
    });
    if (!pelada) {
      throw this.createHttpError('Peladinha nao encontrada', 404);
    }
    return pelada;
  }

  private async ensureOrganizer(peladaId: string, userId: string) {
    const pelada = await this.ensurePeladaExists(peladaId);
    if (pelada.organizerId !== userId) {
      throw this.createHttpError('Somente o organizador principal tem permissao para esta acao', 403);
    }
    return pelada;
  }

  private async ensureCanManage(peladaId: string, userId: string) {
    const pelada = await this.ensurePeladaExists(peladaId);
    if (pelada.organizerId === userId) {
      return pelada;
    }
    const member = pelada.players.find((p) => p.userId === userId);
    if (!member || (member.role !== 'ORGANIZER' && member.role !== 'CO_ORGANIZER')) {
      throw this.createHttpError('Permissao restrita ao organizador ou co-organizadores', 403);
    }
    return pelada;
  }

  private async promoteFromWaitlistIfPossible(peladaId: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
      select: { id: true, maxPlayers: true },
    });
    if (!pelada) return;

    const confirmedFieldCount = await prisma.peladaPlayer.count({
      where: { peladaId, status: 'CONFIRMED', isGoalkeeper: false },
    });

    const waitlistFieldPlayers = await prisma.peladaPlayer.findMany({
      where: { peladaId, status: 'WAITLIST', isGoalkeeper: false },
      orderBy: { joinedAt: 'asc' },
    });

    if (waitlistFieldPlayers.length === 0) return;

    const slotsAvailable = pelada.maxPlayers
      ? Math.max(0, pelada.maxPlayers - confirmedFieldCount)
      : waitlistFieldPlayers.length;

    if (slotsAvailable <= 0) return;

    const toPromote = waitlistFieldPlayers.slice(0, slotsAvailable);
    await prisma.peladaPlayer.updateMany({
      where: { id: { in: toPromote.map((p) => p.id) } },
      data: { status: 'CONFIRMED' },
    });
  }

  async create(organizerId: string, data: CreatePeladaInput) {
    const organizer = await prisma.user.findUnique({
      where: { id: organizerId },
      select: { id: true, position: true },
    });

    if (!organizer) {
      throw this.createHttpError('Usuario organizador nao encontrado', 404);
    }

    const inviteCode = await this.generateUniqueInviteCode();
    const isFree = !data.price || data.price <= 0;

    const pelada = await prisma.pelada.create({
      data: {
        title: data.title,
        sport: data.sport,
        dateTime: new Date(data.dateTime),
        location: data.location,
        locationAddress: data.locationAddress,
        price: data.price,
        isRecurring: data.isRecurring ?? false,
        recurrenceDay: data.recurrenceDay,
        maxPlayers: data.maxPlayers,
        inviteCode,
        isPublic: data.isPublic ?? true,
        pixKey: data.pixKey || null,
        goalkeepersExempt: data.goalkeepersExempt ?? true,
        playersPerTeam: data.playersPerTeam ?? 5,
        cancelDeadlineHours: data.cancelDeadlineHours ?? 4,
        durationHours: data.durationHours ?? 2,
        whatsappGroupUrl: data.whatsappGroupUrl?.trim() || null,
        organizerId,
        players: {
          create: {
            userId: organizerId,
            role: 'ORGANIZER',
            status: 'CONFIRMED',
            isGoalkeeper: false,
            position: organizer.position,
            paymentStatus: isFree ? 'EXEMPT' : 'PAID',
          },
        },
      },
    });

    if (pelada.isRecurring && pelada.recurrenceDay) {
      await this.createRecurringInstances(pelada, organizer.position, 4);
    }

    return this.getById(pelada.id, organizerId);
  }

  async list(userId: string) {
    const peladas = await prisma.pelada.findMany({
      where: {
        OR: [
          { organizerId: userId },
          { players: { some: { userId } } },
        ],
      },
      include: this.peladaInclude,
      orderBy: { dateTime: 'asc' },
    });

    return peladas.map((p) => this.formatPelada(p, userId));
  }

  async explore(
    userId: string,
    filters: { sport?: string; region?: string; search?: string }
  ) {
    const where: any = {
      isPublic: true,
    };

    if (filters.sport && filters.sport.trim() && filters.sport !== 'Todos') {
      where.sport = filters.sport.trim();
    }

    const peladas = await prisma.pelada.findMany({
      where,
      include: this.peladaInclude,
      orderBy: { dateTime: 'asc' },
    });

    let filtered = peladas;

    if (filters.region && filters.region.trim()) {
      const regionQuery = normalizeText(filters.region);
      filtered = filtered.filter((p) => {
        const haystacks = [
          p.location,
          p.locationAddress || '',
          p.organizer?.region || '',
        ];
        return haystacks.some((h) => normalizeText(h).includes(regionQuery));
      });
    }

    if (filters.search && filters.search.trim()) {
      const searchQuery = normalizeText(filters.search);
      filtered = filtered.filter((p) => {
        const haystacks = [
          p.title,
          p.sport,
          p.location,
          p.locationAddress || '',
          p.organizer?.name || '',
          p.organizer?.region || '',
          p.inviteCode,
        ];
        return haystacks.some((h) => normalizeText(h).includes(searchQuery));
      });
    }

    return filtered.map((p) => this.formatPelada(p, userId));
  }

  async getById(peladaId: string, currentUserId?: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
      include: this.peladaInclude,
    });

    if (!pelada) {
      throw this.createHttpError('Peladinha nao encontrada', 404);
    }

    return this.formatPelada(pelada, currentUserId);
  }

  async getPublicByInviteCode(inviteCode: string) {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const pelada = await prisma.pelada.findUnique({
      where: { inviteCode: normalizedCode },
      include: this.peladaInclude,
    });

    if (!pelada) {
      throw this.createHttpError('Codigo de convite nao encontrado', 404);
    }

    const formatted = this.formatPelada(pelada);
    return {
      ...formatted,
      organizer: {
        ...formatted.organizer,
        email: undefined,
      },
      players: formatted.players.map((p: any) => ({
        ...p,
        user: p.user ? { ...p.user, email: '' } : null,
      })),
    };
  }

  async update(peladaId: string, userId: string, data: UpdatePeladaInput) {
    await this.ensureOrganizer(peladaId, userId);

    const updateData: any = { ...data };
    if (data.dateTime) {
      updateData.dateTime = new Date(data.dateTime);
    }

    await prisma.pelada.update({
      where: { id: peladaId },
      data: updateData,
    });

    await this.promoteFromWaitlistIfPossible(peladaId);
    return this.getById(peladaId, userId);
  }

  async delete(peladaId: string, userId: string) {
    await this.ensureOrganizer(peladaId, userId);
    await prisma.pelada.delete({ where: { id: peladaId } });
    return { message: 'Peladinha cancelada com sucesso' };
  }

  async joinByCode(userId: string, inviteCode: string) {
    const normalizedCode = inviteCode.trim().toUpperCase();
    const pelada = await prisma.pelada.findUnique({
      where: { inviteCode: normalizedCode },
      select: { id: true },
    });

    if (!pelada) {
      throw this.createHttpError('Codigo de convite nao encontrado', 404);
    }

    return this.rsvp(pelada.id, userId, {
      status: 'CONFIRMED',
      isGoalkeeper: false,
    });
  }

  async rsvp(peladaId: string, userId: string, input: RsvpInput) {
    const pelada = await this.ensurePeladaExists(peladaId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, position: true },
    });

    if (!user) {
      throw this.createHttpError('Usuario nao encontrado', 404);
    }

    const existing = await prisma.peladaPlayer.findUnique({
      where: { peladaId_userId: { peladaId, userId } },
    });

    const isOwner = pelada.organizerId === userId;
    const role = isOwner ? 'ORGANIZER' : existing?.role || 'PLAYER';

    if (input.status === 'DECLINED') {
      const hoursRemaining =
        (new Date(pelada.dateTime).getTime() - Date.now()) / 3600000;
      const isLateCancel =
        existing?.status === 'CONFIRMED' &&
        hoursRemaining > 0 &&
        hoursRemaining < pelada.cancelDeadlineHours;

      if (existing) {
        await prisma.peladaPlayer.update({
          where: { id: existing.id },
          data: {
            status: 'DECLINED',
            attendanceStatus: isLateCancel ? 'NO_SHOW' : 'PENDING',
          },
        });
      } else {
        await prisma.peladaPlayer.create({
          data: {
            peladaId,
            userId,
            role,
            status: 'DECLINED',
            isGoalkeeper: Boolean(input.isGoalkeeper),
            position: input.position ?? user.position,
            paymentStatus: 'EXEMPT',
          },
        });
      }

      await this.promoteFromWaitlistIfPossible(peladaId);
      return this.getById(peladaId, userId);
    }

    // status === 'CONFIRMED'
    const isGoalkeeper = Boolean(input.isGoalkeeper);
    const position =
      input.position !== undefined
        ? input.position
        : existing?.position ?? user.position;

    const confirmedFieldOthers = await prisma.peladaPlayer.count({
      where: {
        peladaId,
        status: 'CONFIRMED',
        isGoalkeeper: false,
        NOT: { userId },
      },
    });

    let finalStatus = 'CONFIRMED';
    if (
      !isOwner &&
      !isGoalkeeper &&
      pelada.maxPlayers &&
      confirmedFieldOthers >= pelada.maxPlayers
    ) {
      finalStatus = 'WAITLIST';
    }

    const isFree = !pelada.price || pelada.price <= 0;
    let paymentStatus = existing?.paymentStatus || 'PENDING';
    if (paymentStatus !== 'PAID') {
      if (isFree || (isGoalkeeper && pelada.goalkeepersExempt)) {
        paymentStatus = 'EXEMPT';
      } else if (paymentStatus === 'EXEMPT') {
        paymentStatus = 'PENDING';
      }
    }

    if (existing) {
      await prisma.peladaPlayer.update({
        where: { id: existing.id },
        data: {
          role,
          status: finalStatus,
          isGoalkeeper,
          position,
          paymentStatus,
          attendanceStatus: existing.attendanceStatus === 'NO_SHOW' ? 'PENDING' : existing.attendanceStatus,
        },
      });
    } else {
      await prisma.peladaPlayer.create({
        data: {
          peladaId,
          userId,
          role,
          status: finalStatus,
          isGoalkeeper,
          position,
          paymentStatus,
        },
      });
    }

    if (isGoalkeeper) {
      await this.promoteFromWaitlistIfPossible(peladaId);
    }

    return this.getById(peladaId, userId);
  }

  async addGuest(peladaId: string, actorUserId: string, input: AddGuestInput) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);

    const isGoalkeeper = Boolean(input.isGoalkeeper);
    const confirmedFieldCount = await prisma.peladaPlayer.count({
      where: { peladaId, status: 'CONFIRMED', isGoalkeeper: false },
    });

    const status =
      !isGoalkeeper && pelada.maxPlayers && confirmedFieldCount >= pelada.maxPlayers
        ? 'WAITLIST'
        : 'CONFIRMED';

    const isFree = !pelada.price || pelada.price <= 0;
    const paymentStatus =
      isFree || (isGoalkeeper && pelada.goalkeepersExempt) ? 'EXEMPT' : 'PENDING';

    await prisma.peladaPlayer.create({
      data: {
        peladaId,
        guestName: input.guestName.trim(),
        role: 'PLAYER',
        status,
        isGoalkeeper,
        position: input.position || (isGoalkeeper ? 'Goleiro' : null),
        paymentStatus,
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  async removePlayer(peladaId: string, actorUserId: string, playerRecordId: string) {
    const pelada = await this.ensurePeladaExists(peladaId);
    const record = await prisma.peladaPlayer.findUnique({
      where: { id: playerRecordId },
    });

    if (!record || record.peladaId !== peladaId) {
      throw this.createHttpError('Participante nao encontrado nesta pelada', 404);
    }

    const isSelf = record.userId === actorUserId;
    if (!isSelf) {
      await this.ensureCanManage(peladaId, actorUserId);
    }

    if (record.userId === pelada.organizerId && !isSelf) {
      throw this.createHttpError('Nao e possivel remover o organizador principal', 403);
    }

    await prisma.peladaPlayer.delete({ where: { id: playerRecordId } });
    await this.promoteFromWaitlistIfPossible(peladaId);

    return this.getById(peladaId, actorUserId);
  }

  async updatePlayerRole(
    peladaId: string,
    organizerId: string,
    playerRecordId: string,
    role: 'CO_ORGANIZER' | 'PLAYER'
  ) {
    const pelada = await this.ensureOrganizer(peladaId, organizerId);
    const record = await prisma.peladaPlayer.findUnique({
      where: { id: playerRecordId },
    });

    if (!record || record.peladaId !== peladaId) {
      throw this.createHttpError('Participante nao encontrado nesta pelada', 404);
    }

    if (!record.userId) {
      throw this.createHttpError('Convidados avulsos nao podem ser promovidos a co-organizador', 400);
    }

    if (record.userId === pelada.organizerId) {
      throw this.createHttpError('O organizador principal nao pode ter seu papel alterado', 400);
    }

    await prisma.peladaPlayer.update({
      where: { id: playerRecordId },
      data: { role },
    });

    return this.getById(peladaId, organizerId);
  }

  async updatePaymentStatus(
    peladaId: string,
    actorUserId: string,
    playerRecordId: string,
    paymentStatus: 'PENDING' | 'WAITING_CONFIRMATION' | 'PAID' | 'EXEMPT'
  ) {
    const pelada = await this.ensurePeladaExists(peladaId);
    const record = await prisma.peladaPlayer.findUnique({
      where: { id: playerRecordId },
    });

    if (!record || record.peladaId !== peladaId) {
      throw this.createHttpError('Participante nao encontrado nesta pelada', 404);
    }

    const actorMember = pelada.players.find((p) => p.userId === actorUserId);
    const isManager =
      pelada.organizerId === actorUserId ||
      actorMember?.role === 'ORGANIZER' ||
      actorMember?.role === 'CO_ORGANIZER';

    if (!isManager) {
      if (record.userId !== actorUserId) {
        throw this.createHttpError('Sem permissao para alterar pagamento de outro jogador', 403);
      }
      if (paymentStatus !== 'WAITING_CONFIRMATION' && paymentStatus !== 'PENDING') {
        throw this.createHttpError('Apenas o organizador pode aprovar ou isentar pagamentos', 403);
      }
    }

    await prisma.peladaPlayer.update({
      where: { id: playerRecordId },
      data: { paymentStatus },
    });

    return this.getById(peladaId, actorUserId);
  }

  async updateStats(
    peladaId: string,
    actorUserId: string,
    playerRecordId: string,
    stats: UpdateStatsInput
  ) {
    await this.ensureCanManage(peladaId, actorUserId);
    const record = await prisma.peladaPlayer.findUnique({
      where: { id: playerRecordId },
    });

    if (!record || record.peladaId !== peladaId) {
      throw this.createHttpError('Participante nao encontrado nesta pelada', 404);
    }

    await prisma.peladaPlayer.update({
      where: { id: playerRecordId },
      data: {
        goals: stats.goals,
        assists: stats.assists,
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  private toDrawnPlayer(p: any): DrawnTeamPlayer {
    const pos = p.position || p.user?.position || null;
    const isGk =
      Boolean(p.isGoalkeeper) ||
      (pos ? normalizeText(pos).includes('goleir') : false);
    return {
      id: p.id,
      name: p.user?.name || p.guestName || 'Convidado',
      position: pos,
      isGoalkeeper: isGk,
    };
  }

  async updateGameConfig(
    peladaId: string,
    actorUserId: string,
    input: UpdateGameConfigInput
  ) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const envelope = this.parseTeamsEnvelope(pelada);

    const nextConfig: PeladaGameConfig = {
      ...envelope.config,
      ...(input.matchDurationMinutes !== undefined && {
        matchDurationMinutes: input.matchDurationMinutes,
      }),
      ...(input.playersPerTeam !== undefined && {
        playersPerTeam: input.playersPerTeam,
      }),
      ...(input.gameMode !== undefined && { gameMode: input.gameMode }),
      ...(input.drawMode !== undefined && { drawMode: input.drawMode }),
      ...(input.fixedTeamsCount !== undefined && {
        fixedTeamsCount: input.fixedTeamsCount,
      }),
      ...(input.teamNames !== undefined && input.teamNames.length >= 2 && {
        teamNames: input.teamNames.map((n, i) => n.trim() || `Time ${i + 1}`),
      }),
    };

    const minNamesNeeded =
      nextConfig.gameMode === 'FIXED_TEAMS'
        ? Math.max(2, nextConfig.fixedTeamsCount)
        : 2;
    while (nextConfig.teamNames.length < minNamesNeeded) {
      nextConfig.teamNames.push(`Time ${nextConfig.teamNames.length + 1}`);
    }

    envelope.config = nextConfig;

    await prisma.pelada.update({
      where: { id: peladaId },
      data: {
        playersPerTeam: nextConfig.playersPerTeam,
        teamsJson: JSON.stringify(envelope),
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  async batchCheckin(
    peladaId: string,
    actorUserId: string,
    input: BatchCheckinInput
  ) {
    await this.ensureCanManage(peladaId, actorUserId);

    await prisma.peladaPlayer.updateMany({
      where: {
        peladaId,
        status: 'CONFIRMED',
        ...(input.playerIds && input.playerIds.length > 0
          ? { id: { in: input.playerIds } }
          : {}),
      },
      data: {
        attendanceStatus: input.attendanceStatus,
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  async updateCheckin(
    peladaId: string,
    actorUserId: string,
    playerRecordId: string,
    data: UpdateCheckinInput
  ) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const record = await prisma.peladaPlayer.findUnique({
      where: { id: playerRecordId },
      include: {
        user: { select: { name: true, position: true } },
      },
    });

    if (!record || record.peladaId !== peladaId) {
      throw this.createHttpError('Participante nao encontrado nesta pelada', 404);
    }

    if (data.memberType === 'MENSALISTA' && !record.userId) {
      throw this.createHttpError('Convidados avulsos nao podem ser definidos como mensalistas', 400);
    }

    await prisma.peladaPlayer.update({
      where: { id: playerRecordId },
      data: {
        ...(data.attendanceStatus !== undefined && { attendanceStatus: data.attendanceStatus }),
        ...(data.memberType !== undefined && { memberType: data.memberType }),
      },
    });

    // If pelada is IN_PROGRESS and teams are already drawn, dynamically handle latecomers / injuries
    if (pelada.status === 'IN_PROGRESS' && data.attendanceStatus !== undefined) {
      const envelope = this.parseTeamsEnvelope(pelada);
      if (envelope.teams.length > 0) {
        const playerObj = this.toDrawnPlayer(record);
        let changedEnvelope = false;

        if (data.attendanceStatus === 'INJURED' || data.attendanceStatus === 'PENDING') {
          const prevQueueLen = envelope.waitingQueue.length;
          const prevPoolLen = envelope.lastLoserPool.length;
          envelope.waitingQueue = envelope.waitingQueue.filter((p) => p.id !== playerRecordId);
          envelope.lastLoserPool = envelope.lastLoserPool.filter((p) => p.id !== playerRecordId);
          if (
            envelope.waitingQueue.length !== prevQueueLen ||
            envelope.lastLoserPool.length !== prevPoolLen
          ) {
            changedEnvelope = true;
          }

          for (const team of envelope.teams) {
            const idx = team.players.findIndex((p) => p.id === playerRecordId);
            if (idx !== -1) {
              const removedPlayer = team.players[idx];
              team.players.splice(idx, 1);
              changedEnvelope = true;

              const queueSubIdx = envelope.waitingQueue.findIndex(
                (p) => p.isGoalkeeper === removedPlayer.isGoalkeeper
              );
              const fallbackQueueIdx =
                queueSubIdx !== -1
                  ? queueSubIdx
                  : envelope.waitingQueue.findIndex((p) => !p.isGoalkeeper);

              if (fallbackQueueIdx !== -1) {
                const [sub] = envelope.waitingQueue.splice(fallbackQueueIdx, 1);
                team.players.push(sub);
                envelope.lastRotationSummary = `${removedPlayer.name} saiu (${
                  data.attendanceStatus === 'INJURED' ? 'machucado' : 'ausente'
                }). ${sub.name} entrou da fila no ${team.name}.`;
              } else if (envelope.lastLoserPool.length > 0) {
                const poolIdx = envelope.lastLoserPool.findIndex(
                  (p) => p.isGoalkeeper === removedPlayer.isGoalkeeper
                );
                const pickIdx = poolIdx !== -1 ? poolIdx : 0;
                const [sub] = envelope.lastLoserPool.splice(pickIdx, 1);
                team.players.push(sub);
                envelope.lastRotationSummary = `${removedPlayer.name} saiu (${
                  data.attendanceStatus === 'INJURED' ? 'machucado' : 'ausente'
                }). ${sub.name} entrou no ${team.name}.`;
              } else {
                envelope.lastRotationSummary = `${removedPlayer.name} saiu de ${team.name}.`;
              }
            }
          }
        } else if (data.attendanceStatus === 'PRESENT') {
          const alreadyInTeams = envelope.teams.some((t) =>
            t.players.some((p) => p.id === playerRecordId)
          );
          const alreadyInQueue = envelope.waitingQueue.some((p) => p.id === playerRecordId);
          const alreadyInPool = envelope.lastLoserPool.some((p) => p.id === playerRecordId);

          if (!alreadyInTeams && !alreadyInQueue && !alreadyInPool) {
            envelope.waitingQueue.push(playerObj);
            envelope.lastRotationSummary = `${playerObj.name} chegou e entrou no final da fila de próximos.`;
            changedEnvelope = true;
          }
        }

        if (changedEnvelope) {
          await prisma.pelada.update({
            where: { id: peladaId },
            data: { teamsJson: JSON.stringify(envelope) },
          });
        }
      }
    }

    return this.getById(peladaId, actorUserId);
  }

  async recordMatch(
    peladaId: string,
    actorUserId: string,
    data: RecordMatchInput
  ) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);

    const envelope = this.parseTeamsEnvelope(pelada);
    const teams = envelope.teams;
    const matches = this.safeJsonParse<MatchRecord[]>(pelada.matchesJson, []);

    const winner =
      data.scoreA > data.scoreB
        ? data.teamAName
        : data.scoreB > data.scoreA
        ? data.teamBName
        : 'EMPATE';

    if (winner !== 'EMPATE') {
      const winningTeam = teams.find((t) => t.name === winner);
      if (winningTeam && winningTeam.players.length > 0) {
        const winningIds = winningTeam.players.map((p) => p.id);
        await prisma.peladaPlayer.updateMany({
          where: { id: { in: winningIds }, peladaId },
          data: { wins: { increment: 1 } },
        });
      }
    }

    const newMatch: MatchRecord = {
      id: String(Date.now()),
      teamAName: data.teamAName,
      teamBName: data.teamBName,
      scoreA: data.scoreA,
      scoreB: data.scoreB,
      winner,
      finishedAt: new Date().toISOString(),
    };

    matches.push(newMatch);

    // Winner stays + waiting queue + random draw from previous loser pool
    if (
      envelope.config.gameMode === 'WINNER_STAYS_QUEUE' &&
      teams.length >= 2 &&
      (envelope.waitingQueue.length > 0 || envelope.lastLoserPool.length > 0)
    ) {
      let leavingIdx = -1;
      if (winner !== 'EMPATE') {
        leavingIdx = teams.findIndex(
          (t) =>
            (t.name === data.teamAName || t.name === data.teamBName) &&
            t.name !== winner
        );
      } else if (data.leavingTeamName) {
        leavingIdx = teams.findIndex((t) => t.name === data.leavingTeamName);
      }
      if (leavingIdx === -1) {
        leavingIdx = 1;
      }

      const stayingIdx = leavingIdx === 0 ? 1 : 0;
      const stayingTeam = teams[stayingIdx];
      const losingTeam = teams[leavingIdx];
      const perTeam = envelope.config.playersPerTeam || pelada.playersPerTeam || 5;

      const waitingLine = envelope.waitingQueue.filter((p) => !p.isGoalkeeper);
      const waitingGks = envelope.waitingQueue.filter((p) => p.isGoalkeeper);
      const lastLoserLine = envelope.lastLoserPool.filter((p) => !p.isGoalkeeper);
      const lastLoserGks = envelope.lastLoserPool.filter((p) => p.isGoalkeeper);
      const losingTeamLine = losingTeam.players.filter((p) => !p.isGoalkeeper);
      const losingTeamGks = losingTeam.players.filter((p) => p.isGoalkeeper);

      const takenFromQueue = waitingLine.slice(0, perTeam);
      const remainingQueue = waitingLine.slice(perTeam);
      const nextLine: DrawnTeamPlayer[] = [...takenFromQueue];
      let drawnFromLoser: DrawnTeamPlayer[] = [];
      let newWaitingLine: DrawnTeamPlayer[] = [];
      let newLastLoserLine: DrawnTeamPlayer[] = [];

      if (takenFromQueue.length < perTeam) {
        const needed = perTeam - takenFromQueue.length;
        if (lastLoserLine.length > 0) {
          const shuffledLastLoser = shuffleArray(lastLoserLine);
          drawnFromLoser = shuffledLastLoser.slice(0, needed);
          const notDrawnFromLastLoser = shuffledLastLoser.slice(needed);
          nextLine.push(...drawnFromLoser);
          // Players not drawn from last loser wait guaranteed at the front of the next queue
          newWaitingLine = [...remainingQueue, ...notDrawnFromLastLoser];
          newLastLoserLine = losingTeamLine;
        } else {
          const shuffledCurrentLoser = shuffleArray(losingTeamLine);
          drawnFromLoser = shuffledCurrentLoser.slice(0, needed);
          const notDrawnFromCurrentLoser = shuffledCurrentLoser.slice(needed);
          nextLine.push(...drawnFromLoser);
          newWaitingLine = notDrawnFromCurrentLoser;
          newLastLoserLine = [];
        }
      } else {
        newWaitingLine = [...remainingQueue, ...lastLoserLine];
        newLastLoserLine = losingTeamLine;
      }

      const allOutGks = [...waitingGks, ...lastLoserGks];
      let nextGks: DrawnTeamPlayer[] = [];
      let newOutGks: DrawnTeamPlayer[] = [];
      if (allOutGks.length > 0) {
        nextGks = [allOutGks[0]];
        newOutGks = [...allOutGks.slice(1), ...losingTeamGks];
      } else {
        // Only 2 goalkeepers active -> GK stays on goal
        nextGks = losingTeamGks.slice(0, 1);
      }

      const newChallengingTeam: DrawnTeam = {
        name: losingTeam.name,
        players: [...nextGks, ...nextLine],
      };

      const nextTeams =
        stayingIdx === 0
          ? [stayingTeam, newChallengingTeam]
          : [newChallengingTeam, stayingTeam];

      envelope.teams = nextTeams;
      envelope.waitingQueue = [...newWaitingLine, ...newOutGks];
      envelope.lastLoserPool = newLastLoserLine;

      const parts: string[] = [];
      if (takenFromQueue.length > 0) {
        parts.push(
          `Da fila (${takenFromQueue.length}): ${takenFromQueue.map((p) => p.name).join(', ')}`
        );
      }
      if (drawnFromLoser.length > 0) {
        parts.push(
          `Sorteados do perdedor (${drawnFromLoser.length}): ${drawnFromLoser
            .map((p) => p.name)
            .join(', ')}`
        );
      }
      envelope.lastRotationSummary = `${stayingTeam.name} permanece. Entraram em ${newChallengingTeam.name} — ${parts.join(
        ' • '
      )}.`;
    }

    await prisma.pelada.update({
      where: { id: peladaId },
      data: {
        matchesJson: JSON.stringify(matches),
        teamsJson: JSON.stringify(envelope),
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  private async voteForAward(
    peladaId: string,
    voterUserId: string,
    targetPlayerId: string,
    field: 'votedMvpForId' | 'votedGoalkeeperForId',
    awardLabel: string
  ) {
    const pelada = await this.ensurePeladaExists(peladaId);
    const envelope = this.parseTeamsEnvelope(pelada);

    if (envelope.votingStatus === 'CLOSED') {
      throw this.createHttpError('A votação desta pelada já foi encerrada.', 400);
    }

    let voter = await prisma.peladaPlayer.findUnique({
      where: { peladaId_userId: { peladaId, userId: voterUserId } },
    });

    const isOwner = pelada.organizerId === voterUserId;

    if (!voter && isOwner) {
      voter = await prisma.peladaPlayer.create({
        data: {
          peladaId,
          userId: voterUserId,
          role: 'ORGANIZER',
          status: 'CONFIRMED',
          attendanceStatus: 'PRESENT',
          paymentStatus: !pelada.price || pelada.price <= 0 ? 'EXEMPT' : 'PAID',
        },
      });
    }

    if (!voter || (voter.status === 'DECLINED' && !isOwner)) {
      throw this.createHttpError(`Apenas participantes desta pelada podem votar no ${awardLabel}`, 403);
    }

    if (voter.attendanceStatus === 'NO_SHOW' && !isOwner) {
      throw this.createHttpError(`Apenas participantes que compareceram podem votar no ${awardLabel}`, 403);
    }

    const target = await prisma.peladaPlayer.findUnique({
      where: { id: targetPlayerId },
    });

    if (!target || target.peladaId !== peladaId || target.status !== 'CONFIRMED') {
      throw this.createHttpError('Jogador alvo nao encontrado entre os confirmados', 404);
    }

    await prisma.peladaPlayer.update({
      where: { id: voter.id },
      data: {
        [field]: targetPlayerId,
        ...(isOwner && voter.status !== 'CONFIRMED' && { status: 'CONFIRMED' }),
      },
    });

    // Auto-close voting when all eligible confirmed players have cast their MVP vote
    if (field === 'votedMvpForId') {
      const eligiblePlayers = await prisma.peladaPlayer.findMany({
        where: {
          peladaId,
          status: 'CONFIRMED',
          NOT: { attendanceStatus: 'NO_SHOW' },
        },
        select: { id: true, votedMvpForId: true },
      });

      if (
        eligiblePlayers.length > 0 &&
        eligiblePlayers.every((p) => Boolean(p.votedMvpForId))
      ) {
        envelope.votingStatus = 'CLOSED';
        await prisma.pelada.update({
          where: { id: peladaId },
          data: { teamsJson: JSON.stringify(envelope) },
        });
      }
    }

    return this.getById(peladaId, voterUserId);
  }

  async voteMvp(peladaId: string, voterUserId: string, targetPlayerId: string) {
    return this.voteForAward(peladaId, voterUserId, targetPlayerId, 'votedMvpForId', 'MVP da Pelada');
  }

  async voteGoalkeeper(peladaId: string, voterUserId: string, targetPlayerId: string) {
    return this.voteForAward(peladaId, voterUserId, targetPlayerId, 'votedGoalkeeperForId', 'Goleiro Paredao');
  }

  async updateVotingStatus(
    peladaId: string,
    actorUserId: string,
    votingStatus: PeladaVotingStatus
  ) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const envelope = this.parseTeamsEnvelope(pelada);
    envelope.votingStatus = votingStatus;

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { teamsJson: JSON.stringify(envelope) },
    });

    return this.getById(peladaId, actorUserId);
  }

  async drawTeams(peladaId: string, actorUserId: string, input: DrawTeamsInput) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const envelope = this.parseTeamsEnvelope(pelada);

    const nextConfig: PeladaGameConfig = {
      ...envelope.config,
      ...(input.playersPerTeam !== undefined && { playersPerTeam: input.playersPerTeam }),
      ...(input.gameMode !== undefined && { gameMode: input.gameMode }),
      ...(input.drawMode !== undefined && { drawMode: input.drawMode }),
      ...(input.balancedByPosition !== undefined && {
        drawMode: input.balancedByPosition ? 'POSITION' : 'RANDOM',
      }),
      ...(input.fixedTeamsCount !== undefined && { fixedTeamsCount: input.fixedTeamsCount }),
      ...(input.teamNames && input.teamNames.length >= 2 && {
        teamNames: input.teamNames.map((n, i) => n.trim() || `Time ${i + 1}`),
      }),
    };

    const presentPlayers = await prisma.peladaPlayer.findMany({
      where: {
        peladaId,
        status: 'CONFIRMED',
        attendanceStatus: 'PRESENT',
      },
      include: {
        user: {
          select: { name: true, position: true },
        },
      },
    });

    if (presentPlayers.length < 2) {
      throw this.createHttpError(
        'Marque pelo menos 2 jogadores como Presente na chamada antes de sortear os times.',
        400
      );
    }

    const formattedPlayers = presentPlayers.map((p) => this.toDrawnPlayer(p));
    const goalkeepers = shuffleArray(formattedPlayers.filter((p) => p.isGoalkeeper));
    const fieldPlayers = formattedPlayers.filter((p) => !p.isGoalkeeper);

    let orderedField: DrawnTeamPlayer[] = [];
    if (nextConfig.drawMode === 'POSITION') {
      const buckets: DrawnTeamPlayer[][] = [[], [], [], []];
      for (const player of fieldPlayers) {
        buckets[getPositionBucket(player.position)].push(player);
      }
      orderedField = buckets.flatMap((bucket) => shuffleArray(bucket));
    } else {
      orderedField = shuffleArray(fieldPlayers);
    }

    const perTeam = nextConfig.playersPerTeam || pelada.playersPerTeam || 5;
    const isQueueMode = nextConfig.gameMode === 'WINNER_STAYS_QUEUE';
    const numTeams = isQueueMode ? 2 : Math.max(2, nextConfig.fixedTeamsCount || 3);

    while (nextConfig.teamNames.length < numTeams) {
      nextConfig.teamNames.push(`Time ${nextConfig.teamNames.length + 1}`);
    }

    const teams: DrawnTeam[] = Array.from({ length: numTeams }, (_, i) => ({
      name: nextConfig.teamNames[i] || `Time ${i + 1}`,
      players: [],
    }));

    // Goalkeepers: max 1 per active team, excess goes to waitingQueue
    const activeGks = goalkeepers.slice(0, numTeams);
    const excessGks = goalkeepers.slice(numTeams);
    activeGks.forEach((gk, idx) => {
      teams[idx].players.push(gk);
    });

    // Field players: max perTeam per team, excess goes to waitingQueue
    const maxFieldSlots = numTeams * perTeam;
    const activeField = orderedField.slice(0, maxFieldSlots);
    const excessField = orderedField.slice(maxFieldSlots);

    if (nextConfig.drawMode === 'POSITION') {
      activeField.forEach((player, idx) => {
        const cycle = Math.floor(idx / numTeams);
        const posInCycle = idx % numTeams;
        const teamIdx = cycle % 2 === 0 ? posInCycle : numTeams - 1 - posInCycle;
        teams[teamIdx].players.push(player);
      });
    } else {
      activeField.forEach((player, idx) => {
        teams[idx % numTeams].players.push(player);
      });
    }

    envelope.config = nextConfig;
    envelope.teams = teams;
    envelope.waitingQueue = [...excessField, ...excessGks];
    envelope.lastLoserPool = [];
    envelope.lastRotationSummary = null;

    await prisma.pelada.update({
      where: { id: peladaId },
      data: {
        playersPerTeam: perTeam,
        teamsJson: JSON.stringify(envelope),
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  async setManualTeams(peladaId: string, actorUserId: string, input: SetManualTeamsInput) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const envelope = this.parseTeamsEnvelope(pelada);

    const confirmed = await prisma.peladaPlayer.findMany({
      where: { peladaId, status: 'CONFIRMED' },
      include: {
        user: {
          select: { name: true, position: true },
        },
      },
    });

    const playerMap = new Map<string, { player: DrawnTeamPlayer; isPresent: boolean }>();
    for (const p of confirmed) {
      playerMap.set(p.id, {
        player: this.toDrawnPlayer(p),
        isPresent: p.attendanceStatus === 'PRESENT',
      });
    }

    const assignedIds = new Set<string>();
    const teams: DrawnTeam[] = input.teams.map((team) => {
      const players: DrawnTeamPlayer[] = [];
      for (const playerId of team.playerIds) {
        if (assignedIds.has(playerId)) continue;
        const found = playerMap.get(playerId);
        if (found) {
          assignedIds.add(playerId);
          players.push(found.player);
        }
      }
      return {
        name: team.name.trim(),
        players,
      };
    });

    if (!teams.some((t) => t.players.length > 0)) {
      throw this.createHttpError('Selecione pelo menos um jogador confirmado para montar os times', 400);
    }

    const unassignedPresent = Array.from(playerMap.values())
      .filter((entry) => entry.isPresent && !assignedIds.has(entry.player.id))
      .map((entry) => entry.player);

    envelope.teams = teams;
    envelope.waitingQueue = unassignedPresent;
    envelope.lastLoserPool = [];
    envelope.lastRotationSummary = null;

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { teamsJson: JSON.stringify(envelope) },
    });

    return this.getById(peladaId, actorUserId);
  }

  async updateStatus(peladaId: string, actorUserId: string, input: UpdatePeladaStatusInput) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const envelope = this.parseTeamsEnvelope(pelada);

    if (input.status === 'IN_PROGRESS') {
      // On initial start (before any teams are drawn), pre-check confirmed players as PRESENT so manager can adjust latecomers easily
      const hasAnyCheckin = pelada.players.some(
        (p) => p.status === 'CONFIRMED' && p.attendanceStatus !== 'PENDING'
      );
      if (!hasAnyCheckin) {
        await prisma.peladaPlayer.updateMany({
          where: {
            peladaId,
            status: 'CONFIRMED',
            attendanceStatus: 'PENDING',
          },
          data: { attendanceStatus: 'PRESENT' },
        });
      }
    }

    if (input.status === 'FINISHED') {
      // Reset any stray votes and open Step 1 MVP voting cleanly
      await prisma.peladaPlayer.updateMany({
        where: { peladaId },
        data: {
          votedMvpForId: null,
          votedGoalkeeperForId: null,
        },
      });
      envelope.votingStatus = 'OPEN';
    }

    await prisma.pelada.update({
      where: { id: peladaId },
      data: {
        status: input.status,
        teamsJson: JSON.stringify(envelope),
      },
    });

    return this.getById(peladaId, actorUserId);
  }

  async startNextCycle(peladaId: string, actorUserId: string) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);
    const previousEnvelope = this.parseTeamsEnvelope(pelada);
    const nextCycleEnvelope: StoredTeamsEnvelope = {
      version: 2,
      teams: [],
      waitingQueue: [],
      lastLoserPool: [],
      lastRotationSummary: null,
      config: previousEnvelope.config,
      votingStatus: 'OPEN',
    };

    const nextDate = new Date(pelada.dateTime);
    nextDate.setDate(nextDate.getDate() + 7);
    while (nextDate.getTime() < Date.now() - 3600000) {
      nextDate.setDate(nextDate.getDate() + 7);
    }

    const originalInviteCode = pelada.inviteCode;
    const archivedCode = await this.generateUniqueInviteCode();
    const isFree = !pelada.price || pelada.price <= 0;

    const statusPriority = (p: any) => {
      if (p.role === 'ORGANIZER' || p.role === 'CO_ORGANIZER' || p.memberType === 'MENSALISTA') {
        return 0;
      }
      if (p.status === 'CONFIRMED') return 1;
      if (p.status === 'WAITLIST') return 2;
      return 3;
    };

    const registeredMembers = pelada.players
      .filter((p) => Boolean(p.userId))
      .sort((a, b) => {
        const diff = statusPriority(a) - statusPriority(b);
        if (diff !== 0) return diff;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });

    let fieldConfirmedCount = 0;
    const newPlayersData = registeredMembers.map((p) => {
      const isGk = Boolean(p.isGoalkeeper);
      let nextStatus: 'CONFIRMED' | 'WAITLIST' = 'CONFIRMED';
      if (!isGk && pelada.maxPlayers && fieldConfirmedCount >= pelada.maxPlayers) {
        nextStatus = 'WAITLIST';
      } else if (!isGk) {
        fieldConfirmedCount += 1;
      }

      const paymentStatus =
        isFree || (isGk && pelada.goalkeepersExempt)
          ? 'EXEMPT'
          : p.role === 'ORGANIZER' || p.memberType === 'MENSALISTA'
          ? 'PAID'
          : 'PENDING';

      return {
        userId: p.userId as string,
        role: p.userId === pelada.organizerId ? 'ORGANIZER' : p.role,
        status: nextStatus,
        isGoalkeeper: isGk,
        position: p.position,
        paymentStatus,
        attendanceStatus: 'PENDING',
        memberType: p.memberType || 'DIARISTA',
        goals: 0,
        assists: 0,
        wins: 0,
        votedMvpForId: null,
        votedGoalkeeperForId: null,
      };
    });

    if (!newPlayersData.some((p) => p.userId === pelada.organizerId)) {
      newPlayersData.unshift({
        userId: pelada.organizerId,
        role: 'ORGANIZER',
        status: 'CONFIRMED',
        isGoalkeeper: false,
        position: null,
        paymentStatus: isFree ? 'EXEMPT' : 'PAID',
        attendanceStatus: 'PENDING',
        memberType: 'MENSALISTA',
        goals: 0,
        assists: 0,
        wins: 0,
        votedMvpForId: null,
        votedGoalkeeperForId: null,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      await tx.pelada.update({
        where: { id: peladaId },
        data: {
          status: 'FINISHED',
          inviteCode: archivedCode,
        },
      });

      return tx.pelada.create({
        data: {
          title: pelada.title,
          sport: pelada.sport,
          dateTime: nextDate,
          location: pelada.location,
          locationAddress: pelada.locationAddress,
          price: pelada.price,
          isRecurring: pelada.isRecurring,
          recurrenceDay: pelada.recurrenceDay,
          maxPlayers: pelada.maxPlayers,
          inviteCode: originalInviteCode,
          isPublic: pelada.isPublic,
          pixKey: pelada.pixKey,
          goalkeepersExempt: pelada.goalkeepersExempt,
          playersPerTeam: nextCycleEnvelope.config.playersPerTeam,
          cancelDeadlineHours: pelada.cancelDeadlineHours,
          durationHours: pelada.durationHours ?? 2,
          whatsappGroupUrl: pelada.whatsappGroupUrl,
          teamsJson: JSON.stringify(nextCycleEnvelope),
          organizerId: pelada.organizerId,
          status: 'OPEN',
          players: {
            create: newPlayersData,
          },
        },
      });
    });

    return this.getById(created.id, actorUserId);
  }

  private async createRecurringInstances(
    basePelada: any,
    organizerPosition: string | null,
    count: number
  ) {
    const baseDate = new Date(basePelada.dateTime);
    const isFree = !basePelada.price || basePelada.price <= 0;

    for (let i = 1; i <= count; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 7 * i);
      const inviteCode = await this.generateUniqueInviteCode();

      await prisma.pelada.create({
        data: {
          title: basePelada.title,
          sport: basePelada.sport,
          dateTime: nextDate,
          location: basePelada.location,
          locationAddress: basePelada.locationAddress,
          price: basePelada.price,
          isRecurring: true,
          recurrenceDay: basePelada.recurrenceDay,
          maxPlayers: basePelada.maxPlayers,
          inviteCode,
          isPublic: basePelada.isPublic,
          pixKey: basePelada.pixKey,
          goalkeepersExempt: basePelada.goalkeepersExempt,
          playersPerTeam: basePelada.playersPerTeam,
          cancelDeadlineHours: basePelada.cancelDeadlineHours,
          durationHours: basePelada.durationHours ?? 2,
          whatsappGroupUrl: basePelada.whatsappGroupUrl || null,
          organizerId: basePelada.organizerId,
          players: {
            create: {
              userId: basePelada.organizerId,
              role: 'ORGANIZER',
              status: 'CONFIRMED',
              isGoalkeeper: false,
              position: organizerPosition,
              paymentStatus: isFree ? 'EXEMPT' : 'PAID',
            },
          },
        },
      });
    }
  }
}

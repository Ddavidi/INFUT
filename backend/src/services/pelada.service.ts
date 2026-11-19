// src/services/pelada.service.ts
import prisma from '../utils/prisma';
import {
  AddGuestInput,
  CreatePeladaInput,
  DrawTeamsInput,
  RecordMatchInput,
  RsvpInput,
  SetManualTeamsInput,
  UpdateCheckinInput,
  UpdatePeladaInput,
  UpdatePeladaStatusInput,
  UpdateStatsInput,
} from '../schemas/pelada.schema';

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

    const mvpRanking = this.buildVoteRanking(players, 'votedMvpForId');
    const goalkeeperRanking = this.buildVoteRanking(players, 'votedGoalkeeperForId');
    const teams = this.safeJsonParse<DrawnTeam[]>(pelada.teamsJson, []);
    const matches = this.safeJsonParse<MatchRecord[]>(pelada.matchesJson, []);

    const { teamsJson, matchesJson, ...rest } = pelada;
    return {
      ...rest,
      players,
      teams,
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
    if (!isGoalkeeper && pelada.maxPlayers && confirmedFieldOthers >= pelada.maxPlayers) {
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

  async updateCheckin(
    peladaId: string,
    actorUserId: string,
    playerRecordId: string,
    data: UpdateCheckinInput
  ) {
    await this.ensureCanManage(peladaId, actorUserId);
    const record = await prisma.peladaPlayer.findUnique({
      where: { id: playerRecordId },
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

    return this.getById(peladaId, actorUserId);
  }

  async recordMatch(
    peladaId: string,
    actorUserId: string,
    data: RecordMatchInput
  ) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);

    const teams = this.safeJsonParse<DrawnTeam[]>(pelada.teamsJson, []);
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

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { matchesJson: JSON.stringify(matches) },
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
    await this.ensurePeladaExists(peladaId);

    const voter = await prisma.peladaPlayer.findUnique({
      where: { peladaId_userId: { peladaId, userId: voterUserId } },
    });

    if (!voter || voter.status !== 'CONFIRMED') {
      throw this.createHttpError(`Apenas jogadores confirmados podem votar no ${awardLabel}`, 403);
    }

    const target = await prisma.peladaPlayer.findUnique({
      where: { id: targetPlayerId },
    });

    if (!target || target.peladaId !== peladaId || target.status !== 'CONFIRMED') {
      throw this.createHttpError('Jogador alvo nao encontrado entre os confirmados', 404);
    }

    await prisma.peladaPlayer.update({
      where: { id: voter.id },
      data: { [field]: targetPlayerId },
    });

    return this.getById(peladaId, voterUserId);
  }

  async voteMvp(peladaId: string, voterUserId: string, targetPlayerId: string) {
    return this.voteForAward(peladaId, voterUserId, targetPlayerId, 'votedMvpForId', 'MVP da Pelada');
  }

  async voteGoalkeeper(peladaId: string, voterUserId: string, targetPlayerId: string) {
    return this.voteForAward(peladaId, voterUserId, targetPlayerId, 'votedGoalkeeperForId', 'Goleiro Paredao');
  }

  async drawTeams(peladaId: string, actorUserId: string, input: DrawTeamsInput) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);

    const confirmed = await prisma.peladaPlayer.findMany({
      where: { peladaId, status: 'CONFIRMED' },
      include: {
        user: {
          select: { name: true, position: true },
        },
      },
    });

    if (confirmed.length < 2) {
      throw this.createHttpError('Sao necessarios pelo menos 2 jogadores confirmados para sortear times', 400);
    }

    const formattedPlayers: DrawnTeamPlayer[] = confirmed.map((p) => {
      const pos = p.position || p.user?.position || null;
      const isGk =
        p.isGoalkeeper ||
        (pos ? normalizeText(pos).includes('goleir') : false);
      return {
        id: p.id,
        name: p.user?.name || p.guestName || 'Convidado',
        position: pos,
        isGoalkeeper: isGk,
      };
    });

    const goalkeepers = shuffleArray(formattedPlayers.filter((p) => p.isGoalkeeper));
    const fieldPlayers = formattedPlayers.filter((p) => !p.isGoalkeeper);

    const perTeam = input.playersPerTeam || pelada.playersPerTeam || 5;
    const baseCount = fieldPlayers.length > 0 ? fieldPlayers.length : formattedPlayers.length;
    const customNames = input.teamNames?.map((n) => n.trim()).filter(Boolean);
    const hasCustomNames = Boolean(customNames && customNames.length >= 2);
    const numTeams = hasCustomNames
      ? customNames!.length
      : Math.max(2, Math.ceil(baseCount / perTeam));

    const teams: DrawnTeam[] = Array.from({ length: numTeams }, (_, i) => ({
      name: hasCustomNames ? customNames![i] || `Time ${i + 1}` : `Time ${i + 1}`,
      players: [],
    }));

    // Distribute goalkeepers first (max 1 per team)
    const maxGoalkeepers = numTeams;
    goalkeepers.slice(0, maxGoalkeepers).forEach((gk, idx) => {
      teams[idx].players.push(gk);
    });

    // Distribute field players (max `perTeam` line players per team -> max `perTeam + 1` total with GK)
    const maxFieldSlots = numTeams * perTeam;
    if (input.balancedByPosition ?? true) {
      const buckets: DrawnTeamPlayer[][] = [[], [], [], []];
      for (const player of fieldPlayers) {
        buckets[getPositionBucket(player.position)].push(player);
      }
      const ordered = buckets.flatMap((bucket) => shuffleArray(bucket)).slice(0, maxFieldSlots);

      // Snake draft distribution across teams respecting perTeam limit
      ordered.forEach((player, idx) => {
        const cycle = Math.floor(idx / numTeams);
        const posInCycle = idx % numTeams;
        const teamIdx = cycle % 2 === 0 ? posInCycle : numTeams - 1 - posInCycle;
        teams[teamIdx].players.push(player);
      });
    } else {
      const randomPlayers = shuffleArray(fieldPlayers).slice(0, maxFieldSlots);
      randomPlayers.forEach((player, idx) => {
        teams[idx % numTeams].players.push(player);
      });
    }

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { teamsJson: JSON.stringify(teams) },
    });

    return this.getById(peladaId, actorUserId);
  }

  async setManualTeams(peladaId: string, actorUserId: string, input: SetManualTeamsInput) {
    await this.ensureCanManage(peladaId, actorUserId);

    const confirmed = await prisma.peladaPlayer.findMany({
      where: { peladaId, status: 'CONFIRMED' },
      include: {
        user: {
          select: { name: true, position: true },
        },
      },
    });

    const playerMap = new Map<string, DrawnTeamPlayer>();
    for (const p of confirmed) {
      const pos = p.position || p.user?.position || null;
      const isGk =
        p.isGoalkeeper ||
        (pos ? normalizeText(pos).includes('goleir') : false);
      playerMap.set(p.id, {
        id: p.id,
        name: p.user?.name || p.guestName || 'Convidado',
        position: pos,
        isGoalkeeper: isGk,
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
          players.push(found);
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

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { teamsJson: JSON.stringify(teams) },
    });

    return this.getById(peladaId, actorUserId);
  }

  async updateStatus(peladaId: string, actorUserId: string, input: UpdatePeladaStatusInput) {
    await this.ensureCanManage(peladaId, actorUserId);

    await prisma.pelada.update({
      where: { id: peladaId },
      data: { status: input.status },
    });

    if (input.status === 'FINISHED') {
      await prisma.peladaPlayer.updateMany({
        where: {
          peladaId,
          status: 'CONFIRMED',
          attendanceStatus: 'PENDING',
        },
        data: { attendanceStatus: 'PRESENT' },
      });
    }

    return this.getById(peladaId, actorUserId);
  }

  async startNextCycle(peladaId: string, actorUserId: string) {
    const pelada = await this.ensureCanManage(peladaId, actorUserId);

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
          playersPerTeam: pelada.playersPerTeam,
          cancelDeadlineHours: pelada.cancelDeadlineHours,
          durationHours: pelada.durationHours ?? 2,
          whatsappGroupUrl: pelada.whatsappGroupUrl,
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

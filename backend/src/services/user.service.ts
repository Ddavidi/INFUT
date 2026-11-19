// src/services/user.service.ts
import prisma from '../utils/prisma';
import { ChangePasswordInput, UpdateProfileInput } from '../schemas/user.schema';
import { comparePassword, hashPassword } from '../utils/password';

interface ParticipationSummary {
  id: string;
  status: string;
  goals: number;
  assists: number;
  wins: number;
  attendanceStatus: string;
}

function buildAthleteMetrics(
  participations: ParticipationSummary[],
  mvpVotes: number,
  goalkeeperVotes: number,
  organizedCount = 0
) {
  const totalGames = participations.filter((p) => p.status === 'CONFIRMED').length;
  const noShows = participations.filter((p) => p.attendanceStatus === 'NO_SHOW').length;
  const attendanceRate =
    totalGames + noShows > 0
      ? Math.round((totalGames / (totalGames + noShows)) * 100)
      : 100;

  return {
    totalGames,
    totalGoals: participations.reduce((sum, p) => sum + p.goals, 0),
    totalAssists: participations.reduce((sum, p) => sum + p.assists, 0),
    totalWins: participations.reduce((sum, p) => sum + p.wins, 0),
    organizedCount,
    mvpVotes,
    goalkeeperVotes,
    noShows,
    attendanceRate,
  };
}

export class UserService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        sport: true,
        position: true,
        photoUrl: true,
        region: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            organizedPeladas: true,
          },
        },
        participations: {
          select: {
            id: true,
            status: true,
            goals: true,
            assists: true,
            wins: true,
            attendanceStatus: true,
          },
        },
      },
    });

    if (!user) {
      const error: any = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    const participationIds = user.participations.map((p) => p.id);
    const [mvpVotes, goalkeeperVotes] =
      participationIds.length > 0
        ? await Promise.all([
            prisma.peladaPlayer.count({
              where: { votedMvpForId: { in: participationIds } },
            }),
            prisma.peladaPlayer.count({
              where: { votedGoalkeeperForId: { in: participationIds } },
            }),
          ])
        : [0, 0];

    const stats = buildAthleteMetrics(
      user.participations,
      mvpVotes,
      goalkeeperVotes,
      user._count.organizedPeladas
    );

    const { _count, participations, ...userData } = user;
    return {
      ...userData,
      stats,
    };
  }

  async getRanking() {
    const [users, allVotes] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          sport: true,
          position: true,
          region: true,
          participations: {
            select: {
              id: true,
              status: true,
              goals: true,
              assists: true,
              wins: true,
              attendanceStatus: true,
            },
          },
        },
      }),
      prisma.peladaPlayer.findMany({
        where: {
          OR: [
            { votedMvpForId: { not: null } },
            { votedGoalkeeperForId: { not: null } },
          ],
        },
        select: {
          votedMvpForId: true,
          votedGoalkeeperForId: true,
        },
      }),
    ]);

    const mvpCountByPlayerId: Record<string, number> = {};
    const gkCountByPlayerId: Record<string, number> = {};

    for (const v of allVotes) {
      if (v.votedMvpForId) {
        mvpCountByPlayerId[v.votedMvpForId] =
          (mvpCountByPlayerId[v.votedMvpForId] || 0) + 1;
      }
      if (v.votedGoalkeeperForId) {
        gkCountByPlayerId[v.votedGoalkeeperForId] =
          (gkCountByPlayerId[v.votedGoalkeeperForId] || 0) + 1;
      }
    }

    return users
      .map((u) => {
        const mvpVotes = u.participations.reduce(
          (sum, p) => sum + (mvpCountByPlayerId[p.id] || 0),
          0
        );
        const goalkeeperVotes = u.participations.reduce(
          (sum, p) => sum + (gkCountByPlayerId[p.id] || 0),
          0
        );
        const metrics = buildAthleteMetrics(u.participations, mvpVotes, goalkeeperVotes);
        return {
          id: u.id,
          name: u.name,
          sport: u.sport,
          position: u.position,
          region: u.region,
          totalGames: metrics.totalGames,
          totalGoals: metrics.totalGoals,
          totalAssists: metrics.totalAssists,
          totalWins: metrics.totalWins,
          mvpVotes: metrics.mvpVotes,
          goalkeeperVotes: metrics.goalkeeperVotes,
          attendanceRate: metrics.attendanceRate,
        };
      })
      .sort(
        (a, b) =>
          b.totalGoals - a.totalGoals ||
          b.totalWins - a.totalWins ||
          b.mvpVotes - a.mvpVotes
      );
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    await prisma.user.update({
      where: { id: userId },
      data,
    });

    return this.getProfile(userId);
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      const error: any = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    const isValid = await comparePassword(data.currentPassword, user.passwordHash);
    if (!isValid) {
      const error: any = new Error('Senha atual incorreta');
      error.statusCode = 400;
      throw error;
    }

    const newHash = await hashPassword(data.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Senha atualizada com sucesso' };
  }

  async deleteAccount(userId: string) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existing) {
      const error: any = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    await prisma.user.delete({ where: { id: userId } });
    return { message: 'Conta e dados excluidos com sucesso' };
  }
}

// src/services/pelada.service.ts
import { PrismaClient } from '@prisma/client';
import { CreatePeladaInput } from '../schemas/pelada.schema';

const prisma = new PrismaClient();

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export class PeladaService {
  async create(organizerId: string, data: CreatePeladaInput) {
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
        organizerId,
        inviteCode: generateInviteCode(),
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    // Se for recorrente, criar as proximas 4 ocorrencias automaticamente
    if (pelada.isRecurring && pelada.recurrenceDay) {
      await this.createRecurringInstances(pelada, 4);
    }

    return pelada;
  }

  async list(userId: string) {
    const peladas = await prisma.pelada.findMany({
      where: {
        OR: [
          { organizerId: userId },
          { participants: { some: { userId: userId, status: 'CONFIRMED' } } },
        ],
      },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { dateTime: 'asc' },
    });

    return peladas;
  }

  async getById(peladaId: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
      include: {
        organizer: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
              },
            },
          },
        },
      },
    });

    if (!pelada) {
      const error: any = new Error('Peladinha nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    return pelada;
  }

  async delete(peladaId: string, userId: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { id: peladaId },
    });

    if (!pelada) {
      const error: any = new Error('Peladinha nao encontrada');
      error.statusCode = 404;
      throw error;
    }

    if (pelada.organizerId !== userId) {
      const error: any = new Error('Somente o organizador pode cancelar esta peladinha');
      error.statusCode = 403;
      throw error;
    }

    await prisma.pelada.delete({ where: { id: peladaId } });
    return { message: 'Peladinha cancelada com sucesso' };
  }

  async join(userId: string, inviteCode: string) {
    const pelada = await prisma.pelada.findUnique({
      where: { inviteCode },
    });

    if (!pelada) {
      const error: any = new Error('Código de convite inválido ou inexistente');
      error.statusCode = 404;
      throw error;
    }

    if (pelada.organizerId === userId) {
      const error: any = new Error('Você já é o organizador desta pelada');
      error.statusCode = 400;
      throw error;
    }

    if (pelada.maxPlayers) {
      const currentParticipants = await prisma.participant.count({
        where: { peladaId: pelada.id, status: 'CONFIRMED' }
      });
      if (currentParticipants >= pelada.maxPlayers) {
        const error: any = new Error('A pelada já atingiu o número máximo de jogadores');
        error.statusCode = 400;
        throw error;
      }
    }

    try {
      await prisma.participant.create({
        data: {
          userId,
          peladaId: pelada.id,
          status: 'CONFIRMED'
        }
      });
      return { message: 'Você entrou na pelada com sucesso!', pelada };
    } catch (e: any) {
      if (e.code === 'P2002') { // Prisma Unique Constraint Violation
        const error: any = new Error('Você já está participando desta pelada');
        error.statusCode = 400;
        throw error;
      }
      throw e;
    }
  }

  async rsvp(userId: string, peladaId: string, status: string, reason?: string) {
    const pelada = await prisma.pelada.findUnique({ where: { id: peladaId } });
    if (!pelada) {
      const error: any = new Error('Pelada não encontrada');
      error.statusCode = 404;
      throw error;
    }

    const participant = await prisma.participant.findUnique({
      where: { userId_peladaId: { userId, peladaId } }
    });

    if (participant) {
      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          status,
          absenceReason: reason || null
        }
      });
    } else {
      await prisma.participant.create({
        data: {
          userId,
          peladaId,
          status,
          absenceReason: reason || null
        }
      });
    }

    return { message: 'RSVP atualizado com sucesso' };
  }

  // Cria instancias futuras para peladas recorrentes
  private async createRecurringInstances(
    basePelada: any,
    count: number
  ) {
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    };

    const baseDate = new Date(basePelada.dateTime);

    for (let i = 1; i <= count; i++) {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + 7 * i);

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
          organizerId: basePelada.organizerId,
          inviteCode: generateInviteCode(),
        },
      });
    }
  }
}

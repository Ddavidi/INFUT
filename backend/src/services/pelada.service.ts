// src/services/pelada.service.ts
import { PrismaClient } from '@prisma/client';
import { CreatePeladaInput } from '../schemas/pelada.schema';

const prisma = new PrismaClient();

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
          // Futuramente: peladas onde o usuario foi convidado
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
        },
      });
    }
  }
}

// src/services/user.service.ts
import { PrismaClient } from '@prisma/client';
import { UpdateProfileInput } from '../schemas/user.schema';

const prisma = new PrismaClient();

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
      },
    });

    if (!user) {
      const error: any = new Error('Usuario nao encontrado');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
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
      },
    });

    return user;
  }
}

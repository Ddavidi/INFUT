// src/services/auth.service.ts
import { PrismaClient } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';

const prisma = new PrismaClient();

export class AuthService {
  async register(data: RegisterInput) {
    // Verificar se email ja existe
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      const error: any = new Error('E-mail ja cadastrado');
      error.statusCode = 409;
      throw error;
    }

    // Hash da senha
    const passwordHash = await hashPassword(data.password);

    // Criar usuario
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        sport: true,
        position: true,
        photoUrl: true,
        createdAt: true,
      },
    });

    // Gerar token
    const token = generateToken({ userId: user.id, email: user.email });

    return { user, token };
  }

  async login(data: LoginInput) {
    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      const error: any = new Error('E-mail ou senha incorretos');
      error.statusCode = 401;
      throw error;
    }

    // Comparar senha
    const isValid = await comparePassword(data.password, user.passwordHash);

    if (!isValid) {
      const error: any = new Error('E-mail ou senha incorretos');
      error.statusCode = 401;
      throw error;
    }

    // Gerar token
    const token = generateToken({ userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        sport: user.sport,
        position: user.position,
        photoUrl: user.photoUrl,
        createdAt: user.createdAt,
      },
      token,
    };
  }
}

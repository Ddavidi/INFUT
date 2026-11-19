// src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import prisma from '../utils/prisma';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const resolvedUserIdCache = new Map<string, string>();

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'Token nao fornecido' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Formato de token invalido' });
    return;
  }

  try {
    const decoded = verifyToken(parts[1]);
    const cacheKey = `${decoded.userId}:${decoded.email}`;
    const cachedId = resolvedUserIdCache.get(cacheKey);

    if (cachedId) {
      req.user = { ...decoded, userId: cachedId };
      next();
      return;
    }

    const userById = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true },
    });

    if (userById) {
      resolvedUserIdCache.set(cacheKey, userById.id);
      req.user = decoded;
      next();
      return;
    }

    // Fallback: if token was issued in SQLite before Postgres migration, resolve by email
    if (decoded.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: decoded.email },
        select: { id: true, email: true },
      });

      if (userByEmail) {
        resolvedUserIdCache.set(cacheKey, userByEmail.id);
        req.user = { userId: userByEmail.id, email: userByEmail.email };
        next();
        return;
      }
    }

    res.status(401).json({ error: 'Sessao invalida. Faca login novamente.' });
  } catch {
    res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

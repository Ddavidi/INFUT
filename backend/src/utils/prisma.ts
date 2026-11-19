// src/utils/prisma.ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

function ensurePostgresEnvLoaded() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('file:')) {
    const envCandidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'backend/.env'),
      path.resolve(__dirname, '../../.env'),
    ];
    for (const envPath of envCandidates) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath, override: true });
        if (process.env.DATABASE_URL?.startsWith('postgres')) {
          break;
        }
      }
    }
  }
}

function resolveDatabaseUrl(): string | undefined {
  ensurePostgresEnvLoaded();

  const raw =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL;

  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete('channel_binding');
    if (parsed.hostname.includes('-pooler') && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '15');
    }
    return parsed.toString();
  } catch {
    return raw;
  }
}

const resolvedUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(
    resolvedUrl
      ? {
          datasources: {
            db: { url: resolvedUrl },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

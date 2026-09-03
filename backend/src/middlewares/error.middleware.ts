// src/middlewares/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  error: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Erro interno do servidor';

  console.error(`[ERROR] ${statusCode}: ${message}`);

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
}
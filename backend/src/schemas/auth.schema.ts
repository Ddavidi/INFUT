// src/schemas/auth.schema.ts
import { z } from 'zod';
import { profileExtrasSchema } from './user.schema';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  sport: z.string().max(40).optional().nullable(),
  position: z.string().max(40).optional().nullable(),
}).merge(profileExtrasSchema);

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

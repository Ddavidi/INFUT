// src/schemas/pelada.schema.ts
import { z } from 'zod';

export const createPeladaSchema = z.object({
  title: z.string().min(3, 'Titulo deve ter pelo menos 3 caracteres'),
  sport: z.string().min(1, 'Esporte e obrigatorio'),
  dateTime: z.string().datetime({ message: 'Data/hora invalida (use formato ISO 8601)' }),
  location: z.string().min(1, 'Local e obrigatorio'),
  locationAddress: z.string().optional().nullable(),
  price: z.number().min(0).optional().nullable(),
  isRecurring: z.boolean().optional().default(false),
  recurrenceDay: z.string().optional().nullable(),
  maxPlayers: z.number().int().min(2).optional().nullable(),
});

export type CreatePeladaInput = z.infer<typeof createPeladaSchema>;

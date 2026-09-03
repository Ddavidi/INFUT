// src/schemas/user.schema.ts
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  sport: z.string().optional(),
  position: z.string().optional(),
  photoUrl: z.string().url().optional().nullable(),
  region: z.string().optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// src/schemas/user.schema.ts
import { z } from 'zod';

// Foto: URL http(s) ou data URL (imagem ja redimensionada no app, ~10-40 KB)
export const photoUrlSchema = z
  .string()
  .max(400_000, 'Foto muito grande. Escolha outra imagem.')
  .refine(
    (v) => /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp);base64,/i.test(v),
    'Foto invalida'
  );

export const instagramSchema = z
  .string()
  .max(31)
  .regex(/^@?[A-Za-z0-9._]{1,30}$/, 'Instagram invalido (use apenas letras, numeros, ponto e _)');

export const profileExtrasSchema = z.object({
  photoUrl: photoUrlSchema.optional().nullable(),
  instagram: instagramSchema.optional().nullable().or(z.literal('')),
  favoriteTeam: z.string().max(60).optional().nullable(),
  idol: z.string().max(60).optional().nullable(),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).optional(),
    sport: z.string().optional(),
    position: z.string().optional(),
    region: z.string().optional().nullable(),
  })
  .merge(profileExtrasSchema);

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual e obrigatoria'),
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

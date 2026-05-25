import { z } from 'zod';
import { isValidEmail, normalizeEmail } from '../validators/email.js';

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório' })
    .transform(normalizeEmail)
    .refine(isValidEmail, { message: 'E-mail inválido' }),
  password: z
    .string({ required_error: 'Senha é obrigatória' })
    .min(1, 'Senha é obrigatória'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Senha atual é obrigatória' }).min(1),
    newPassword: z
      .string({ required_error: 'Nova senha é obrigatória' })
      .min(8, 'Nova senha deve ter ao menos 8 caracteres'),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    message: 'A nova senha precisa ser diferente da atual',
    path: ['newPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

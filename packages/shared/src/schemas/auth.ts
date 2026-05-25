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

export type LoginInput = z.infer<typeof loginSchema>;

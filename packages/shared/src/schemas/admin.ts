import { z } from 'zod';
import { isValidEmail, normalizeEmail } from '../validators/email.js';

export const AdminRoleSchema = z.enum(['super_admin', 'operacao', 'leitura']);
export type AdminRole = z.infer<typeof AdminRoleSchema>;

export const ROLE_LABEL: Record<AdminRole, string> = {
  super_admin: 'super admin',
  operacao: 'operação',
  leitura: 'leitura',
};

export const ROLE_DESCRIPTION: Record<AdminRole, string> = {
  super_admin: 'pode tudo, incluindo gerenciar outros admins e anonimização LGPD',
  operacao: 'CRUD de alunos, contatos, pedidos LGPD; sem anonimização e sem gerenciar admins',
  leitura: 'apenas visualização',
};

export const inviteAdminSchema = z.object({
  email: z
    .string({ required_error: 'E-mail é obrigatório' })
    .transform(normalizeEmail)
    .refine(isValidEmail, { message: 'E-mail inválido' }),
  role: AdminRoleSchema,
});

export const acceptInviteSchema = z.object({
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
});

export const updateAdminRoleSchema = z.object({
  role: AdminRoleSchema,
});

export type InviteAdminInput = z.infer<typeof inviteAdminSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

export interface AdminDTO {
  id: string;
  email: string;
  role: AdminRole;
  createdAt: string;
}

export interface AdminInviteDTO {
  id: string;
  email: string;
  role: AdminRole;
  createdByEmail: string | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  expirado: boolean;
}

import { z } from 'zod';
import { isValidCpf, normalizeCpf } from '../validators/cpf.js';
import { isValidEmail, normalizeEmail } from '../validators/email.js';

export const LgpdRequestTypeSchema = z.enum([
  'acesso',
  'retificacao',
  'apagamento',
  'portabilidade',
  'oposicao',
]);
export const LgpdRequestStatusSchema = z.enum([
  'recebido',
  'em_andamento',
  'concluido',
  'rejeitado',
]);

export type LgpdRequestType = z.infer<typeof LgpdRequestTypeSchema>;
export type LgpdRequestStatus = z.infer<typeof LgpdRequestStatusSchema>;

export const LGPD_TYPE_LABEL: Record<LgpdRequestType, string> = {
  acesso: 'acesso aos dados',
  retificacao: 'retificação',
  apagamento: 'apagamento',
  portabilidade: 'portabilidade',
  oposicao: 'oposição',
};

export const LGPD_STATUS_LABEL: Record<LgpdRequestStatus, string> = {
  recebido: 'recebido',
  em_andamento: 'em andamento',
  concluido: 'concluído',
  rejeitado: 'rejeitado',
};

export const createLgpdRequestSchema = z.object({
  requesterEmail: z
    .string({ required_error: 'E-mail é obrigatório' })
    .transform(normalizeEmail)
    .refine(isValidEmail, { message: 'E-mail inválido' }),
  requesterCpf: z
    .string()
    .transform(normalizeCpf)
    .refine((v) => v === '' || isValidCpf(v), { message: 'CPF inválido' })
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  type: LgpdRequestTypeSchema,
  alunoId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000, 'Notas devem ter no máximo 1000 caracteres').optional(),
});

export const updateLgpdRequestSchema = z.object({
  status: LgpdRequestStatusSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const listLgpdRequestsQuerySchema = z.object({
  status: LgpdRequestStatusSchema.optional(),
  type: LgpdRequestTypeSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateLgpdRequestInput = z.infer<typeof createLgpdRequestSchema>;
export type UpdateLgpdRequestInput = z.infer<typeof updateLgpdRequestSchema>;
export type ListLgpdRequestsQuery = z.infer<typeof listLgpdRequestsQuerySchema>;

export interface LgpdRequestDTO {
  id: string;
  alunoId: string | null;
  alunoNome: string | null;
  requesterEmail: string;
  requesterCpfMasked: string | null;
  type: LgpdRequestType;
  status: LgpdRequestStatus;
  receivedAt: string;
  dueAt: string;
  completedAt: string | null;
  diasParaPrazo: number; // negativo se vencido
  notes: string | null;
  handledByAdminEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

import { z } from 'zod';
import { isValidCpf, normalizeCpf } from '../validators/cpf.js';
import { isValidEmail, normalizeEmail } from '../validators/email.js';
import { isValidTelefone, normalizeTelefone } from '../validators/telefone.js';

export const PlanoSchema = z.enum(['basic', 'premium']);
export const StatusAlunoSchema = z.enum(['ativo', 'pausado', 'cancelado']);

export type Plano = z.infer<typeof PlanoSchema>;
export type StatusAluno = z.infer<typeof StatusAlunoSchema>;

const NomeSchema = z
  .string({ required_error: 'Nome é obrigatório' })
  .trim()
  .min(2, 'Nome deve ter ao menos 2 caracteres')
  .max(120, 'Nome deve ter no máximo 120 caracteres');

const EmailSchema = z
  .string({ required_error: 'E-mail é obrigatório' })
  .transform(normalizeEmail)
  .refine(isValidEmail, { message: 'E-mail inválido' });

const CpfSchema = z
  .string({ required_error: 'CPF é obrigatório' })
  .transform(normalizeCpf)
  .refine(isValidCpf, { message: 'CPF inválido' });

const TelefoneSchema = z
  .string({ required_error: 'Telefone é obrigatório' })
  .transform(normalizeTelefone)
  .refine(isValidTelefone, { message: 'Telefone inválido' });

/**
 * Schema de criação de aluno. Status default `ativo`.
 */
export const createAlunoSchema = z.object({
  nome: NomeSchema,
  email: EmailSchema,
  cpf: CpfSchema,
  telefone: TelefoneSchema,
  plano: PlanoSchema,
  status: StatusAlunoSchema.optional().default('ativo'),
});

/**
 * Schema de atualização — todos os campos opcionais (partial update).
 */
export const updateAlunoSchema = createAlunoSchema.partial();

/**
 * Schema de query da listagem de alunos. Aceita busca, filtros e paginação.
 */
export const listAlunosQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: StatusAlunoSchema.optional(),
  plano: PlanoSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type ListAlunosQuery = z.infer<typeof listAlunosQuerySchema>;

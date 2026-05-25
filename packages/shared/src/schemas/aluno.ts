import { z } from 'zod';
import { isValidCpf, normalizeCpf } from '../validators/cpf.js';
import { isValidEmail, normalizeEmail } from '../validators/email.js';
import { isValidTelefone, normalizeTelefone } from '../validators/telefone.js';

// Plano: por ora só 'anual'. Enum mantido para evolução futura (mensal, bienal).
export const PlanoSchema = z.enum(['anual']);
export const StatusAlunoSchema = z.enum(['ativo', 'pausado', 'cancelado']);
export const TrilhaSchema = z.enum([
  'saindo_da_divida',
  'fazendo_sobrar_dinheiro',
  'montando_reserva',
  'construindo_patrimonio',
]);

export type Plano = z.infer<typeof PlanoSchema>;
export type StatusAluno = z.infer<typeof StatusAlunoSchema>;
export type Trilha = z.infer<typeof TrilhaSchema>;

// Labels human-readable para exibição (UI usa direto). Vocabulário oficial da
// marca, conforme planilhadobreno.com.br.
export const TRILHA_LABEL: Record<Trilha, string> = {
  saindo_da_divida: 'saindo da dívida',
  fazendo_sobrar_dinheiro: 'fazendo sobrar dinheiro',
  montando_reserva: 'montando reserva',
  construindo_patrimonio: 'construindo patrimônio',
};

export const STATUS_LABEL: Record<StatusAluno, string> = {
  ativo: 'ativo',
  pausado: 'pausado',
  cancelado: 'cancelado',
};

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

// Aceita string ISO ou Date. Devolve Date.
const DateInputSchema = z.union([z.string().datetime({ offset: true }), z.string().date(), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: 'Data inválida' });

/**
 * Schema de criação de aluno (admin form).
 *
 * `dataInicio` opcional default hoje. `dataVencimento` opcional default
 * `dataInicio` + 1 ano (mas o backend calcula final — schema só valida shape).
 */
export const createAlunoSchema = z.object({
  nome: NomeSchema,
  email: EmailSchema,
  cpf: CpfSchema,
  telefone: TelefoneSchema,
  plano: PlanoSchema.optional().default('anual'),
  status: StatusAlunoSchema.optional().default('ativo'),
  trilha: TrilhaSchema.optional().default('saindo_da_divida'),
  dataInicio: DateInputSchema.optional(),
  dataVencimento: DateInputSchema.optional(),
  renovacaoAutomatica: z.boolean().optional().default(true),
});

/** Atualização parcial — todos os campos opcionais. */
export const updateAlunoSchema = createAlunoSchema.partial();

/** Query da listagem com busca + filtros + paginação. */
export const listAlunosQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: StatusAlunoSchema.optional(),
  plano: PlanoSchema.optional(),
  trilha: TrilhaSchema.optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type ListAlunosQuery = z.infer<typeof listAlunosQuerySchema>;

import { z } from 'zod';
import { isValidCpf, normalizeCpf } from '../validators/cpf.js';
import { isValidEmail, normalizeEmail } from '../validators/email.js';
import { isValidTelefone, normalizeTelefone } from '../validators/telefone.js';

export const PlanoSchema = z.enum(['anual']);
export const StatusAlunoSchema = z.enum(['ativo', 'pausado', 'cancelado']);
export const TrilhaSchema = z.enum([
  'saindo_da_divida',
  'fazendo_sobrar_dinheiro',
  'montando_reserva',
  'construindo_patrimonio',
]);
export const CanalContatoSchema = z.enum([
  'whatsapp',
  'telefone',
  'email',
  'presencial',
  'outro',
]);

export type Plano = z.infer<typeof PlanoSchema>;
export type StatusAluno = z.infer<typeof StatusAlunoSchema>;
export type Trilha = z.infer<typeof TrilhaSchema>;
export type CanalContato = z.infer<typeof CanalContatoSchema>;

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

export const CANAL_LABEL: Record<CanalContato, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'telefone',
  email: 'e-mail',
  presencial: 'presencial',
  outro: 'outro',
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

const DateInputSchema = z
  .union([z.string().datetime({ offset: true }), z.string().date(), z.date()])
  .transform((v) => (v instanceof Date ? v : new Date(v)))
  .refine((d) => !Number.isNaN(d.getTime()), { message: 'Data inválida' });

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
  valorAnualCentavos: z.coerce.number().int().nonnegative().optional().default(29880),
  consentEmail: z.boolean().optional().default(true),
  consentWhatsapp: z.boolean().optional().default(true),
  consentOfertas: z.boolean().optional().default(false),
});

export const updateAlunoSchema = createAlunoSchema.partial();

export const listAlunosQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: StatusAlunoSchema.optional(),
  plano: PlanoSchema.optional(),
  trilha: TrilhaSchema.optional(),
  includeDeleted: z.coerce.boolean().optional().default(false),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const registerContactSchema = z.object({
  canal: CanalContatoSchema,
  nota: z.string().trim().max(500, 'Nota deve ter no máximo 500 caracteres').optional(),
});

export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
export type UpdateAlunoInput = z.infer<typeof updateAlunoSchema>;
export type ListAlunosQuery = z.infer<typeof listAlunosQuerySchema>;
export type RegisterContactInput = z.infer<typeof registerContactSchema>;

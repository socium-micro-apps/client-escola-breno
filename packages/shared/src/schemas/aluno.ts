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
export const OrigemCanalSchema = z.enum([
  'instagram',
  'youtube',
  'indicacao',
  'evento_presencial',
  'busca_organica',
  'anuncio_pago',
  'outro',
]);

export type Plano = z.infer<typeof PlanoSchema>;
export type StatusAluno = z.infer<typeof StatusAlunoSchema>;
export type Trilha = z.infer<typeof TrilhaSchema>;
export type CanalContato = z.infer<typeof CanalContatoSchema>;
export type OrigemCanal = z.infer<typeof OrigemCanalSchema>;

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

export const ORIGEM_LABEL: Record<OrigemCanal, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  indicacao: 'indicação',
  evento_presencial: 'evento presencial',
  busca_organica: 'busca orgânica',
  anuncio_pago: 'anúncio pago',
  outro: 'outro',
};

// =============================================================================
// Catálogo de itens da trilha (ADR 0014)
// =============================================================================
export interface TrilhaItem {
  key: string;
  label: string;
}

export const TRILHA_CHECKLISTS: Record<Trilha, TrilhaItem[]> = {
  saindo_da_divida: [
    { key: 'mapeou_dividas', label: 'mapeou todas as dívidas' },
    { key: 'negociou_juros', label: 'negociou juros com credores' },
    { key: 'primeira_planilha', label: 'preencheu a primeira planilha' },
    { key: 'mes_sem_cartao', label: 'mês completo sem cartão de crédito' },
  ],
  fazendo_sobrar_dinheiro: [
    { key: 'orcamento_zerado', label: 'orçamento mensal zerado' },
    { key: 'corte_assinaturas', label: 'cortou assinaturas não-essenciais' },
    { key: 'sobrou_10pct', label: 'sobrou ao menos 10% da renda' },
    { key: 'tres_meses_seguidos', label: 'três meses seguidos sobrando' },
  ],
  montando_reserva: [
    { key: 'meta_definida', label: 'definiu meta (6 meses de gasto)' },
    { key: 'conta_separada', label: 'criou conta/aplicação separada' },
    { key: 'aporte_mensal', label: 'aporte mensal automático ativo' },
    { key: 'metade_da_reserva', label: 'alcançou metade da reserva' },
    { key: 'reserva_completa', label: 'reserva completa' },
  ],
  construindo_patrimonio: [
    { key: 'perfil_investidor', label: 'definiu perfil de investidor' },
    { key: 'primeiro_aporte', label: 'primeiro aporte em renda variável' },
    { key: 'diversificou', label: 'diversificou em ao menos 3 classes' },
    { key: 'rebalanceou', label: 'rebalanceou a carteira ao menos uma vez' },
    { key: 'patrimonio_100k', label: 'patrimônio acumulado de R$ 100k+' },
  ],
};

export function trilhaItemsCount(trilha: Trilha): number {
  return TRILHA_CHECKLISTS[trilha].length;
}

export function trilhaProgressPct(trilha: Trilha, completedKeys: string[]): number {
  const items = TRILHA_CHECKLISTS[trilha];
  if (items.length === 0) return 0;
  const validCompleted = items.filter((i) => completedKeys.includes(i.key)).length;
  return Math.round((validCompleted / items.length) * 100);
}

// =============================================================================
// Schemas Zod
// =============================================================================

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

const OptionalDateSchema = z
  .union([z.string(), z.date(), z.null()])
  .optional()
  .transform((v) => (v == null || v === '' ? null : v instanceof Date ? v : new Date(v)))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), { message: 'Data inválida' });

const OptionalShortString = (max: number, label: string) =>
  z.string().trim().max(max, `${label} deve ter no máximo ${max} caracteres`).optional()
    .transform((v) => (v === '' ? undefined : v));

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
  // v4 — perfil rico
  avatarUrl: OptionalShortString(500, 'URL do avatar'),
  origemCanal: OrigemCanalSchema.optional().nullable(),
  origemDetalhe: OptionalShortString(200, 'Detalhe da origem'),
  cidade: OptionalShortString(80, 'Cidade'),
  profissao: OptionalShortString(80, 'Profissão'),
  aniversario: OptionalDateSchema,
  progressoItensCompletos: z.array(z.string()).optional().default([]),
});

export const updateAlunoSchema = createAlunoSchema.partial();

export const listAlunosQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: StatusAlunoSchema.optional(),
  plano: PlanoSchema.optional(),
  trilha: TrilhaSchema.optional(),
  origem: OrigemCanalSchema.optional(),
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

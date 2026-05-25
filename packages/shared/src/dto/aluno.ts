// DTOs de saída — camada entre o Prisma model e a resposta da API.
// Garante que PII não vaza cru. ADR 0006 + 0012 + 0013.

import { formatTelefone } from '../validators/telefone.js';
import { formatCpf, maskCpf } from '../validators/cpf.js';
import type { CanalContato, Plano, StatusAluno, Trilha } from '../schemas/aluno.js';

export interface AlunoRecord {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  plano: Plano;
  status: StatusAluno;
  trilha: Trilha;
  dataInicio: Date;
  dataVencimento: Date;
  renovacaoAutomatica: boolean;
  valorAnualCentavos: number;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentOfertas: boolean;
  termsAcceptedAt: Date;
  ultimoContatoEm: Date | null;
  ultimoContatoCanal: CanalContato | null;
  ultimoContatoNota: string | null;
  anonymizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AlunoDTO {
  id: string;
  nome: string;
  email: string;
  cpfMasked: string;
  telefone: string;
  telefoneFormatado: string;
  plano: Plano;
  status: StatusAluno;
  trilha: Trilha;
  dataInicio: string;
  dataVencimento: string;
  renovacaoAutomatica: boolean;
  valorAnualCentavos: number;
  valorAnualFormatado: string;       // "R$ 298,80"
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentOfertas: boolean;
  termsAcceptedAt: string;
  ultimoContatoEm: string | null;
  ultimoContatoCanal: CanalContato | null;
  ultimoContatoNota: string | null;
  diasDesdeUltimoContato: number | null; // null se nunca contatado
  diasParaVencimento: number;
  anonimizado: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface AlunoRevealedDTO extends AlunoDTO {
  cpf: string;
  cpfFormatado: string;
}

function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function formatCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function toAlunoDTO(record: AlunoRecord): AlunoDTO {
  const now = new Date();
  return {
    id: record.id,
    nome: record.nome,
    email: record.email,
    cpfMasked: maskCpf(record.cpf),
    telefone: record.telefone,
    telefoneFormatado: formatTelefone(record.telefone),
    plano: record.plano,
    status: record.status,
    trilha: record.trilha,
    dataInicio: record.dataInicio.toISOString(),
    dataVencimento: record.dataVencimento.toISOString(),
    renovacaoAutomatica: record.renovacaoAutomatica,
    valorAnualCentavos: record.valorAnualCentavos,
    valorAnualFormatado: formatCentavos(record.valorAnualCentavos),
    consentEmail: record.consentEmail,
    consentWhatsapp: record.consentWhatsapp,
    consentOfertas: record.consentOfertas,
    termsAcceptedAt: record.termsAcceptedAt.toISOString(),
    ultimoContatoEm: record.ultimoContatoEm?.toISOString() ?? null,
    ultimoContatoCanal: record.ultimoContatoCanal,
    ultimoContatoNota: record.ultimoContatoNota,
    diasDesdeUltimoContato: record.ultimoContatoEm
      ? daysBetween(now, record.ultimoContatoEm)
      : null,
    diasParaVencimento: daysBetween(record.dataVencimento, now),
    anonimizado: record.anonymizedAt !== null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    deletedAt: record.deletedAt?.toISOString() ?? null,
  };
}

export function toAlunoRevealedDTO(record: AlunoRecord): AlunoRevealedDTO {
  return {
    ...toAlunoDTO(record),
    cpf: record.cpf,
    cpfFormatado: formatCpf(record.cpf),
  };
}

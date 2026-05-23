// DTOs de saída — camada entre o Prisma model e a resposta da API.
// Garante que PII não vaza cru. Ver ADR 0006.

import { formatTelefone } from '../validators/telefone.js';
import { formatCpf, maskCpf } from '../validators/cpf.js';
import type { Plano, StatusAluno } from '../schemas/aluno.js';

/**
 * Formato mínimo de Aluno como vem do Prisma (subset relevante).
 */
export interface AlunoRecord {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  plano: Plano;
  status: StatusAluno;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * DTO público — CPF mascarado por padrão.
 * É o que sai em listagens e leituras "normais".
 */
export interface AlunoDTO {
  id: string;
  nome: string;
  email: string;
  cpfMasked: string;
  telefone: string;
  telefoneFormatado: string;
  plano: Plano;
  status: StatusAluno;
  createdAt: string;
  updatedAt: string;
}

/**
 * DTO revelado — CPF e telefone formatados em claro.
 * Use APENAS quando o admin solicitar revelar (ação intencional).
 */
export interface AlunoRevealedDTO extends AlunoDTO {
  cpf: string;
  cpfFormatado: string;
}

/**
 * Serializa um Aluno do banco para o DTO público.
 * CPF mascarado por padrão.
 */
export function toAlunoDTO(record: AlunoRecord): AlunoDTO {
  return {
    id: record.id,
    nome: record.nome,
    email: record.email,
    cpfMasked: maskCpf(record.cpf),
    telefone: record.telefone,
    telefoneFormatado: formatTelefone(record.telefone),
    plano: record.plano,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

/**
 * Serializa um Aluno revelando CPF.
 * Use apenas em endpoint/ação explícita de "revelar".
 */
export function toAlunoRevealedDTO(record: AlunoRecord): AlunoRevealedDTO {
  return {
    ...toAlunoDTO(record),
    cpf: record.cpf,
    cpfFormatado: formatCpf(record.cpf),
  };
}

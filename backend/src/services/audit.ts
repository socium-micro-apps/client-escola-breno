// Serviço de auditoria — registra mutações em Aluno. Ver ADR 0012.
//
// Estratégia: registro per-row, gravado em audit_event. O before/after guarda
// snapshots já anonimizados (DTO mascarado), evitando que o log de auditoria
// se torne um vazamento secundário de PII.

import type { Prisma, PrismaClient } from '@prisma/client';
import { maskCpf } from '@escola/shared';

type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'anonymize';

interface AlunoSnapshot {
  id: string;
  nome: string;
  email: string;
  cpfMasked: string;
  telefoneMasked: string;
  plano: string;
  status: string;
  trilha: string;
  dataInicio: string;
  dataVencimento: string;
  renovacaoAutomatica: boolean;
  anonymizedAt: string | null;
  deletedAt: string | null;
}

/**
 * Converte um Aluno em snapshot mascarado para o audit log.
 * NUNCA armazena CPF/telefone em claro no audit — preserva PII discipline.
 */
export function toAlunoSnapshot(aluno: {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  plano: string;
  status: string;
  trilha: string;
  dataInicio: Date;
  dataVencimento: Date;
  renovacaoAutomatica: boolean;
  anonymizedAt: Date | null;
  deletedAt: Date | null;
}): AlunoSnapshot {
  return {
    id: aluno.id,
    nome: aluno.nome,
    email: aluno.email,
    cpfMasked: maskCpf(aluno.cpf),
    telefoneMasked: aluno.telefone.slice(0, 2) + '*****' + aluno.telefone.slice(-2),
    plano: aluno.plano,
    status: aluno.status,
    trilha: aluno.trilha,
    dataInicio: aluno.dataInicio.toISOString(),
    dataVencimento: aluno.dataVencimento.toISOString(),
    renovacaoAutomatica: aluno.renovacaoAutomatica,
    anonymizedAt: aluno.anonymizedAt?.toISOString() ?? null,
    deletedAt: aluno.deletedAt?.toISOString() ?? null,
  };
}

export async function recordAudit(
  prisma: PrismaClient,
  params: {
    alunoId: string;
    adminId: string;
    action: AuditAction;
    before?: AlunoSnapshot | null;
    after?: AlunoSnapshot | null;
  },
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      alunoId: params.alunoId,
      adminId: params.adminId,
      action: params.action,
      before: (params.before ?? null) as unknown as Prisma.InputJsonValue,
      after: (params.after ?? null) as unknown as Prisma.InputJsonValue,
    },
  });
}

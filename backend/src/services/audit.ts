// Serviço de auditoria — registra mutações em Aluno. ADR 0012 + 0013.
//
// Snapshots gravados com PII MASCARADA — audit não vira vazamento secundário.

import type { Prisma, PrismaClient } from '@prisma/client';
import { maskCpf, type CanalContato } from '@escola/shared';

type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'anonymize' | 'contact';

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
  valorAnualCentavos: number;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentOfertas: boolean;
  ultimoContatoEm: string | null;
  ultimoContatoCanal: CanalContato | null;
  anonymizedAt: string | null;
  deletedAt: string | null;
}

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
  valorAnualCentavos: number;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentOfertas: boolean;
  ultimoContatoEm: Date | null;
  ultimoContatoCanal: CanalContato | null;
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
    valorAnualCentavos: aluno.valorAnualCentavos,
    consentEmail: aluno.consentEmail,
    consentWhatsapp: aluno.consentWhatsapp,
    consentOfertas: aluno.consentOfertas,
    ultimoContatoEm: aluno.ultimoContatoEm?.toISOString() ?? null,
    ultimoContatoCanal: aluno.ultimoContatoCanal,
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

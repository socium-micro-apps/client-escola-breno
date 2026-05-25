import {
  createAlunoSchema,
  listAlunosQuerySchema,
  registerContactSchema,
  toAlunoDTO,
  toAlunoRevealedDTO,
  updateAlunoSchema,
  type AlunoRecord,
  type CreateAlunoInput,
  type ListAlunosQuery,
  type RegisterContactInput,
  type UpdateAlunoInput,
} from '@escola/shared';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';
import { recordAudit, toAlunoSnapshot } from '../services/audit.js';

const router = Router();

router.use(requireAuth);

const idParam = z.object({ id: z.string().uuid('id inválido') });

const revealQuery = z.object({
  reveal: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .default('false'),
});

function plusYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

// =============================================================================
// GET /api/alunos — listagem com busca e filtros (nice-to-have do brief)
// =============================================================================
router.get('/', validate(listAlunosQuerySchema, 'query'), async (req, res) => {
  const { q, status, plano, trilha, includeDeleted, page, pageSize } =
    req.query as unknown as ListAlunosQuery;

  const where: Prisma.AlunoWhereInput = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(status && { status }),
    ...(plano && { plano }),
    ...(trilha && { trilha }),
    ...(q && {
      OR: [
        { nome: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { cpf: { contains: q.replace(/\D/g, '') } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.aluno.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.aluno.count({ where }),
  ]);

  res.json({
    items: items.map((a) => toAlunoDTO(a as AlunoRecord)),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
});

// =============================================================================
// POST /api/alunos — criar aluno
// =============================================================================
router.post('/', validate(createAlunoSchema), async (req, res) => {
  const input = req.body as CreateAlunoInput;
  const adminId = req.user!.id;

  const dataInicio = input.dataInicio ?? new Date();
  const dataVencimento = input.dataVencimento ?? plusYears(dataInicio, 1);

  try {
    const created = await prisma.aluno.create({
      data: {
        nome: input.nome,
        email: input.email,
        cpf: input.cpf,
        telefone: input.telefone,
        plano: input.plano ?? 'anual',
        status: input.status ?? 'ativo',
        trilha: input.trilha ?? 'saindo_da_divida',
        dataInicio,
        dataVencimento,
        renovacaoAutomatica: input.renovacaoAutomatica ?? true,
        valorAnualCentavos: input.valorAnualCentavos ?? 29880,
        consentEmail: input.consentEmail ?? true,
        consentWhatsapp: input.consentWhatsapp ?? true,
        consentOfertas: input.consentOfertas ?? false,
      },
    });

    await recordAudit(prisma, {
      alunoId: created.id,
      adminId,
      action: 'create',
      after: toAlunoSnapshot(created),
    });

    res.status(201).json(toAlunoDTO(created as AlunoRecord));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes('email')) {
        res.status(409).json({ error: 'conflict', message: 'E-mail já cadastrado' });
        return;
      }
      res.status(409).json({ error: 'conflict', message: 'Dados em uso por outro registro' });
      return;
    }
    throw err;
  }
});

// =============================================================================
// GET /api/alunos/:id — detalhe, com opcional ?reveal=true para CPF em claro
// =============================================================================
router.get(
  '/:id',
  validate(idParam, 'params'),
  validate(revealQuery, 'query'),
  async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const { reveal } = req.query as unknown as { reveal: 'true' | 'false' };

    const aluno = await prisma.aluno.findUnique({ where: { id } });
    if (!aluno) {
      res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
      return;
    }

    const dto =
      reveal === 'true' ? toAlunoRevealedDTO(aluno as AlunoRecord) : toAlunoDTO(aluno as AlunoRecord);
    res.json(dto);
  },
);

// =============================================================================
// GET /api/alunos/:id/history — timeline de auditoria
// =============================================================================
router.get('/:id/history', validate(idParam, 'params'), async (req, res) => {
  const { id } = req.params as unknown as { id: string };

  const events = await prisma.auditEvent.findMany({
    where: { alunoId: id },
    orderBy: { createdAt: 'desc' },
    include: { admin: { select: { email: true } } },
    take: 100,
  });

  res.json({
    items: events.map((e) => ({
      id: e.id,
      action: e.action,
      adminEmail: e.admin?.email ?? null,
      before: e.before,
      after: e.after,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

// =============================================================================
// PATCH /api/alunos/:id — atualização parcial
// =============================================================================
router.patch('/:id', validate(idParam, 'params'), validate(updateAlunoSchema), async (req, res) => {
  const { id } = req.params as unknown as { id: string };
  const input = req.body as UpdateAlunoInput;
  const adminId = req.user!.id;

  const existing = await prisma.aluno.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }

  if (existing.anonymizedAt !== null) {
    res.status(409).json({ error: 'conflict', message: 'Aluno anonimizado não pode ser editado' });
    return;
  }

  try {
    const before = toAlunoSnapshot(existing);
    const updated = await prisma.aluno.update({ where: { id }, data: input });

    await recordAudit(prisma, {
      alunoId: id,
      adminId,
      action: 'update',
      before,
      after: toAlunoSnapshot(updated),
    });

    res.json(toAlunoDTO(updated as AlunoRecord));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes('email')) {
        res.status(409).json({ error: 'conflict', message: 'E-mail já cadastrado' });
        return;
      }
      res.status(409).json({ error: 'conflict', message: 'Dados em uso por outro registro' });
      return;
    }
    throw err;
  }
});

// =============================================================================
// DELETE /api/alunos/:id — soft delete (ADR 0008)
// =============================================================================
router.delete('/:id', validate(idParam, 'params'), async (req, res) => {
  const { id } = req.params as unknown as { id: string };
  const adminId = req.user!.id;

  const existing = await prisma.aluno.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }

  const before = toAlunoSnapshot(existing);
  const updated = await prisma.aluno.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await recordAudit(prisma, {
    alunoId: id,
    adminId,
    action: 'delete',
    before,
    after: toAlunoSnapshot(updated),
  });

  res.status(204).send();
});

// =============================================================================
// POST /api/alunos/:id/restore — reverte soft delete (ADR 0012)
// =============================================================================
router.post('/:id/restore', validate(idParam, 'params'), async (req, res) => {
  const { id } = req.params as unknown as { id: string };
  const adminId = req.user!.id;

  const existing = await prisma.aluno.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }
  if (existing.deletedAt === null) {
    res.status(409).json({ error: 'conflict', message: 'Aluno não está deletado' });
    return;
  }

  const before = toAlunoSnapshot(existing);
  const restored = await prisma.aluno.update({
    where: { id },
    data: { deletedAt: null },
  });

  await recordAudit(prisma, {
    alunoId: id,
    adminId,
    action: 'restore',
    before,
    after: toAlunoSnapshot(restored),
  });

  res.json(toAlunoDTO(restored as AlunoRecord));
});

// =============================================================================
// POST /api/alunos/:id/contact — registra contato manual da operação (ADR 0013)
// =============================================================================
router.post(
  '/:id/contact',
  validate(idParam, 'params'),
  validate(registerContactSchema),
  async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const input = req.body as RegisterContactInput;
    const adminId = req.user!.id;

    const existing = await prisma.aluno.findUnique({ where: { id } });
    if (!existing || existing.deletedAt !== null) {
      res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
      return;
    }
    if (existing.anonymizedAt !== null) {
      res.status(409).json({
        error: 'conflict',
        message: 'Não é possível registrar contato em aluno anonimizado',
      });
      return;
    }

    const before = toAlunoSnapshot(existing);
    const updated = await prisma.aluno.update({
      where: { id },
      data: {
        ultimoContatoEm: new Date(),
        ultimoContatoCanal: input.canal,
        ultimoContatoNota: input.nota ?? null,
      },
    });

    await recordAudit(prisma, {
      alunoId: id,
      adminId,
      action: 'contact',
      before,
      after: toAlunoSnapshot(updated),
    });

    res.json(toAlunoDTO(updated as AlunoRecord));
  },
);

// =============================================================================
// POST /api/alunos/:id/anonymize — LGPD: direito ao esquecimento (ADR 0012)
// Zera PII, preserva linha + timestamps + audit trail
// =============================================================================
router.post('/:id/anonymize', validate(idParam, 'params'), async (req, res) => {
  const { id } = req.params as unknown as { id: string };
  const adminId = req.user!.id;

  const existing = await prisma.aluno.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }
  if (existing.anonymizedAt !== null) {
    res.status(409).json({ error: 'conflict', message: 'Aluno já está anonimizado' });
    return;
  }

  const before = toAlunoSnapshot(existing);
  // Gera valores únicos para preservar constraints sem expor PII
  const placeholder = `anon-${id.slice(0, 8)}`;
  const anonymized = await prisma.aluno.update({
    where: { id },
    data: {
      nome: '[anonimizado]',
      email: `${placeholder}@anonymized.local`,
      cpf: `00000000${id.replace(/-/g, '').slice(0, 3)}`,
      telefone: '00000000000',
      // Reseta consent + contato — anonimização zera PII inclusive metadados
      consentEmail: false,
      consentWhatsapp: false,
      consentOfertas: false,
      ultimoContatoNota: null,
      anonymizedAt: new Date(),
      deletedAt: existing.deletedAt ?? new Date(),
    },
  });

  await recordAudit(prisma, {
    alunoId: id,
    adminId,
    action: 'anonymize',
    before,
    after: toAlunoSnapshot(anonymized),
  });

  res.json(toAlunoDTO(anonymized as AlunoRecord));
});

// =============================================================================
// GET /api/alunos/:id/export — LGPD: portabilidade (ADR 0012)
// Devolve todos os dados do aluno em formato JSON
// =============================================================================
router.get('/:id/export', validate(idParam, 'params'), async (req, res) => {
  const { id } = req.params as unknown as { id: string };

  const aluno = await prisma.aluno.findUnique({
    where: { id },
    include: {
      auditEvents: {
        orderBy: { createdAt: 'asc' },
        include: { admin: { select: { email: true } } },
      },
    },
  });
  if (!aluno) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="aluno-${aluno.id}-export.json"`,
  );

  res.json({
    geradoEm: new Date().toISOString(),
    motivo: 'LGPD — direito à portabilidade',
    aluno: {
      id: aluno.id,
      nome: aluno.nome,
      email: aluno.email,
      cpf: aluno.cpf,
      telefone: aluno.telefone,
      plano: aluno.plano,
      status: aluno.status,
      trilha: aluno.trilha,
      dataInicio: aluno.dataInicio.toISOString(),
      dataVencimento: aluno.dataVencimento.toISOString(),
      renovacaoAutomatica: aluno.renovacaoAutomatica,
      anonymizedAt: aluno.anonymizedAt?.toISOString() ?? null,
      createdAt: aluno.createdAt.toISOString(),
      updatedAt: aluno.updatedAt.toISOString(),
      deletedAt: aluno.deletedAt?.toISOString() ?? null,
    },
    auditEvents: aluno.auditEvents.map((e) => ({
      id: e.id,
      action: e.action,
      adminEmail: e.admin?.email ?? null,
      before: e.before,
      after: e.after,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

export default router;

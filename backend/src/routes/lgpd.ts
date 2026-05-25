import {
  createLgpdRequestSchema,
  listLgpdRequestsQuerySchema,
  updateLgpdRequestSchema,
  type CreateLgpdRequestInput,
  type ListLgpdRequestsQuery,
  type UpdateLgpdRequestInput,
  type LgpdRequestDTO,
} from '@escola/shared';
import { maskCpf } from '@escola/shared';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';

const router = Router();

router.use(requireAuth);

const idParam = z.object({ id: z.string().uuid('id inválido') });

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function toDTO(record: {
  id: string;
  alunoId: string | null;
  aluno: { nome: string } | null;
  requesterEmail: string;
  requesterCpf: string | null;
  type: 'acesso' | 'retificacao' | 'apagamento' | 'portabilidade' | 'oposicao';
  status: 'recebido' | 'em_andamento' | 'concluido' | 'rejeitado';
  receivedAt: Date;
  dueAt: Date;
  completedAt: Date | null;
  notes: string | null;
  handledByAdmin: { email: string } | null;
  createdAt: Date;
  updatedAt: Date;
}): LgpdRequestDTO {
  return {
    id: record.id,
    alunoId: record.alunoId,
    alunoNome: record.aluno?.nome ?? null,
    requesterEmail: record.requesterEmail,
    requesterCpfMasked: record.requesterCpf ? maskCpf(record.requesterCpf) : null,
    type: record.type,
    status: record.status,
    receivedAt: record.receivedAt.toISOString(),
    dueAt: record.dueAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    diasParaPrazo: daysBetween(record.dueAt, new Date()),
    notes: record.notes,
    handledByAdminEmail: record.handledByAdmin?.email ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

const INCLUDE = {
  aluno: { select: { nome: true } },
  handledByAdmin: { select: { email: true } },
} as const;

// =============================================================================
// GET /api/lgpd/requests — listagem com filtros + KPIs
// =============================================================================
router.get('/requests', validate(listLgpdRequestsQuerySchema, 'query'), async (req, res) => {
  const { status, type, page, pageSize } = req.query as unknown as ListLgpdRequestsQuery;

  const where = {
    ...(status && { status }),
    ...(type && { type }),
  };

  const [items, total, totalAbertos, vencidos] = await Promise.all([
    prisma.lgpdRequest.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lgpdRequest.count({ where }),
    prisma.lgpdRequest.count({
      where: { status: { in: ['recebido', 'em_andamento'] } },
    }),
    prisma.lgpdRequest.count({
      where: {
        status: { in: ['recebido', 'em_andamento'] },
        dueAt: { lt: new Date() },
      },
    }),
  ]);

  res.json({
    items: items.map(toDTO),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    summary: { totalAbertos, vencidos },
  });
});

// =============================================================================
// POST /api/lgpd/requests — novo pedido recebido
// =============================================================================
router.post('/requests', validate(createLgpdRequestSchema), async (req, res) => {
  const input = req.body as CreateLgpdRequestInput;

  const receivedAt = new Date();
  const dueAt = new Date(receivedAt.getTime() + 15 * 24 * 60 * 60 * 1000);

  const created = await prisma.lgpdRequest.create({
    data: {
      requesterEmail: input.requesterEmail,
      requesterCpf: input.requesterCpf ?? null,
      type: input.type,
      alunoId: input.alunoId ?? null,
      notes: input.notes ?? null,
      receivedAt,
      dueAt,
    },
    include: INCLUDE,
  });

  res.status(201).json(toDTO(created));
});

// =============================================================================
// PATCH /api/lgpd/requests/:id — atualiza status / notas, atribui admin
// =============================================================================
router.patch(
  '/requests/:id',
  validate(idParam, 'params'),
  validate(updateLgpdRequestSchema),
  async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const input = req.body as UpdateLgpdRequestInput;
    const adminId = req.user!.id;

    const existing = await prisma.lgpdRequest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'not_found', message: 'Pedido não encontrado' });
      return;
    }

    const completedAt =
      input.status === 'concluido' || input.status === 'rejeitado' ? new Date() : null;

    const updated = await prisma.lgpdRequest.update({
      where: { id },
      data: {
        ...input,
        handledByAdminId: adminId,
        ...(completedAt && { completedAt }),
      },
      include: INCLUDE,
    });

    res.json(toDTO(updated));
  },
);

export default router;

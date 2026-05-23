import {
  createAlunoSchema,
  listAlunosQuerySchema,
  toAlunoDTO,
  toAlunoRevealedDTO,
  updateAlunoSchema,
  type AlunoRecord,
} from '@escola/shared';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';

const router = Router();

router.use(requireAuth);

const idParam = z.object({ id: z.string().uuid('id inválido') });

const revealQuery = z.object({
  reveal: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .default('false'),
});

// =============================================================================
// GET /api/alunos — listagem com busca e filtros (nice-to-have do brief)
// =============================================================================
router.get('/', validate(listAlunosQuerySchema, 'query'), async (req, res) => {
  const { q, status, plano, page, pageSize } = req.query as unknown as
    import('@escola/shared').ListAlunosQuery;

  const where: Prisma.AlunoWhereInput = {
    deletedAt: null,
    ...(status && { status }),
    ...(plano && { plano }),
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
  const input = req.body as import('@escola/shared').CreateAlunoInput;

  try {
    const created = await prisma.aluno.create({ data: input });
    res.status(201).json(toAlunoDTO(created as AlunoRecord));
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      // Conflito de unicidade. Mensagem neutra para CPF (ADR 0006).
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes('email')) {
        res.status(409).json({ error: 'conflict', message: 'E-mail já cadastrado' });
        return;
      }
      // Para CPF, mensagem genérica (sem revelar existência)
      res.status(409).json({ error: 'conflict', message: 'Dados em uso por outro registro' });
      return;
    }
    throw err;
  }
});

// =============================================================================
// GET /api/alunos/:id — detalhe, com opcional ?reveal=true para CPF em claro
// =============================================================================
router.get('/:id', validate(idParam, 'params'), validate(revealQuery, 'query'), async (req, res) => {
  const { id } = req.params as unknown as { id: string };
  const { reveal } = req.query as unknown as { reveal: 'true' | 'false' };

  const aluno = await prisma.aluno.findFirst({ where: { id, deletedAt: null } });
  if (!aluno) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }

  const dto = reveal === 'true' ? toAlunoRevealedDTO(aluno as AlunoRecord) : toAlunoDTO(aluno as AlunoRecord);
  res.json(dto);
});

// =============================================================================
// PATCH /api/alunos/:id — atualização parcial
// =============================================================================
router.patch('/:id', validate(idParam, 'params'), validate(updateAlunoSchema), async (req, res) => {
  const { id } = req.params as unknown as { id: string };
  const input = req.body as import('@escola/shared').UpdateAlunoInput;

  // Verifica que existe e não está deletado
  const existing = await prisma.aluno.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }

  try {
    const updated = await prisma.aluno.update({ where: { id }, data: input });
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

  const existing = await prisma.aluno.findFirst({ where: { id, deletedAt: null } });
  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Aluno não encontrado' });
    return;
  }

  await prisma.aluno.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  res.status(204).send();
});

export default router;

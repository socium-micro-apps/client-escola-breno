import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', async (_req, res) => {
  const now = new Date();
  const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trintaDiasAFrente = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    total,
    porStatus,
    porTrilha,
    novosUltimos30,
    canceladosUltimos30,
    vencendoProximos30,
    vencidos,
  ] = await Promise.all([
    prisma.aluno.count({ where: { deletedAt: null } }),
    prisma.aluno.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.aluno.groupBy({
      by: ['trilha'],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.aluno.count({
      where: { deletedAt: null, createdAt: { gte: trintaDiasAtras } },
    }),
    prisma.aluno.count({
      where: {
        deletedAt: null,
        status: 'cancelado',
        updatedAt: { gte: trintaDiasAtras },
      },
    }),
    prisma.aluno.count({
      where: {
        deletedAt: null,
        dataVencimento: { gte: now, lte: trintaDiasAFrente },
      },
    }),
    prisma.aluno.count({
      where: { deletedAt: null, dataVencimento: { lt: now } },
    }),
  ]);

  // Normaliza groupBy para Record<string, number>
  const statusMap = Object.fromEntries(
    porStatus.map((s) => [s.status, s._count._all]),
  );
  const trilhaMap = Object.fromEntries(
    porTrilha.map((t) => [t.trilha, t._count._all]),
  );

  res.json({
    total,
    novosUltimos30,
    canceladosUltimos30,
    vencendoProximos30,
    vencidos,
    status: {
      ativo: statusMap.ativo ?? 0,
      pausado: statusMap.pausado ?? 0,
      cancelado: statusMap.cancelado ?? 0,
    },
    trilha: {
      saindo_da_divida: trilhaMap.saindo_da_divida ?? 0,
      fazendo_sobrar_dinheiro: trilhaMap.fazendo_sobrar_dinheiro ?? 0,
      montando_reserva: trilhaMap.montando_reserva ?? 0,
      construindo_patrimonio: trilhaMap.construindo_patrimonio ?? 0,
    },
    geradoEm: now.toISOString(),
  });
});

export default router;

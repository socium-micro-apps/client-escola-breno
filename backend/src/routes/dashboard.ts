import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const router = Router();

router.use(requireAuth);

router.get('/stats', async (_req, res) => {
  const now = new Date();
  const trintaDiasAtras = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trintaDiasAFrente = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const sessentaDiasAtras = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    total,
    porStatus,
    porTrilha,
    novosUltimos30,
    canceladosUltimos30,
    vencendoProximos30,
    vencidos,
    receitaAtivos,
    semContatoHa60d,
    lgpdAbertos,
    lgpdVencidos,
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
    // ARR = soma de valorAnualCentavos de ativos não-deletados
    prisma.aluno.aggregate({
      where: { deletedAt: null, status: 'ativo' },
      _sum: { valorAnualCentavos: true },
    }),
    // Alunos ativos sem contato há > 60 dias (ou nunca)
    prisma.aluno.count({
      where: {
        deletedAt: null,
        status: 'ativo',
        OR: [
          { ultimoContatoEm: null },
          { ultimoContatoEm: { lt: sessentaDiasAtras } },
        ],
      },
    }),
    prisma.lgpdRequest.count({
      where: { status: { in: ['recebido', 'em_andamento'] } },
    }),
    prisma.lgpdRequest.count({
      where: {
        status: { in: ['recebido', 'em_andamento'] },
        dueAt: { lt: now },
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    porStatus.map((s) => [s.status, s._count._all]),
  );
  const trilhaMap = Object.fromEntries(
    porTrilha.map((t) => [t.trilha, t._count._all]),
  );

  const arrCentavos = receitaAtivos._sum.valorAnualCentavos ?? 0;
  const mrrCentavos = Math.round(arrCentavos / 12);

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
    financeiro: {
      arrCentavos,
      mrrCentavos,
      ticketMedioCentavos: statusMap.ativo > 0 ? Math.round(arrCentavos / statusMap.ativo) : 0,
    },
    atencao: {
      semContatoHa60d,
      lgpdAbertos,
      lgpdVencidos,
    },
    geradoEm: now.toISOString(),
  });
});

// =============================================================================
// GET /api/dashboard/cohort — retenção por mês de matrícula (ADR 0014)
// =============================================================================
router.get('/cohort', async (_req, res) => {
  // Agrega por mês de dataInicio. Postgres date_trunc.
  const rows = await prisma.$queryRaw<
    Array<{ cohort: Date; total: bigint; ativos: bigint }>
  >`
    SELECT
      date_trunc('month', "dataInicio") AS cohort,
      COUNT(*)::bigint AS total,
      SUM(CASE WHEN status = 'ativo' AND "deletedAt" IS NULL THEN 1 ELSE 0 END)::bigint AS ativos
    FROM aluno
    WHERE "deletedAt" IS NULL OR status != 'ativo'
    GROUP BY date_trunc('month', "dataInicio")
    ORDER BY cohort DESC
    LIMIT 24
  `;

  const cohorts = rows.map((r) => {
    const total = Number(r.total);
    const ativos = Number(r.ativos);
    return {
      cohort: r.cohort.toISOString().slice(0, 7), // YYYY-MM
      total,
      ativos,
      retidos: ativos,
      pctRetencao: total > 0 ? Math.round((ativos / total) * 100) : 0,
    };
  });

  res.json({ cohorts, geradoEm: new Date().toISOString() });
});

export default router;

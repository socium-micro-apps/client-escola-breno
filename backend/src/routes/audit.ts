import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';

const router = Router();

router.use(requireAuth);

const loginQuerySchema = z.object({
  success: z.union([z.literal('true'), z.literal('false'), z.literal('all')]).optional().default('all'),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(50),
});

// =============================================================================
// GET /api/audit/login — histórico de tentativas de login. ADR 0013.
// =============================================================================
router.get('/login', validate(loginQuerySchema, 'query'), async (req, res) => {
  const { success, page, pageSize } = req.query as unknown as z.infer<typeof loginQuerySchema>;

  const where =
    success === 'true' ? { success: true } : success === 'false' ? { success: false } : {};

  const [items, total, sucessos24h, falhas24h] = await Promise.all([
    prisma.loginAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.loginAttempt.count({ where }),
    prisma.loginAttempt.count({
      where: {
        success: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.loginAttempt.count({
      where: {
        success: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  res.json({
    items: items.map((a) => ({
      id: a.id,
      email: a.email,
      ip: a.ip,
      userAgent: a.userAgent,
      success: a.success,
      reason: a.reason,
      createdAt: a.createdAt.toISOString(),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    summary: { sucessos24h, falhas24h },
  });
});

export default router;

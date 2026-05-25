import {
  acceptInviteSchema,
  inviteAdminSchema,
  updateAdminRoleSchema,
  type AdminDTO,
  type AdminInviteDTO,
  type AcceptInviteInput,
  type InviteAdminInput,
} from '@escola/shared';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/role.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';

const router = Router();

const idParam = z.object({ id: z.string().uuid('id inválido') });

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_COST = 10;

function toAdminDTO(a: {
  id: string;
  email: string;
  role: 'super_admin' | 'operacao' | 'leitura';
  createdAt: Date;
}): AdminDTO {
  return {
    id: a.id,
    email: a.email,
    role: a.role,
    createdAt: a.createdAt.toISOString(),
  };
}

function toInviteDTO(
  i: {
    id: string;
    email: string;
    role: 'super_admin' | 'operacao' | 'leitura';
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
    createdBy: { email: string } | null;
  },
  includeToken?: string,
): AdminInviteDTO & { token?: string; link?: string } {
  const dto: AdminInviteDTO & { token?: string; link?: string } = {
    id: i.id,
    email: i.email,
    role: i.role,
    createdByEmail: i.createdBy?.email ?? null,
    createdAt: i.createdAt.toISOString(),
    expiresAt: i.expiresAt.toISOString(),
    acceptedAt: i.acceptedAt?.toISOString() ?? null,
    expirado: i.acceptedAt === null && i.expiresAt.getTime() < Date.now(),
  };
  if (includeToken) {
    dto.token = includeToken;
    dto.link = `/admin-convite/${includeToken}`;
  }
  return dto;
}

// =============================================================================
// GET /api/admins — lista admins ativos + convites pendentes
// =============================================================================
router.get('/', requireAuth, requireRole('super_admin'), async (_req, res) => {
  const [admins, invites] = await Promise.all([
    prisma.admin.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.adminInvite.findMany({
      where: { acceptedAt: null },
      include: { createdBy: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  res.json({
    admins: admins.map(toAdminDTO),
    invitesPendentes: invites.map((i) => toInviteDTO(i)),
  });
});

// =============================================================================
// PATCH /api/admins/:id/role — promove/rebaixa um admin
// =============================================================================
router.patch(
  '/:id/role',
  requireAuth,
  requireRole('super_admin'),
  validate(idParam, 'params'),
  validate(updateAdminRoleSchema),
  async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const { role } = req.body as { role: 'super_admin' | 'operacao' | 'leitura' };

    if (id === req.user!.id) {
      res.status(409).json({
        error: 'conflict',
        message: 'Você não pode alterar seu próprio papel',
      });
      return;
    }

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: 'not_found', message: 'Admin não encontrado' });
      return;
    }

    const updated = await prisma.admin.update({ where: { id }, data: { role } });
    res.json(toAdminDTO(updated));
  },
);

// =============================================================================
// DELETE /api/admins/:id — remove admin (não permite remover o último super_admin)
// =============================================================================
router.delete(
  '/:id',
  requireAuth,
  requireRole('super_admin'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as unknown as { id: string };

    if (id === req.user!.id) {
      res.status(409).json({ error: 'conflict', message: 'Você não pode remover a si mesmo' });
      return;
    }

    const target = await prisma.admin.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: 'not_found', message: 'Admin não encontrado' });
      return;
    }

    if (target.role === 'super_admin') {
      const superCount = await prisma.admin.count({ where: { role: 'super_admin' } });
      if (superCount <= 1) {
        res.status(409).json({
          error: 'conflict',
          message: 'Não é possível remover o último super_admin',
        });
        return;
      }
    }

    await prisma.admin.delete({ where: { id } });
    res.status(204).send();
  },
);

// =============================================================================
// POST /api/admins/invites — cria convite, retorna link com token (única vez)
// =============================================================================
router.post(
  '/invites',
  requireAuth,
  requireRole('super_admin'),
  validate(inviteAdminSchema),
  async (req, res) => {
    const input = req.body as InviteAdminInput;
    const adminId = req.user!.id;

    const existingAdmin = await prisma.admin.findUnique({ where: { email: input.email } });
    if (existingAdmin) {
      res.status(409).json({ error: 'conflict', message: 'Já existe admin com esse e-mail' });
      return;
    }

    const pendingInvite = await prisma.adminInvite.findFirst({
      where: { email: input.email, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pendingInvite) {
      res
        .status(409)
        .json({ error: 'conflict', message: 'Já existe convite pendente para esse e-mail' });
      return;
    }

    // Gera token cru (32 bytes hex = 64 chars), guarda só o hash
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(token, BCRYPT_COST);

    const invite = await prisma.adminInvite.create({
      data: {
        email: input.email,
        role: input.role,
        tokenHash,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        createdById: adminId,
      },
      include: { createdBy: { select: { email: true } } },
    });

    // Token cru exibido apenas na resposta da criação
    res.status(201).json(toInviteDTO(invite, token));
  },
);

// =============================================================================
// DELETE /api/admins/invites/:id — revoga convite pendente
// =============================================================================
router.delete(
  '/invites/:id',
  requireAuth,
  requireRole('super_admin'),
  validate(idParam, 'params'),
  async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const invite = await prisma.adminInvite.findUnique({ where: { id } });
    if (!invite) {
      res.status(404).json({ error: 'not_found', message: 'Convite não encontrado' });
      return;
    }
    if (invite.acceptedAt !== null) {
      res.status(409).json({ error: 'conflict', message: 'Convite já foi aceito' });
      return;
    }
    await prisma.adminInvite.delete({ where: { id } });
    res.status(204).send();
  },
);

// =============================================================================
// GET /api/admins/invites/:token — valida sem aceitar (preview da página de aceite)
// SEM requireAuth — é o convidado abrindo o link
// =============================================================================
router.get('/invites/:token', async (req, res) => {
  const token = req.params.token;
  if (!token || token.length < 32) {
    res.status(400).json({ error: 'invalid_token', message: 'Token inválido' });
    return;
  }

  // Buscar todos os convites não aceitos e não expirados, testar bcrypt
  const candidates = await prisma.adminInvite.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
  });

  for (const inv of candidates) {
    if (await bcrypt.compare(token, inv.tokenHash)) {
      res.json({ email: inv.email, role: inv.role, expiresAt: inv.expiresAt.toISOString() });
      return;
    }
  }
  res.status(404).json({ error: 'not_found', message: 'Convite inválido ou expirado' });
});

// =============================================================================
// POST /api/admins/invites/:token/accept — aceita convite, cria admin
// SEM requireAuth — é o convidado finalizando
// =============================================================================
router.post('/invites/:token/accept', validate(acceptInviteSchema), async (req, res) => {
  const token = req.params.token;
  const { password } = req.body as AcceptInviteInput;

  const candidates = await prisma.adminInvite.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
  });

  let invite: (typeof candidates)[number] | null = null;
  for (const inv of candidates) {
    if (await bcrypt.compare(token, inv.tokenHash)) {
      invite = inv;
      break;
    }
  }

  if (!invite) {
    res.status(404).json({ error: 'not_found', message: 'Convite inválido ou expirado' });
    return;
  }

  // Cria admin + marca convite como aceito (transação)
  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.$transaction([
    prisma.admin.create({
      data: { email: invite.email, role: invite.role, passwordHash },
    }),
    prisma.adminInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  res.status(201).json({ email: invite.email });
});

export default router;

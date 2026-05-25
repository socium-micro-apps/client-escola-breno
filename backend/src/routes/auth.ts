import { loginSchema } from '@escola/shared';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../env.js';
import { AUTH_COOKIE_NAME, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'too_many_requests',
    message: 'Muitas tentativas. Tente novamente em alguns minutos.',
  },
});

function parseExpiresInToMs(value: string): number {
  const match = /^(\d+)([dhms])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  switch (match[2]) {
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'm': return n * 60 * 1000;
    case 's': return n * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
}

const cookieMaxAgeMs = parseExpiresInToMs(env.JWT_EXPIRES_IN);

async function recordLoginAttempt(
  email: string,
  ip: string | undefined,
  userAgent: string | undefined,
  success: boolean,
  reason?: string,
): Promise<void> {
  try {
    await prisma.loginAttempt.create({
      data: {
        email,
        ip: ip ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
        success,
        reason: reason ?? null,
      },
    });
  } catch {
    // Swallow — não queremos que falha de log atrapalhe login
  }
}

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
  const userAgent = req.headers['user-agent'];

  const NEUTRAL_ERROR = { error: 'invalid_credentials', message: 'Credenciais inválidas' };

  const admin = await prisma.admin.findUnique({ where: { email } });
  if (!admin) {
    await recordLoginAttempt(email, ip, userAgent, false, 'user_not_found');
    res.status(401).json(NEUTRAL_ERROR);
    return;
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    await recordLoginAttempt(email, ip, userAgent, false, 'wrong_password');
    res.status(401).json(NEUTRAL_ERROR);
    return;
  }

  await recordLoginAttempt(email, ip, userAgent, true);

  const token = jwt.sign(
    { sub: admin.id, email: admin.email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] },
  );

  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: cookieMaxAgeMs,
    path: '/',
  });

  res.json({ id: admin.id, email: admin.email });
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user!.id, email: req.user!.email });
});

export default router;

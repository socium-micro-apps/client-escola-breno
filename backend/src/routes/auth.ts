import { loginSchema } from '@escola/shared';
import bcrypt from 'bcrypt';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { env, isProd } from '../env.js';
import { AUTH_COOKIE_NAME, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { prisma } from '../prisma.js';

const router = Router();

// Rate limit explícito para login — mitiga brute force. Ver ADR 0004.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15min
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests', message: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

function parseExpiresInToMs(value: string): number {
  // Suporta sufixos d, h, m, s. Default: 7 dias.
  const match = /^(\d+)([dhms])$/.exec(value);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  switch (match[2]) {
    case 'd': return n * 24 * 60 * 60 * 1000;
    case 'h': return n * 60 * 60 * 1000;
    case 'm': return n * 60 * 1000;
    case 's': return n * 1000;
    default: return 7 * 24 * 60 * 60 * 1000;
  }
}

const cookieMaxAgeMs = parseExpiresInToMs(env.JWT_EXPIRES_IN);

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  const admin = await prisma.admin.findUnique({ where: { email } });

  // Mensagem neutra: não distingue "usuário não existe" de "senha errada". ADR 0006.
  const NEUTRAL_ERROR = { error: 'invalid_credentials', message: 'Credenciais inválidas' };

  if (!admin) {
    res.status(401).json(NEUTRAL_ERROR);
    return;
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    res.status(401).json(NEUTRAL_ERROR);
    return;
  }

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

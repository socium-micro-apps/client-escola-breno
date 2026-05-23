import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

interface JwtPayload {
  sub: string;
  email: string;
}

export const AUTH_COOKIE_NAME = 'auth';

/**
 * Middleware que exige autenticação. Lê o JWT do cookie httpOnly.
 * Em caso de ausência ou inválido, retorna 401.
 * Anexa req.user com { id, email } quando válido.
 *
 * Ver ADR 0003 (RBAC 1 papel) e ADR 0004 (auth).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[AUTH_COOKIE_NAME];
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'unauthorized', message: 'Não autenticado' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Sessão inválida' });
  }
}

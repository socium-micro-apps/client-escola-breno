// requireRole — middleware ortogonal a requireAuth.
// Use APÓS requireAuth. Consulta o role do admin no DB.

import type { NextFunction, Request, Response } from 'express';
import type { AdminRole } from '@escola/shared';
import { prisma } from '../prisma.js';

export function requireRole(...allowed: AdminRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthorized', message: 'Não autenticado' });
      return;
    }
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    if (!admin) {
      res.status(401).json({ error: 'unauthorized', message: 'Sessão inválida' });
      return;
    }
    if (!allowed.includes(admin.role)) {
      res.status(403).json({
        error: 'forbidden',
        message: 'Você não tem permissão para esta ação',
      });
      return;
    }
    next();
  };
}

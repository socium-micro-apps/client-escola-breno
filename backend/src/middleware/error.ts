import type { NextFunction, Request, Response } from 'express';
import { logger } from '../logger.js';
import { isProd } from '../env.js';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'not_found', message: 'Rota não encontrada' });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: 'internal_server_error',
    message: isProd ? 'Algo deu errado' : (err instanceof Error ? err.message : 'Erro desconhecido'),
  });
}

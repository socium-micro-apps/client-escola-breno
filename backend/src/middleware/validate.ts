import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Middleware que valida o source da request com um schema Zod.
 * Em caso de erro, retorna 400 com lista de erros estruturada.
 * Em caso de sucesso, substitui req[source] pelo valor parseado (com transforms aplicados).
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // @ts-expect-error — sobrescrita intencional para receber o valor transformado.
      req[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'validation_error',
          message: 'Dados inválidos',
          details: err.flatten().fieldErrors,
        });
        return;
      }
      next(err);
    }
  };
}

import pino from 'pino';
import { env, isProd } from './env.js';

/**
 * Logger Pino com redaction de PII.
 * Ver ADR 0006.
 *
 * Campos sensíveis são mascarados em qualquer caminho de log (req.body.cpf,
 * req.headers.authorization, etc) — incluindo objetos aninhados.
 */
export const logger = pino({
  level: isProd ? 'info' : 'debug',
  ...(env.LOG_FORMAT === 'text' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
  redact: {
    paths: [
      'password',
      'senha',
      'cpf',
      'email',
      'telefone',
      'phone',
      'token',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.senha',
      'req.body.cpf',
      'req.body.email',
      'req.body.telefone',
      'res.headers["set-cookie"]',
      '*.password',
      '*.senha',
      '*.cpf',
      '*.email',
      '*.telefone',
      '*.passwordHash',
    ],
    censor: '[REDACTED]',
  },
});

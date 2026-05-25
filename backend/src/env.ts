import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Em docker, vars vêm do compose env. Em local, tenta backend/.env e depois root .env.
// dotenv não sobrescreve process.env existente — seguro em ambos os cenários.
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Lista de valores placeholder conhecidos que NÃO podem rodar em produção.
// Se algum bate, falha boot — proteção contra deploy com .env não-editado.
const FORBIDDEN_JWT_SECRETS = new Set([
  '',
  'change-me-in-production',
  'change-me-in-production-please',
  'dev-jwt-secret-change-me',
  'dev-jwt-secret',
  'GERAR_SECRET_FORTE_AQUI',
  'CHANGE_ME',
]);

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z
    .string({ required_error: 'JWT_SECRET é obrigatório' })
    .min(16, 'JWT_SECRET precisa ter ao menos 16 chars')
    .refine((v) => !FORBIDDEN_JWT_SECRETS.has(v), {
      message: 'JWT_SECRET é um placeholder conhecido — gere um valor real',
    }),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5174'),
  LOG_FORMAT: z.enum(['text', 'json']).default('text'),
  // Bootstrap: opcionais. Sem eles, o seed pula a criação do admin inicial
  // (admins reais devem ser convidados via /admins).
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(8, 'SEED_ADMIN_PASSWORD precisa ter ao menos 8 chars').optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuração inválida:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

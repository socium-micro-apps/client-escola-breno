-- v4: perfil rico + multi-admin + checklist da trilha (ADR 0014)
-- Migration aditiva.

-- ---- Enums novos ------------------------------------------------------------
CREATE TYPE "admin_role" AS ENUM (
  'super_admin',
  'operacao',
  'leitura'
);

CREATE TYPE "origem_canal" AS ENUM (
  'instagram',
  'youtube',
  'indicacao',
  'evento_presencial',
  'busca_organica',
  'anuncio_pago',
  'outro'
);

-- ---- Admin: role ------------------------------------------------------------
ALTER TABLE "admin"
  ADD COLUMN "role" "admin_role" NOT NULL DEFAULT 'super_admin';
-- Admin pré-existente vira super_admin (não há outros admins ainda).
-- Próximos convites usarão default 'operacao' via Prisma.
ALTER TABLE "admin" ALTER COLUMN "role" SET DEFAULT 'operacao';

-- ---- AdminInvite ------------------------------------------------------------
CREATE TABLE "admin_invite" (
  "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
  "email"       VARCHAR(254) NOT NULL,
  "role"        "admin_role" NOT NULL,
  "tokenHash"   TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "acceptedAt"  TIMESTAMP(3),
  "createdById" UUID NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_invite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_invite_email_acceptedAt_idx" ON "admin_invite"("email", "acceptedAt");
CREATE INDEX "admin_invite_expiresAt_idx" ON "admin_invite"("expiresAt");

ALTER TABLE "admin_invite"
  ADD CONSTRAINT "admin_invite_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- Aluno: perfil rico + métricas + progresso ------------------------------
ALTER TABLE "aluno"
  ADD COLUMN "avatarUrl"               VARCHAR(500),
  ADD COLUMN "origemCanal"             "origem_canal",
  ADD COLUMN "origemDetalhe"           VARCHAR(200),
  ADD COLUMN "cidade"                  VARCHAR(80),
  ADD COLUMN "profissao"               VARCHAR(80),
  ADD COLUMN "aniversario"             TIMESTAMP(3),
  ADD COLUMN "totalLogins"             INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "ultimoLoginEm"           TIMESTAMP(3),
  ADD COLUMN "progressoItensCompletos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "aluno_origemCanal_idx" ON "aluno"("origemCanal");

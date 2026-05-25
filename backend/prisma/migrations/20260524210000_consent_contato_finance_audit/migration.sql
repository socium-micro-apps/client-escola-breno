-- v3: consent + contato + finance + login audit + LGPD requests (ADR 0013)
-- Migration aditiva — preserva dados existentes.

-- ---- Novos enums ------------------------------------------------------------
CREATE TYPE "canal_contato" AS ENUM (
  'whatsapp',
  'telefone',
  'email',
  'presencial',
  'outro'
);

CREATE TYPE "lgpd_request_type" AS ENUM (
  'acesso',
  'retificacao',
  'apagamento',
  'portabilidade',
  'oposicao'
);

CREATE TYPE "lgpd_request_status" AS ENUM (
  'recebido',
  'em_andamento',
  'concluido',
  'rejeitado'
);

-- ---- Aluno: extensões -------------------------------------------------------
ALTER TABLE "aluno"
  ADD COLUMN "valorAnualCentavos" INTEGER NOT NULL DEFAULT 29880,
  ADD COLUMN "consentEmail" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "consentWhatsapp" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "consentOfertas" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "termsAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "ultimoContatoEm" TIMESTAMP(3),
  ADD COLUMN "ultimoContatoCanal" "canal_contato",
  ADD COLUMN "ultimoContatoNota" VARCHAR(500);

CREATE INDEX "aluno_ultimoContatoEm_idx" ON "aluno"("ultimoContatoEm");

-- ---- AuditAction: adiciona 'contact' ----------------------------------------
ALTER TYPE "audit_action" ADD VALUE 'contact';

-- ---- LoginAttempt -----------------------------------------------------------
CREATE TABLE "login_attempt" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "email"     VARCHAR(254) NOT NULL,
  "ip"        VARCHAR(45),
  "userAgent" VARCHAR(500),
  "success"   BOOLEAN NOT NULL,
  "reason"    VARCHAR(60),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_attempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_attempt_email_createdAt_idx" ON "login_attempt"("email", "createdAt");
CREATE INDEX "login_attempt_createdAt_idx" ON "login_attempt"("createdAt");

-- ---- LgpdRequest ------------------------------------------------------------
CREATE TABLE "lgpd_request" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
  "alunoId"          UUID,
  "requesterEmail"   VARCHAR(254) NOT NULL,
  "requesterCpf"     VARCHAR(11),
  "type"             "lgpd_request_type" NOT NULL,
  "status"           "lgpd_request_status" NOT NULL DEFAULT 'recebido',
  "receivedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueAt"            TIMESTAMP(3) NOT NULL,
  "completedAt"      TIMESTAMP(3),
  "notes"            VARCHAR(1000),
  "handledByAdminId" UUID,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lgpd_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lgpd_request_status_dueAt_idx" ON "lgpd_request"("status", "dueAt");
CREATE INDEX "lgpd_request_alunoId_idx" ON "lgpd_request"("alunoId");

ALTER TABLE "lgpd_request"
  ADD CONSTRAINT "lgpd_request_alunoId_fkey"
    FOREIGN KEY ("alunoId") REFERENCES "aluno"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "lgpd_request_handledByAdminId_fkey"
    FOREIGN KEY ("handledByAdminId") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

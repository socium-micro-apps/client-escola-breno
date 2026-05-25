-- Realinhamento ao produto real (ADR 0012)
-- Migração assume tabela aluno vazia (dados eram seed; re-seed reidrata).

-- ---- Enum Plano: drop basic/premium, keep anual only ------------------------
ALTER TYPE "plano" RENAME TO "plano_old";
CREATE TYPE "plano" AS ENUM ('anual');
ALTER TABLE "aluno" ALTER COLUMN "plano" DROP DEFAULT;
ALTER TABLE "aluno" ALTER COLUMN "plano" TYPE "plano" USING ('anual'::"plano");
ALTER TABLE "aluno" ALTER COLUMN "plano" SET DEFAULT 'anual';
DROP TYPE "plano_old";

-- ---- Enum Trilha ------------------------------------------------------------
CREATE TYPE "trilha" AS ENUM (
  'saindo_da_divida',
  'fazendo_sobrar_dinheiro',
  'montando_reserva',
  'construindo_patrimonio'
);

-- ---- Enum AuditAction -------------------------------------------------------
CREATE TYPE "audit_action" AS ENUM (
  'create',
  'update',
  'delete',
  'restore',
  'anonymize'
);

-- ---- Aluno: novas colunas ---------------------------------------------------
ALTER TABLE "aluno"
  ADD COLUMN "dataInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "dataVencimento" TIMESTAMP(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 year'),
  ADD COLUMN "renovacaoAutomatica" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "trilha" "trilha" NOT NULL DEFAULT 'saindo_da_divida',
  ADD COLUMN "anonymizedAt" TIMESTAMP(3);

-- Após a coluna existir, remove o default da dataVencimento para que
-- aplicações forneçam o valor explicitamente (controle de assinatura).
ALTER TABLE "aluno" ALTER COLUMN "dataVencimento" DROP DEFAULT;

CREATE INDEX "aluno_trilha_idx" ON "aluno"("trilha");
CREATE INDEX "aluno_dataVencimento_idx" ON "aluno"("dataVencimento");

-- ---- AuditEvent: nova tabela ------------------------------------------------
CREATE TABLE "audit_event" (
  "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
  "alunoId"   UUID NOT NULL,
  "adminId"   UUID,
  "action"    "audit_action" NOT NULL,
  "before"    JSONB,
  "after"     JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_event_alunoId_createdAt_idx" ON "audit_event"("alunoId", "createdAt");
CREATE INDEX "audit_event_adminId_idx" ON "audit_event"("adminId");

ALTER TABLE "audit_event"
  ADD CONSTRAINT "audit_event_alunoId_fkey"
    FOREIGN KEY ("alunoId") REFERENCES "aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "audit_event_adminId_fkey"
    FOREIGN KEY ("adminId") REFERENCES "admin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

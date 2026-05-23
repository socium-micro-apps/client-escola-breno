-- CreateEnum
CREATE TYPE "plano" AS ENUM ('basic', 'premium');

-- CreateEnum
CREATE TYPE "status_aluno" AS ENUM ('ativo', 'pausado', 'cancelado');

-- CreateTable
CREATE TABLE "admin" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aluno" (
    "id" UUID NOT NULL,
    "nome" VARCHAR(120) NOT NULL,
    "email" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "telefone" VARCHAR(11) NOT NULL,
    "plano" "plano" NOT NULL,
    "status" "status_aluno" NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "aluno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "aluno_email_key" ON "aluno"("email");

-- CreateIndex
CREATE UNIQUE INDEX "aluno_cpf_key" ON "aluno"("cpf");

-- CreateIndex
CREATE INDEX "aluno_deletedAt_idx" ON "aluno"("deletedAt");

-- CreateIndex
CREATE INDEX "aluno_status_idx" ON "aluno"("status");

-- CreateIndex
CREATE INDEX "aluno_plano_idx" ON "aluno"("plano");

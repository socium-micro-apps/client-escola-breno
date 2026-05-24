# =============================================================================
# Backend Dockerfile — multistage
# Build context = raiz do monorepo (para acessar packages/shared)
# =============================================================================

# ---- builder ----------------------------------------------------------------
FROM node:20-alpine AS builder

# OpenSSL para Prisma engine
RUN apk add --no-cache openssl

WORKDIR /repo

# Copia manifests + lockfile primeiro (cache de deps)
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/

# Instala todas as workspaces (frontend incluso — mais lento mas evita
# inconsistência de versões; trade-off aceito para um case)
RUN npm ci --no-audit --no-fund --ignore-scripts

# Copia código
COPY packages/shared ./packages/shared
COPY backend ./backend

# Gera o Prisma Client (rodando de dentro do workspace pra schema ser resolvido)
WORKDIR /repo/backend
RUN npx prisma generate
WORKDIR /repo

# ---- runtime ----------------------------------------------------------------
FROM node:20-alpine AS runtime

RUN apk add --no-cache openssl dumb-init

WORKDIR /app

ENV NODE_ENV=production

# Copia node_modules da raiz (npm workspaces hoists) e os workspaces
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/packages ./packages
COPY --from=builder /repo/backend ./backend

WORKDIR /app/backend

EXPOSE 3000

# dumb-init forwarda sinais corretamente (SIGTERM -> graceful shutdown)
# Em prod, prisma migrate deploy aplica migrations, seed roda (idempotente).
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy --schema=prisma/schema.prisma && npx tsx prisma/seed.ts && npx tsx src/server.ts"]

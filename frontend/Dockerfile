# =============================================================================
# Frontend Dockerfile — multistage
# Build context = raiz do monorepo (para acessar packages/shared)
# =============================================================================

# ---- builder ----------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /repo

# Build-arg: URL da API em runtime (injetada no bundle Vite em build-time)
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

COPY package.json package-lock.json tsconfig.base.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --no-audit --no-fund --ignore-scripts

COPY packages/shared ./packages/shared
COPY frontend ./frontend

RUN npm --workspace frontend run build

# ---- runtime ----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# SPA: fallback para index.html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

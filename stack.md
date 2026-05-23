# Stack — Adaptação para o Case Escola do Breno

> Versão adaptada do `pasta inicial/PrefferedStack/stack-reference.md` para o escopo deste case.
>
> **Princípio da adaptação:** mudou **apenas o que o brief torna obrigatório mudar**. Itens opcionais do stack-reference permanecem disponíveis e listados — alguns aparecem marcados como **não utilizados neste case** quando o escopo não justifica, mas a referência da casa não é alterada.
>
> Mudanças obrigatórias (justificadas em ADR):
> 1. **Multi-tenancy removido** — domínio do case tem 1 escola, 1 admin. Não há conceito de tenant.
> 2. **RBAC simplificado** — 1 papel (`ADMIN`) em vez dos 4 do stack-reference (PLATFORM_ADMIN / TENANT_ADMIN / MANAGER / COLLABORATOR).
> 3. **Seção de PII adicionada** — brief avalia explicitamente tratamento de dados sensíveis (CPF, e-mail, telefone). A casa não tinha seção dedicada; este case exige.
>
> Tudo que não está nesta lista vem do stack-reference original sem alteração.

---

## Visão Geral

| Camada | Tecnologia | Status neste case |
|---|---|---|
| Monorepo | npm workspaces + Turbo | mantido |
| Backend | Node.js 18 + Express + Prisma + PostgreSQL | mantido |
| Frontend | React 18 + Vite + Tailwind + Radix UI | mantido |
| Banco | PostgreSQL 16 (Docker) | mantido |
| Cache/Filas | Redis 7 + BullMQ | **não utilizado** (sem jobs/workflows — fora do escopo do brief) |
| Storage | MinIO (dev) / AWS S3 (prod) | **não utilizado** (sem uploads no escopo) |
| Testes BE | Jest + jest-mock-extended | mantido |
| Testes FE | Vitest + Playwright + Storybook | mantido como opcional (UI fora do escopo de avaliação) |
| Auth | JWT (jsonwebtoken) | mantido — **role único: `ADMIN`** |
| Validação | Zod | mantido |
| Autorização | CASL | **opcional** (1 papel não justifica o overhead; middleware simples basta — decisão de ADR) |
| Monitoramento | Sentry (noop sem DSN) + Pino | mantido (Sentry segue noop sem DSN, Pino com **redação de PII** — ver §PII) |

---

## Estrutura de Pastas

```
/
├── backend/          # API Express
├── frontend/         # SPA React
├── packages/
│   ├── shared/       # @escola/shared — schemas Zod compartilhados (aluno, auth)
│   └── eslint-plugin/# opcional — manter se houver regras úteis ao case
├── docker-compose.yml
├── turbo.json
└── package.json      # npm workspaces root
```

Sem mudanças estruturais. `packages/eslint-plugin` permanece opcional como no stack-reference.

---

## Backend

### Dependências de Produção

Lista do stack-reference mantida na íntegra. Marcações abaixo indicam apenas o que **este case** usa ou não — tudo continua disponível:

| Pacote | Versão | Propósito | Neste case |
|---|---|---|---|
| `express` | ^4.19.2 | Framework HTTP | usado |
| `@prisma/client` | ^5.22.0 | ORM | usado |
| `zod` | ^3.23.8 | Validação de schemas | usado |
| `jsonwebtoken` | ^9.0.2 | JWT auth | usado |
| `bcrypt` | ^5.1.1 | Hash de senhas | usado (admin seed) |
| `@casl/ability` + `@casl/prisma` | ^6.8 / ^1.6 | Autorização | **opcional** (1 papel — ADR decide) |
| `bullmq` | ^5.76.3 | Filas de background jobs | não utilizado |
| `ioredis` | ^5.10.1 | Cliente Redis | não utilizado |
| `@aws-sdk/client-s3` | ^3.1038 | Upload S3/MinIO | não utilizado |
| `@aws-sdk/s3-request-presigner` | ^3.1038 | URLs presignadas | não utilizado |
| `helmet` | ^8.1.0 | Headers de segurança | usado |
| `express-rate-limit` | ^8.3.1 | Rate limiting | usado (rota de login) |
| `hpp` | ^0.2.3 | HTTP Parameter Pollution | usado |
| `cors` | ^2.8.6 | CORS | usado |
| `cookie-parser` | ^1.4.7 | Cookies | usado (JWT em cookie httpOnly) |
| `pino` + `pino-http` | ^10.3 / ^11 | Logging estruturado | usado **com redaction de PII** |
| `pino-pretty` | ^13.1.3 | Log legível em dev | usado |
| `@sentry/node` | ^7.120.4 | Monitoramento de erros | mantido (noop sem DSN) |
| `@godaddy/terminus` | ^4.12.1 | Graceful shutdown | usado |
| `dotenv` | ^16.4.5 | Variáveis de ambiente | usado |

### Dependências de Desenvolvimento

Sem alteração em relação ao stack-reference.

### Scripts

Sem alteração.

---

## Frontend

### Dependências de Produção

Lista do stack-reference mantida. Itens marcados como **não utilizados neste case** referem-se a features fora do escopo (rich text, PDF, DnD, etc.) — continuam disponíveis se a decisão mudar, ficam fora do bundle se não importados.

Núcleo usado: `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `zustand` (mínimo — só auth state), `zod`, `react-hook-form`, `@hookform/resolvers`, `tailwindcss`, `tailwind-merge`, `tailwindcss-animate`, `class-variance-authority`, `clsx`, `lucide-react`, `sonner`, `date-fns`, `focus-trap-react`.

Radix UI: usados ao menos `dialog`, `dropdown-menu`, `label`, `select`, `tooltip`, `slot`. O resto disponível.

Não utilizados neste case (mantidos disponíveis): Tiptap, DnD-Kit, `react-pdf`, `recharts`, `react-markdown`, `cmdk`, `canvas-confetti`, `react-day-picker`, `isomorphic-dompurify`, `@casl/react`.

### Dependências de Desenvolvimento

Sem alteração. **Storybook, Playwright, LHCI permanecem disponíveis mas não são utilizados** (brief: UI fora do escopo de avaliação, testes de componente não exigidos).

### Scripts

Sem alteração.

---

## Infraestrutura (Docker Compose)

Mínimo obrigatório para o case: **Postgres**. Redis e MinIO permanecem documentados como do stack-reference, mas **não entram no compose** deste case para honrar `docker compose up` enxuto.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: escola_dev
```

> Caso futuro precise: copiar `redis` e `minio` do stack-reference original sem alteração.

---

## Variáveis de Ambiente (Backend)

Conjunto **mínimo necessário** deste case (subset do stack-reference; nenhuma chave nova):

```env
# Database
DATABASE_URL="postgresql://admin:admin123@localhost:5432/escola_dev?schema=public"

# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
FRONTEND_URL=http://localhost:5173

# Logging
LOG_FORMAT=text   # text (dev) | json (prod)

# Monitoramento (opcional — noop sem DSN)
SENTRY_DSN=
SENTRY_TRACES_SAMPLE_RATE=0.1
```

Variáveis do stack-reference não utilizadas aqui (storage S3, Google, Teams, OAuth tokens, circuit breaker) — **permanecem na referência da casa**, ausentes deste case por irrelevância de escopo.

---

## Monorepo Root

Sem alteração em relação ao stack-reference (workspaces, scripts, concurrently, Turbo).

---

## Padrões Arquiteturais

### ~~Multi-tenancy~~ → **Single-tenant** (mudança obrigatória)

**Removido.** O domínio do case é uma escola única com um admin. Não há `tenantId` em registros, nem middleware de tenant, nem filtro por tenant em queries.

> Decisão registrada em ADR. Caso o produto evolua para multi-escola, retorna-se ao padrão da casa do stack-reference (row-level isolation por `tenantId`).

### Auth (ajustado)

- JWT armazenado em cookie `httpOnly` (não localStorage) — **mantido do stack-reference**
- Refresh token via endpoint dedicado — **opcional neste case** (sessão de 7 dias com expiração simples atende; ADR decide)
- **RBAC com 1 papel: `ADMIN`** (mudança obrigatória — em vez de PLATFORM_ADMIN / TENANT_ADMIN / MANAGER / COLLABORATOR)
- CASL **opcional** — para 1 papel, middleware de "está logado" é suficiente. ADR decide se vale o overhead da lib para demonstrar prática da casa, ou se simplifica.

### API

Sem alteração em relação ao stack-reference:

- REST com Express
- Zod para validação de input (body, params, query)
- Erros padronizados com status codes semânticos
- Rate limiting por rota sensível (login obrigatório)

### Frontend

Sem alteração em relação ao stack-reference (TanStack Query, Zustand minimal, RHF + Zod, Radix + Tailwind).

### Background Jobs — **não utilizado neste case**

Stack-reference mantém BullMQ + Redis disponíveis. Brief deste case lista jobs/workflows/triggers como **fora do escopo**. Sem alteração na referência da casa; apenas não usado aqui.

### Storage — **não utilizado neste case**

Stack-reference mantém abstração `STORAGE_DRIVER=fs|s3`. Brief deste case não tem uploads. Sem alteração na referência da casa; apenas não usado aqui.

### Logging (ajustado para PII)

Mantido Pino (JSON em prod, pretty em dev) + Pino-HTTP. **Adição obrigatória deste case:** redaction de PII via `pino.redact`. Detalhes em §PII.

### Monitoramento

Sem alteração em relação ao stack-reference. Sentry segue noop sem DSN.

---

## **PII Handling** (seção adicionada — exigência do brief)

Esta seção não existe no stack-reference da casa. O brief deste case avalia explicitamente **"como trata dados sensíveis (PII)"**. A inclusão aqui é obrigatória, e fixa o padrão deste case.

### Dados sensíveis no domínio

- **CPF** — alta sensibilidade (LGPD, identificador único nacional)
- **E-mail** — média sensibilidade (contato direto, identificador)
- **Telefone** — média sensibilidade
- **Nome** — sensibilidade média (combinado com os anteriores)

### Padrões obrigatórios

1. **Validação server-side rigorosa**
   - CPF: dígito verificador (não apenas formato)
   - E-mail: RFC + normalização (lowercase, trim)
   - Telefone: E.164 ou padrão BR normalizado

2. **Redação de PII em logs**
   - `pino.redact` configurado para mascarar `cpf`, `email`, `telefone`, `phone`, `password`, `senha`, `token`, `cookie`, `authorization` em qualquer caminho
   - Body de requests sensíveis (login, criar aluno, editar aluno) **não loga** payload bruto

3. **Mascaramento na resposta da API e na UI**
   - CPF em listagens: `***.***.123-45` por padrão
   - Revelar valor completo é ação intencional (botão "mostrar"), com confirmação se aplicável
   - Camada de serialização (DTO) garante que Prisma model nunca vaza cru

4. **Mensagens de erro neutras**
   - Login: "credenciais inválidas" (não "usuário não existe" / "senha errada")
   - Validação: mensagens técnicas sem reproduzir o valor sensível

5. **Cookies de sessão**
   - `httpOnly: true`
   - `secure: true` (em produção)
   - `sameSite: 'lax'`
   - `maxAge` alinhado a `JWT_EXPIRES_IN`

6. **Soft-delete + anonimização (decisão de ADR)**
   - Soft delete preserva integridade referencial
   - Política de anonimização do PII em registros deletados (zerar `cpf`, `email`, `telefone` após período definido) — registrada em ADR

7. **CPF no banco — decisão de ADR**
   - Opção A: texto único + validado + criptografia em coluna (pgcrypto)
   - Opção B: hash determinístico (busca/unicidade) + texto criptografado (exibição)
   - Opção C: texto único + validado, sem criptografia em repouso, com mascaramento na camada de aplicação e log
   - Decisão e justificativa de proporcionalidade em ADR

---

## URLs Locais (padrão neste case)

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000/api |
| Prisma Studio | http://localhost:5555 (opcional, dev) |

MinIO Console e Storybook do stack-reference: **não aplicáveis neste case**.

---

## Checklist (adaptado do stack-reference)

- [ ] Copiar `docker-compose.yml` (apenas Postgres) e subir infra
- [ ] Configurar `package.json` raiz com workspaces
- [ ] Criar `backend/` com Express + Prisma + Zod
- [ ] Criar `frontend/` com Vite + React + Tailwind + Radix
- [ ] Criar `packages/shared/` para schemas Zod compartilhados (aluno, auth)
- [ ] Configurar `tsconfig.json` em cada workspace
- [ ] Configurar ESLint com `@typescript-eslint` em ambos
- [ ] Copiar `.env.example` e gerar `JWT_SECRET`
- [ ] Rodar `prisma migrate dev` após definir schema inicial (aluno + admin)
- [ ] Rodar `prisma db seed` com 1 admin + alunos de exemplo
- [ ] Configurar `pino.redact` para PII (ver §PII)
- [ ] CORS revisado — `FRONTEND_URL` correto
- [ ] Testar `docker compose down -v && docker compose up` em estado limpo

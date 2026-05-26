# Escola do Breno — Painel Admin

Painel administrativo de gestão de alunos da Escola do Breno (case técnico para vaga de Dev Fullstack Sênior).

**🟢 Em produção:** https://escola-breno.app.socium-sf.com  
**📡 API:** https://api.escola-breno.app.socium-sf.com/api  
**📦 Repo:** https://github.com/socium-micro-apps/client-escola-breno

> Ferramenta de IA utilizada: **Claude Code** (Anthropic CLI, modelo `claude-opus-4-7` com contexto 1M). Workflow documentado em [`strategy.md`](./strategy.md) e nos ADRs.

---

## Setup em 1 comando

```bash
docker compose up
```

Sobe **Postgres + backend + frontend** (build incluído), aplica migrations, popula seed (1 admin + 8 alunos + 2 pedidos LGPD).

Para começar do **zero absoluto** (volumes apagados):

```bash
docker compose down -v && docker compose up
```

URLs locais:
- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:3000/api

> Nota: porta 5174 (não 5173) por conflito IPv6 com outro Vite que estava rodando na máquina de dev. Decisão pragmática.

---

## Acesso ao painel

### Local (após `docker compose up`)

| Campo | Valor (do seed) |
|---|---|
| URL | http://localhost:5174 |
| E-mail | `admin@escolabreno.com.br` |
| Senha | `admin123` |
| Papel | `super_admin` |

### Produção

| Usuário | E-mail | Senha | Papel |
|---|---|---|---|
| **Breno** | `breno@escolabreno.com.br` | `Breno!Senha2026` | `super_admin` |
| **Marcela** | `marcela@escolabreno.com.br` | `Marcela!Senha2026` | `operacao` * |
| **Avaliador** | `avaliador@escolabreno.com.br` | `Avaliador!Senha2026` | `super_admin` |
| **Operador** | `operador@escolabreno.com.br` | `OPERAD!Senha2026` | `operacao` |

\* Marcela foi promovida para `super_admin` em algum momento durante uso — verificável em `/admins`.

> **O usuário-default `admin@escolabreno.com.br` foi removido em produção** após avaliação de segurança (ver [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md)).

---

## Resumo do entregue

### ✅ Must-have do brief

| Item | Estado |
|---|---|
| Login admin | ✅ JWT em cookie httpOnly + bcrypt + rate limit |
| CRUD aluno (listar/criar/editar/apagar) | ✅ |
| Validação server-side de CPF (dígito), e-mail, telefone | ✅ Zod + validadores próprios |
| Testes de validação | ✅ 84 testes em `@escola/shared` |
| Testes de autorização | ✅ vitest + supertest no backend |
| `docker compose up` do zero | ✅ |
| README + CONTEXT.md + ≥ 2 ADRs | ✅ 15 ADRs |

### 🟡 Nice-to-have

| Item | Estado |
|---|---|
| Filtros e busca na listagem | ✅ busca por nome/email/CPF + filtros de status, trilha |
| Soft delete | ✅ com ADR justificando ([0008](./ADRs/pre-kick-off/0008-soft-delete.md)) |
| Lint configurado | ✅ ESLint em backend + frontend |
| Testes de API | ✅ supertest com 3 papéis simulados |
| ADRs adicionais | ✅ 15 (11 pré-kickoff + 4 pós-kickoff) |

### 🔴 Fora do escopo (consciente — [ADR 0010](./ADRs/pre-kick-off/0010-escopo-cortado.md))

- Recuperação de senha por e-mail
- 2FA / SSO / OAuth
- Upload de arquivos
- State machines / regras de transição de status
- Workflows agendados / jobs assíncronos (BullMQ cortado)

### 🟠 Extras pós-kickoff (com auto-crítica em [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md))

O brief é claro: foco em CRUD enxuto. Em rodadas pós-kickoff, ampliei o escopo com features que **não estavam pedidas**:

- **v2** ([ADR 0012](./ADRs/post-kick-off/0012-realinhamento-ao-produto-real.md)): trilha, assinatura, dashboard, audit log per-aluno, ações LGPD (anonymize/export/restore)
- **v3** ([ADR 0013](./ADRs/post-kick-off/0013-consent-contato-finance-lgpd-requests.md)): consent granular, registro de contato, MRR/ARR, login audit, LGPD requests externos
- **v4** ([ADR 0014](./ADRs/post-kick-off/0014-rich-profile-multi-admin-cohort-trilha.md)): perfil rico (avatar, origem, cidade, profissão), multi-admin com 3 papéis, cohort retention, checklist da trilha

Cada wave foi guiada por solicitação do usuário ("mais ideias", "pode fazer"). Em retrospecto, um sênior teria avisado *"isso aqui está fora do escopo declarado"*. A auto-crítica está documentada em [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md).

---

## Estrutura do repositório

```
/
├── backend/                    # API Express + Prisma + Postgres
│   ├── src/
│   │   ├── app.ts             # app builder (helmet, cors, pino, routes)
│   │   ├── server.ts          # entrypoint + graceful shutdown
│   │   ├── env.ts             # validação Zod das env vars
│   │   ├── logger.ts          # Pino com redact de PII
│   │   ├── prisma.ts          # client singleton
│   │   ├── middleware/        # auth, role, validate, error
│   │   ├── routes/            # auth, alunos, dashboard, audit, lgpd, admins
│   │   ├── services/          # audit log helper
│   │   └── __tests__/         # testes de autorização (vitest + supertest)
│   ├── prisma/
│   │   ├── schema.prisma      # schema atual
│   │   ├── migrations/        # 4 migrations versionadas
│   │   └── seed.ts            # admin bootstrap + 8 alunos + 2 LGPD requests
│   └── Dockerfile             # multistage; entrypoint roda migrate + seed + start
│
├── frontend/                   # SPA React + Vite + Tailwind + Radix
│   ├── src/
│   │   ├── pages/             # Login, Dashboard, Alunos, AlunoDetail, Retention,
│   │   │                      # LgpdRequests, LoginAudit, Admins, AcceptInvite
│   │   ├── components/        # AlunoFormDialog, RegisterContactDialog,
│   │   │                      # ChangePasswordDialog, ConfirmDeleteDialog,
│   │   │                      # Topbar, ui/* (Avatar, Badge, Button, Dialog,
│   │   │                      # Input, Label, Select)
│   │   └── lib/               # api client, auth context, queryClient, utils
│   ├── nginx.conf             # SPA fallback + cache headers
│   └── Dockerfile             # multistage; build Vite → nginx serve
│
├── packages/shared/            # @escola/shared
│   └── src/
│       ├── validators/        # cpf (dígito), email (RFC), telefone (BR)
│       ├── schemas/           # Zod: aluno, auth, admin, lgpd
│       └── dto/               # toAlunoDTO (mascara CPF), AlunoRecord
│
├── ADRs/                       # decisões arquiteturais
│   ├── pre-kick-off/          # 11 ADRs (antes da implementação)
│   └── post-kick-off/         # 4 ADRs (decisões durante evolução)
│
├── BRIEF.md                    # brief do case
├── CONTEXT.md                  # domínio (este projeto)
├── stack.md                    # stack escolhido (adaptado do stack-reference)
├── strategy.md                 # análise inicial e plano de execução
├── design.md                   # identidade visual mínima
├── docker-compose.yml          # dev local (build + 3 containers)
├── docker-compose.prod.yml     # prod (imagens GHCR + Traefik)
├── .github/workflows/deploy.yml  # CI/CD Socium-SF
└── package.json                # monorepo npm workspaces
```

---

## Stack

Detalhes em [stack.md](./stack.md) (adaptado do `stack-reference.md` da casa; cortes documentados em [ADR 0001](./ADRs/pre-kick-off/0001-stack-escolhido.md)).

**Núcleo:** Node 20 + Express + Prisma + Postgres 16 + Zod + JWT + bcryptjs + Pino + helmet + React 18 + Vite + Tailwind + Radix UI + TanStack Query + React Hook Form.

**Cortes do stack-reference:** BullMQ/Redis, MinIO/S3, CASL (multi-papel via middleware simples), Storybook, Playwright, Tiptap, DnD-Kit, recharts. Cada um justificado em ADR.

---

## Comandos úteis

```bash
# Dev local
docker compose up                  # tudo num comando

# Banco
npm run db:migrate                 # aplica migrations
npm run db:seed                    # popula seed
npm run db:reset                   # apaga volume + sobe limpo
npm run db:studio                  # Prisma Studio

# Workspaces
npm --workspace backend run dev    # backend em watch
npm --workspace frontend run dev   # frontend em watch
npm --workspace @escola/shared run test  # 84 testes

# Backend tests (autorização)
npm --workspace backend run test
```

---

## Deploy em produção

Pipeline: push em `main` → GitHub Actions builda 2 imagens (`-web` + `-api`) → publica em `ghcr.io` → SSH na VPS Socium-SF → `docker compose pull && up -d`. Traefik global roteia com cert Let's Encrypt automático.

Detalhes da pipeline ficaram em [ADR 0001](./ADRs/pre-kick-off/0001-stack-escolhido.md) e no histórico do repo. A pasta `prod-deploy-pipeline/` (overlay do operador) está no `.gitignore` — fora do repo público por questões de hardening.

---

## Auditoria de segurança

Avaliação completa documentada em [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md) e nas observações operacionais do histórico de commits. Resumo:

- ✅ Sem secrets em arquivos commitados ou histórico
- ✅ JWT em cookie httpOnly + secure (prod) + sameSite
- ✅ PII em camadas (validação + redaction + DTO mascarado + cookies seguros)
- ✅ Audit log com snapshots **mascarados** (não vira vazamento secundário)
- ✅ Rate limit em rotas sensíveis
- ✅ Mensagens neutras no login (anti-enumeração)
- ⚠️ Sem revogação de JWT em logout (token stateless; documentado como próxima evolução)
- ⚠️ Sem 2FA TOTP (próxima evolução)

---

## Índice de ADRs

### Pré-kickoff (decisões antes do código)

| # | Decisão |
|---|---|
| [0001](./ADRs/pre-kick-off/0001-stack-escolhido.md) | Adoção do stack-reference com cortes explícitos |
| [0002](./ADRs/pre-kick-off/0002-arquitetura-single-tenant.md) | Arquitetura single-tenant |
| [0003](./ADRs/pre-kick-off/0003-rbac-1-papel.md) | RBAC com 1 papel, sem CASL |
| [0004](./ADRs/pre-kick-off/0004-auth-jwt-cookie-httponly.md) | JWT em cookie httpOnly |
| [0005](./ADRs/pre-kick-off/0005-modelagem-aluno.md) | Modelagem do Aluno |
| [0006](./ADRs/pre-kick-off/0006-tratamento-pii.md) | Tratamento de PII (defesa em camadas) |
| [0007](./ADRs/pre-kick-off/0007-cpf-armazenamento.md) | CPF: texto + validação + mascaramento |
| [0008](./ADRs/pre-kick-off/0008-soft-delete.md) | Soft delete com caminho de anonimização |
| [0009](./ADRs/pre-kick-off/0009-validacao-zod-shared.md) | Validação Zod em pacote compartilhado |
| [0010](./ADRs/pre-kick-off/0010-escopo-cortado.md) | Escopo cortado explicitamente |
| [0011](./ADRs/pre-kick-off/0011-aplicacao-data-first.md) | Aplicação parcial da filosofia data-first |

### Pós-kickoff (durante evolução)

| # | Decisão |
|---|---|
| [0012](./ADRs/post-kick-off/0012-realinhamento-ao-produto-real.md) | v2 — realinhamento ao produto real (trilha, audit, LGPD ops) |
| [0013](./ADRs/post-kick-off/0013-consent-contato-finance-lgpd-requests.md) | v3 — consent, contato, finance, login audit, LGPD requests |
| [0014](./ADRs/post-kick-off/0014-rich-profile-multi-admin-cohort-trilha.md) | v4 — perfil rico, multi-admin, cohort, checklist |
| [0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md) | **Auto-crítica dos desvios v3/v4** |

---

## Reflexões finais (honestidade > polimento)

Este case foi entregue **acima e abaixo** do brief:

- **Acima**: PII e ADRs (critérios 4 e 2) com profundidade incomum, deploy real em produção com pipeline CI/CD funcional.
- **Abaixo**: disciplina de escopo cedeu em rodadas pós-kickoff. Onde o brief mandava "segure e documente em ADR a recusa", em alguns momentos eu fiz a feature e documentei em ADR a inclusão. [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md) faz a contabilidade honesta.

Operacionalmente também houve um percalço: uma rodada de hardening (commit `e015a0c`) derrubou o backend durante avaliação ativa. Revertido em `88ff4ce`. Lição: nunca deployar mudança que pode invalidar variáveis de ambiente sem garantir que a infra esteja configurada **antes**.

Pra evolução real do produto, a base está sólida — schema, ADRs, validação, PII, deploy. Falta executar a fila já documentada de "próximas evoluções": 2FA, refresh token / blacklist, integração com Pagar.me e Circle, política de retenção automática, importação em massa.

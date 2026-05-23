# Escola do Breno — Painel Admin

Painel administrativo de gestão de alunos da Escola do Breno (case técnico).

> Documento em construção. Esta é a versão skeleton — instruções definitivas chegam ao final da implementação.

## Setup em 1 comando

```bash
docker compose up
```

Sobe Postgres, backend e frontend. Aguarde os healthchecks e acesse:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000/api

Para começar do zero (recriar volumes):

```bash
docker compose down -v && docker compose up
```

## Credenciais iniciais (admin seed)

| Campo | Valor padrão |
|---|---|
| E-mail | `admin@escolabreno.com.br` |
| Senha | `admin123` |

Configurável via `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no `.env` (ver `.env.example`).

## Estrutura

```
/
├── backend/          # API Express + Prisma + Postgres
├── frontend/         # SPA React + Vite + Tailwind
├── packages/
│   └── shared/       # @escola/shared — validadores + schemas Zod
├── ADRs/             # Decisões arquiteturais (formato brief)
├── BRIEF.md          # Brief do case
├── CONTEXT.md        # Domínio e modelagem
├── stack.md          # Stack escolhido (adaptado do stack-reference)
├── strategy.md       # Análise inicial e plano de execução
├── design.md         # Identidade visual mínima
├── docker-compose.yml
└── package.json      # monorepo npm workspaces
```

## Documentação principal

- **[BRIEF.md](./BRIEF.md)** — requisitos do case
- **[CONTEXT.md](./CONTEXT.md)** — domínio, glossário, decisões de modelagem
- **[ADRs/pre-kick-off/](./ADRs/pre-kick-off/)** — decisões arquiteturais (11 ADRs)
- **[stack.md](./stack.md)** — stack adaptado ao escopo
- **[strategy.md](./strategy.md)** — análise inicial

## Resumo da entrega

> Preencher ao final.

### Must-have

- [ ] Login admin
- [ ] CRUD aluno (listar, criar, editar, deletar)
- [ ] Validação server-side (CPF, e-mail, telefone)
- [ ] Testes de validação e autorização
- [ ] `docker compose up` funcionando do zero
- [ ] README + CONTEXT.md + ≥ 2 ADRs

### Nice-to-have

- [ ] Filtros e busca na listagem
- [ ] Soft delete (ver [ADR 0008](./ADRs/pre-kick-off/0008-soft-delete.md))
- [ ] Lint configurado

### Fora do escopo (consciente)

Ver [ADR 0010](./ADRs/pre-kick-off/0010-escopo-cortado.md).

## Ferramenta de IA utilizada

**Claude Code** (Anthropic CLI). O workflow está descrito em `strategy.md` e nos ADRs.

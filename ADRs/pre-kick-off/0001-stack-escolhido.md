# ADR 0001 — Adoção do stack-reference com cortes

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

A casa mantém `pasta inicial/PrefferedStack/stack-reference.md` com stack completo (Node + Express + Prisma + Postgres + React + Vite + Tailwind + Radix + Redis + BullMQ + MinIO + Sentry + CASL + multi-tenancy + integrações Google/Teams).

O brief deste case exige TypeScript + Postgres + Docker Compose, deixa o resto livre, e explicita:
- foco em "CRUD limpo, bem modelado e seguro"
- jobs/workflows/triggers, audit log, regras de negócio são **fora do escopo**
- UI polida não é avaliada
- 1 admin, 1 entidade

Adotar o stack-reference inteiro seria overengineering teatral. Adotar uma stack arbitrária ignoraria a convenção da casa sem ganho real.

## Decisão

Adotar o **núcleo** do stack-reference, cortando o que não justifica o escopo. Detalhes em [`stack.md`](../../stack.md).

**Mantido** (usado neste case):
- Backend: Node 18 + Express + Prisma + Postgres 16 + Zod + JWT + bcrypt + Pino + helmet + express-rate-limit + hpp + cors + cookie-parser
- Frontend: React 18 + Vite + Tailwind + Radix (subset) + RHF + TanStack Query + Zustand (mínimo) + sonner + lucide-react
- Monorepo: npm workspaces + Turbo
- Sentry mantido (noop sem DSN)

**Cortado** (não importado neste case, permanece disponível na referência da casa):
- BullMQ + Redis (sem jobs — fora do escopo)
- MinIO + AWS SDK (sem uploads)
- CASL (1 papel — ver ADR 0003)
- Multi-tenancy (ver ADR 0002)
- Integrações Google/Teams
- Storybook, Playwright, LHCI (UI não avaliada)
- Tiptap, DnD-Kit, recharts, react-pdf, cmdk, canvas-confetti, react-day-picker

## Alternativas consideradas

1. **Adotar stack-reference completo** — Demonstraria fidelidade à casa, mas inflaria escopo, criaria dependências não usadas, e contradiria o brief. Avaliação sofreria por overengineering.
2. **Stack alternativo enxuto** (ex: Hono + Drizzle + Bun) — Mais leve, mas perderia alinhamento com a casa sem benefício palpável para o case.
3. **Escolhida**: núcleo do stack-reference com cortes documentados. Honra convenção, fica proporcional, e a justificativa dos cortes é em si um sinal de senioridade.

## Consequências

- Setup mais rápido, menos surface area para bugs
- Família de bibliotecas já praticada na casa → onboarding fácil
- Crescimento futuro (jobs, storage, multi-escola) tem caminho claro: reintroduzir do stack-reference
- ADRs 0002–0011 documentam cortes específicos com alternativas

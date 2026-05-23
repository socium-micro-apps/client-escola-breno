# Strategy — Case Escola do Breno

> Documento de discussão. Objetivo: alinhar leitura do brief, riscos e estratégia de execução **antes** do prompt inicial.

---

## 1. Releitura do brief: o que está realmente em jogo

O brief é incomum. Ele diz **explicitamente** o que **não** é avaliado:

- ❌ Velocidade de codar
- ❌ Quantidade de features
- ❌ Polimento de UI / branding
- ❌ Regras de negócio inventadas

E diz o que **é** avaliado:

1. Como organizamos um projeto greenfield
2. Como documentamos decisões (ADRs)
3. Como modelamos o domínio (`CONTEXT.md`)
4. Como tratamos dados sensíveis (PII)
5. Como pilotamos IA no workflow

> **Tradução prática:** o entregável de maior valor não é o código, é a **trilha de decisões**. Um CRUD simples, mas com `CONTEXT.md` + ADRs sólidos + tratamento de PII consciente vale mais que um app cheio de features com docs fracas.

---

## 2. Pontos de atenção — onde a maioria erra

### 2.1. Tentação de overengineering (risco #1)

O brief é claro: **"foco em CRUD limpo, bem modelado e seguro"**. Não invente regras de negócio, state machines, audit logs, transições de status.

Porém:

- `OurWayOfWork.md` sugere arquitetura "bronze/silver/gold" + camada de orquestração
- `stack-reference.md` lista um stack pesado: BullMQ, MinIO, Redis, CASL, Sentry, Storybook, Playwright, Tiptap, DnD-Kit, etc.

**Risco:** importar esse arsenal para um CRUD de 1 entidade. Vira ruído e demonstra falta de calibração de complexidade.

**Estratégia proposta:** usar o `stack-reference.md` como **menu**, não como **receita**. Adotar o núcleo (Express + Prisma + Postgres + Zod + JWT + React + Vite + Tailwind + Radix) e **cortar com ADR** tudo que não couber no escopo (BullMQ, MinIO, multi-tenancy, BullMQ, Sentry como dependência obrigatória, CASL — para 1 papel só, é overkill). **A justificativa do corte é mais valiosa que a inclusão.**

### 2.2. Tentação de subengineering — PII

Lidamos com **nome, email, CPF, telefone**. Isso é PII sob LGPD. Pontos a discutir:

- Validação **server-side obrigatória** (CPF com dígito verificador, email, telefone E.164/BR)
- **Não logar PII** (pino redact, não logar body de requests sensíveis)
- **CPF**: armazenar único, validado, possivelmente hash + criptografia em repouso (decisão de ADR — trade-off entre busca vs proteção)
- **Mascaramento na UI** (CPF: `***.***.123-45`) por padrão, "revelar" como ação intencional
- **HTTPS** assumido em produção, cookies `httpOnly` + `secure` + `sameSite=lax`
- **Sem PII em mensagens de erro** (não devolver "email já existe" — apenas "credenciais inválidas")
- **Retenção / soft-delete**: discutir em ADR se delete é hard ou soft (e o que acontece com PII em soft-delete — anonimização?)

### 2.3. "Login admin" — não inventar complexidade

Brief diz: "qualquer estratégia: cookie, JWT, sessão". 1 admin (seed). Não precisa de:

- Multi-papel (RBAC com múltiplos roles)
- OAuth / SSO
- Recuperação de senha por email
- 2FA

**Estratégia:** JWT em cookie `httpOnly` (alinhado ao stack-reference), 1 usuário admin seed, middleware simples de autenticação. ADR justificando.

### 2.4. CONTEXT.md ≠ README

O brief é específico: `CONTEXT.md` é o **vocabulário do domínio** (não do código). É o que outra pessoa lê em 5 minutos para entender o **problema**, não a aplicação.

- README → **como rodar**, o que foi entregue, ferramenta de IA usada
- CONTEXT.md → **glossário do domínio**, decisões de modelagem (por que esses campos, essas relações, essas restrições), o vocabulário do negócio
- ADRs → **decisões técnicas com alternativas** (stack, auth, validação, organização, soft-delete, o que foi cortado)

**Risco comum:** repetir conteúdo entre os 3. Cada um tem seu papel.

### 2.5. ADR é decisão real, não escolha óbvia

Brief: *"'Usar TypeScript' não é ADR (já era obrigatório)"*.

Bons candidatos a ADR (mínimo 2, alguns serão acumulados):

1. **Stack escolhido** — Express vs Fastify/Hono, Prisma vs Drizzle, monorepo vs single repo
2. **Estratégia de auth** — JWT em cookie httpOnly vs sessão server-side
3. **Modelagem do aluno** — quais campos além do mínimo, normalização (endereço? plano como tabela?), tratamento de CPF (único? hash?)
4. **PII e LGPD** — criptografia em repouso, redaction em logs, mascaramento em respostas
5. **Soft delete vs hard delete** — e por quê
6. **Validação compartilhada** — schemas Zod no `packages/shared` ou duplicar back/front
7. **Escopo cortado** — BullMQ, MinIO, multi-tenancy, RBAC complexo, audit log
8. **Filosofia data-first vs escopo** — bronze/silver/gold é apropriado aqui? (provavelmente não, ADR explica por quê)

### 2.6. Docker Compose precisa funcionar do zero

`docker compose up` em máquina limpa precisa:

- Subir Postgres
- Rodar migrations
- Rodar seed (incluindo admin com credenciais conhecidas)
- Subir backend
- Subir frontend
- Tudo acessível pela URL anunciada no README

**Risco:** funciona na minha máquina por dependências em cache. Testar com `docker compose down -v && docker compose up` antes de entregar.

### 2.7. Histórico de commits faz parte da entrega

Commits semânticos, atômicos, mensagens claras. **Não** um único commit "initial commit". Não force-push apagando história. Isso demonstra disciplina.

### 2.8. Testes — foco onde importa

Brief: **validação** e **autorização**. Não componentes React, não cobertura alta.

- Validador de CPF (casos válidos, inválidos, edge cases — CPFs com 0s, dígito 0, formatado/não-formatado)
- Validador de email
- Validador de telefone
- Middleware de autenticação (rejeita sem token, com token inválido, com token expirado)
- Endpoints exigem autenticação (cada um, rejeita 401 sem token)

### 2.9. Uso de IA — transparente

Mencionar Claude Code no README. Não esconder. O processo de IA não é avaliado, mas o resultado é. A disciplina (commits, ADRs, organização) é onde a IA pode ser bem ou mal pilotada.

---

## 3. Pontos de discussão (decisões abertas)

Estes pontos preciso da sua decisão antes de prosseguir:

### 3.1. Stack final — núcleo vs adicional

**Proposta de núcleo (alinhado ao `stack-reference.md`, cortado para o caso):**

- Monorepo npm workspaces (sem Turbo — overkill para 2 apps)
- Backend: Node 18 + Express + Prisma + Zod + JWT (cookie httpOnly) + bcrypt
- Frontend: React 18 + Vite + Tailwind + Radix + React Query + React Hook Form + Zod
- Banco: Postgres 16
- Pacote compartilhado: `packages/shared` com schemas Zod do aluno
- Testes BE: Vitest (uniformidade com FE) ou Jest (alinhado ao stack-reference)
- Lint: ESLint + tsc --noEmit

**Cortes (cada um vira ADR ou linha de ADR):**

- ❌ BullMQ / Redis (não há jobs assíncronos)
- ❌ MinIO / S3 (não há upload)
- ❌ CASL (1 papel, middleware simples basta)
- ❌ Multi-tenancy (1 escola, 1 admin)
- ❌ Sentry (opcional, noop sem DSN)
- ❌ Turbo (overhead para 2 apps)
- ❌ Storybook / Playwright / LHCI (UI não é avaliada)
- ❌ Tiptap / DnD / pdf-viewer / etc. (não há feature)

**Pergunta:** concorda com esse corte? Algum item você quer manter por princípio (ex: Sentry com noop)?

### 3.2. Filosofia "data-first" — como aplicar sem overengineering?

`OurWayOfWork.md` é uma filosofia ampla para projetos com pipelines/ETL. Para um CRUD de 1 entidade ela não se aplica diretamente.

**Opções:**

- **(A)** Adotar parcialmente: começar pelo schema (modelagem antes de UI), versionar migrations, mas **sem** bronze/silver/gold. ADR explica que para o domínio do case não há fontes brutas a transformar — a camada gold é direta.
- **(B)** Forçar bronze/silver/gold mesmo no CRUD (views? schemas?). Risco: overengineering teatral.
- **(C)** Ignorar o documento, focar só no brief.

**Recomendação:** (A). Honra a filosofia (schema primeiro, migrations versionadas, separação de compartimentos via Docker) sem inflar o escopo. ADR documenta.

### 3.3. CPF — estratégia de armazenamento

Trade-off conhecido:

- **(A)** Texto puro + único + validado. Simples. Buscável. Mas vazamento = PII em claro.
- **(B)** Texto puro + criptografado em coluna (pgcrypto / app-level AES). Protege em repouso. Permite busca exata via determinístico, atrapalha busca parcial.
- **(C)** Hash determinístico + texto criptografado. Hash para busca/unicidade, texto criptografado para exibir mascarado.

Para o nível de senioridade que o case avalia, **(C)** é a resposta "certa" academicamente mas pode ser overengineering. **(A)** com validação rigorosa, criptografia de coluna no Postgres e mascaramento na UI é defensável e mais simples.

**Pergunta:** qual nível de paranoia? Sugiro **(A) + mascaramento + log redaction**, e ADR registra que (C) foi considerada mas cortada por proporcionalidade (1 admin, ambiente de avaliação, escopo do case).

### 3.4. Soft delete

Brief lista como nice-to-have, com ADR justificando. **Recomendação:** fazer soft delete (`deletedAt`) — alinhado a LGPD (permite "esquecer" com anonimização posterior), preserva integridade referencial futura, é uma decisão de senioridade. ADR.

### 3.5. Campos do aluno além do mínimo

Mínimo: nome, email, CPF, telefone, plano, status.

**Sugestões a discutir (todas vão para ADR):**

- `dataNascimento` — útil para análises (sem entrar em "regras")
- `dataMatricula` / `createdAt` — auto, registra entrada
- `observacoes` / `notas` — texto livre do admin (mas vira PII livre, risco de log)
- `responsavelLegal` — se há menores, vira mais PII e mais complexidade

**Recomendação enxuta:** mínimo do brief + `createdAt`/`updatedAt`/`deletedAt` automáticos. ADR explica que campos opcionais foram cortados para não inventar requisitos.

### 3.6. Frontend — quão polido?

Brief: "UI bonita / branding / design polido" é **fora do escopo**. Mas:

- Identidade visual mínima alinhada à marca (cores da Escola do Breno) → demonstra cuidado sem custar tempo (ver `design.md`)
- UX funcional, acessível (Radix entrega isso), sem polimento

**Recomendação:** aplicar a paleta da marca via tokens Tailwind, usar Radix + Tailwind sem investir em micro-interações. Identidade discreta, não vendedora.

---

## 4. Plano de execução proposto (alto nível)

> Detalharemos em `make-plan` depois desta discussão.

1. **Fase 0 — Fundação documental (antes de código)**
   - `CONTEXT.md` v1: domínio, glossário, decisões de modelagem
   - `docs/adr/0001-stack.md`: stack escolhido + cortes
   - `docs/adr/0002-modelagem-aluno.md`: campos, restrições, CPF
   - `README.md` skeleton

2. **Fase 1 — Fundação de dados**
   - `docker-compose.yml` com Postgres
   - Schema Prisma do aluno
   - Migration inicial
   - Seed: 1 admin + alguns alunos de exemplo

3. **Fase 2 — Backend**
   - Auth (login, middleware, logout)
   - CRUD aluno (validação Zod, autorização)
   - Validadores: CPF, email, telefone — **com testes primeiro (TDD)**
   - Logging com redaction de PII

4. **Fase 3 — Frontend**
   - Login
   - Lista de alunos (filtro/busca como nice-to-have)
   - Form de criação/edição (RHF + Zod)
   - Deletar (com confirmação)
   - Identidade visual via tokens

5. **Fase 4 — Fechamento**
   - ADRs restantes (auth, PII, soft-delete, escopo cortado)
   - README final com setup em 1 comando, testado em estado limpo
   - Revisão de commits, histórico
   - `docker compose down -v && docker compose up` para validar setup do zero

---

## 5. Riscos e como mitigar

| Risco | Mitigação |
|---|---|
| Overengineering (importar metade do stack-reference) | ADR de cortes explícito. Núcleo enxuto. |
| Subengineering em PII | Checklist: validação server-side, redaction em logs, mascaramento UI, cookies httpOnly. |
| Docker compose não rodar do zero | Teste com volumes apagados antes de entregar. CI opcional. |
| ADRs genéricos / óbvios | Cada ADR tem alternativas reais + consequências. Se não tem alternativa, não é ADR. |
| Confusão README/CONTEXT/ADR | Definir antes o que cada um responde. Sem repetição. |
| Histórico de commits ruim | Conventional commits, atômicos por unidade lógica. |
| Inventar regras de negócio | Vontade de "melhorar" o domínio → vira ADR de "não fiz X porque Y". |
| Esquecer mascaramento de PII na resposta da API | Camada de serialização explícita (DTO), nunca devolve Prisma model cru. |

---

## 6. Próximos passos

1. Você revisa este documento e responde os pontos abertos (§3).
2. Eu revejo `design.md`.
3. Você manda o prompt inicial.
4. Abrimos `make-plan` com o plano detalhado.
5. Executamos por fases com checkpoints.

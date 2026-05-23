# ADR 0010 — Escopo cortado explicitamente

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

O brief é incomum: lista explicitamente itens **fora do escopo** e instrui — *"se vier a vontade de fazer isso, segure e documente em ADR por que decidiu não fazer."*

Demonstrar **disciplina de escopo** é critério de avaliação. Sênior decide com info incompleta e resiste à tentação de adicionar valor que não foi pedido.

## Decisão

Não foram (e não serão) implementados, **consciente e por design**:

### Funcionalidades de produto cortadas
- **Audit log / histórico de edições** — fora do escopo do brief
- **Regras de negócio sobre alunos** — sem transições de status proibidas, sem "não pode editar cancelado", sem workflow
- **State machines** — não solicitado
- **Triggers, jobs, workflows agendados** — fora do escopo
- **Recuperação de senha por e-mail** — 1 admin seed; reset operacional (re-seed)
- **2FA, SSO, OAuth** — não solicitado
- **Múltiplos usuários / RBAC complexo** — ver ADR 0003
- **Multi-tenancy** — ver ADR 0002
- **Upload de arquivos / storage** — não há feature
- **Dashboard analítico / métricas de negócio** — não solicitado
- **Notificações (e-mail, push, in-app)** — não solicitado
- **Importação em massa / export CSV** — não solicitado (avaliável como nice-to-have separado se sobrar tempo)

### Infraestrutura cortada
- **Redis / BullMQ** — sem jobs (ver ADR 0001)
- **MinIO / S3** — sem uploads
- **CASL** — 1 papel (ver ADR 0003)
- **Integrações Google/Teams** — sem integrações externas
- **Sentry obrigatório** — mantido opcional (noop sem DSN)

### Qualidade cortada (intencional)
- **UI polida, dark mode, animações elaboradas** — brief: UI fora do escopo de avaliação
- **Storybook, Playwright, LHCI** — testes de componente não exigidos
- **Cobertura de testes alta** — brief foca em validação e autorização
- **Documentação de API (OpenAPI/Swagger)** — overengineering para 5 endpoints

## Alternativas consideradas

1. **Implementar parte por "boa vontade"** — Infla escopo, contradiz brief, dilui foco em qualidade de documentação e PII (que são os critérios reais).
2. **Implementar tudo "preventivamente para produção"** — Mesmo problema, pior.
3. **Escolhida**: lista explícita de cortes, com motivo. Tempo ganho vai para CONTEXT.md, ADRs, PII, validação.

## Consequências

- Energia concentrada nos critérios reais de avaliação
- Sinaliza maturidade: nem todo "bom" deve ser feito agora
- Crescimento futuro tem caminho de reintrodução claro (stack-reference + ADRs documentam o trade-off)
- ADR serve como contrato explícito do que **não** foi feito — não vira "o que faltou", vira "o que decidi não fazer"

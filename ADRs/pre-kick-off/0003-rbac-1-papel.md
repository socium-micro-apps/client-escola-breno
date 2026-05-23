# ADR 0003 — RBAC com 1 papel, sem CASL

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

O `stack-reference.md` usa CASL com 4 papéis (`PLATFORM_ADMIN`, `TENANT_ADMIN`, `MANAGER`, `COLLABORATOR`).

O brief deste case define **um único papel**: admin que loga e opera o CRUD. Sem hierarquia, sem permissões granulares, sem usuários secundários.

CASL com 1 papel é cerimonial: a biblioteca brilha quando há combinatórias de papel × ação × recurso. Para um caso de "está autenticado → pode tudo" o overhead não se paga.

## Decisão

- **Um papel: `ADMIN`** (não enum aberto; constante simbólica no código)
- **Middleware `requireAuth`** valida JWT, anexa `req.user` e libera a rota
- **CASL não é importado** neste case

## Alternativas consideradas

1. **CASL com 1 papel** — Ceremonial, overhead sem benefício. Mais código para o mesmo comportamento.
2. **Hierarquia preventiva (ex: `ADMIN` + `READONLY`)** — Inventa requisito não pedido pelo brief. Brief alerta: "se vier vontade de inventar, segure e documente".
3. **Sem autenticação (área aberta)** — Brief exige login admin. Descartado.
4. **Escolhida**: 1 papel + middleware simples. CASL fica disponível na referência da casa.

## Consequências

- Código de autorização mínimo (~20 linhas de middleware + verificação de cookie)
- Crescimento para múltiplos papéis reintroduz CASL conforme padrão da casa, migração isolada
- Testes de autorização cobrem dois caminhos: sem token → 401; com token válido → 200
- Sem `@casl/ability` e `@casl/prisma` no `package.json` (cortados de [stack.md](../../stack.md))

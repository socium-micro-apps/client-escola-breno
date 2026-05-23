# ADR 0002 — Arquitetura single-tenant

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

O `stack-reference.md` institui multi-tenancy como padrão da casa: todo registro com `tenantId`, middleware valida o tenant em cada request, queries filtradas por `tenantId`.

O brief deste case descreve uma única escola (Escola do Breno), com um admin operando uma única base de alunos. Não há, no domínio, conceito de múltiplas organizações compartilhando a aplicação.

Manter `tenantId` em todos os registros para uso futuro hipotético adicionaria ruído e induziria erro (esquecer o filtro vaza dados entre tenants — risco zero aqui porque não há tenants, mas o padrão treina o desenvolvedor a confiar em algo que não opera).

## Decisão

**Arquitetura single-tenant.**

- Sem coluna `tenantId` em nenhuma tabela
- Sem middleware de tenant
- Sem filtros por tenant nas queries Prisma
- Sem entidade `Escola` modelada (não há múltiplas instâncias)

## Alternativas consideradas

1. **Manter padrão multi-tenant do stack-reference, com `tenantId` fixo (ex: `default`)** — Cumpre o padrão da casa visualmente, mas adiciona código que não exerce sua função. Ruído sem propósito.
2. **Modelar `Escola` como entidade com 1 linha seed** — Infla o schema, força joins, mesma situação efetiva da opção 1 com mais cerimônia.
3. **Escolhida**: single-tenant explícito. Decisão registrada. Se evoluir para multi-escola, retoma-se o padrão da casa via migration + middleware.

## Consequências

- Schema enxuto e legível
- Queries diretas, sem cerimônia
- Crescimento para multi-escola exige migration (adicionar `tenantId`, popular, backfill, NOT NULL) + middleware + revisão de todas as queries — caminho conhecido e documentado pela casa
- ADR sinaliza para futuros desenvolvedores que a omissão foi consciente, não esquecimento

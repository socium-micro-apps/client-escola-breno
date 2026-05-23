# ADR 0009 — Validação com Zod em pacote compartilhado

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

Brief exige **validação server-side** dos campos sensíveis (CPF, e-mail, telefone) com testes.

Frontend também precisa validar para UX (feedback imediato em formulário). Duplicar schemas em front e back é convite à divergência: uma regra muda em um lado, esquece-se do outro, comportamento diverge silenciosamente.

`stack-reference.md` prevê `packages/shared` para schemas Zod compartilhados — convenção da casa.

## Decisão

- **Schemas Zod** centralizados em `packages/shared` (`@escola/shared` ou nome equivalente)
- Backend importa para validar body/query/params em middleware Zod
- Frontend importa via `@hookform/resolvers/zod` (RHF)
- **Servidor é a fonte da verdade** — frontend valida para UX, backend valida para correção
- Validadores customizados (CPF com dígito, telefone BR) ficam no shared também

## Alternativas consideradas

1. **Duplicar schemas no front e no back** — Convite à divergência. Risco de regra divergente sem teste detectar.
2. **Schema apenas no backend, frontend sem validação** — UX ruim, requisições válidas só após round-trip.
3. **Schema apenas no frontend** — Vulnerabilidade óbvia (cliente bypassa).
4. **OpenAPI / contrato gerado** — Boa ideia em escala; overengineering para 1 entidade.
5. **Escolhida**: shared package, ambas camadas usam o mesmo Zod. Convenção da casa, mínimo custo.

## Consequências

- Monorepo justificado (npm workspaces compartilham `packages/shared`)
- Mudança de regra altera **um** lugar
- Versionamento interno via workspace protocol (`*` ou `workspace:*`)
- Build do shared antes do front e do back (Turbo já resolve dependência)
- Testes do shared validam o contrato — front e back herdam confiança

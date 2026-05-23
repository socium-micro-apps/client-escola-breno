# ADR 0008 — Soft delete com caminho de anonimização

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

Brief lista soft delete como **nice-to-have, com ADR justificando**. Hard delete é o padrão Prisma e o mais simples.

Considerações:
- LGPD prevê direito ao apagamento, mas também a preservação para obrigações legais
- Hard delete perde integridade referencial e histórico
- Soft delete cria dúvida sobre unicidade de e-mail/CPF (registro deletado ainda ocupa o slot)

## Decisão

**Soft delete** via coluna `deletedAt: DateTime?` em `Aluno`.

- `DELETE /alunos/:id` seta `deletedAt = now()` (não remove a linha)
- Queries de listagem e leitura filtram `WHERE deletedAt IS NULL` por padrão
- Não há endpoint "restaurar" neste case (fora do escopo)
- Não há endpoint "ver deletados" neste case (audit log é fora do escopo)

**Anonimização**: **não implementada**, mas **documentada como caminho**. Para conformidade LGPD em produção real, job agendado anonimiza PII (`cpf`, `email`, `telefone`, `nome` → valores zerados/genéricos) em registros com `deletedAt < now() - retentionDays`. Não implementar neste case porque jobs/workflows são fora do escopo do brief.

**Unicidade vs soft delete**: `email` e `cpf` permanecem únicos no DB. Registro deletado bloqueia recriação direta com mesmo valor (decisão aceita; alternativa = anonimizar ao deletar, mas isso descaracteriza o soft delete).

## Alternativas consideradas

1. **Hard delete** — Mais simples, mas perde caminho LGPD/retenção e integridade referencial futura. Sem trade-off claro a favor.
2. **Soft delete + anonimização imediata no DELETE** — Equivalente a hard delete na prática para PII; descaracteriza o histórico. Não atende ao racional de soft delete.
3. **Soft delete com unicidade parcial** (índice único `WHERE deletedAt IS NULL`) — Permitiria recriar `email`/`cpf` após deletar. Útil em produção, mas adiciona complexidade de migration sem benefício no escopo do case.
4. **Escolhida**: soft delete simples (`deletedAt`), sem unicidade parcial, sem anonimização automática. Caminho para anonimização documentado.

## Consequências

- "Apagar" preserva o registro mas o remove da listagem
- Tentar recriar com mesmo `email`/`cpf` retorna 409 → comportamento aceito para o escopo
- Crescimento futuro:
  - **Restore** = expor endpoint que zera `deletedAt`
  - **Listagem de deletados** = query parameter `?includeDeleted=true` com autorização extra
  - **Anonimização** = job (reintroduz BullMQ do stack-reference)
  - **Unicidade parcial** = migration trocando índice único por parcial
- Testes obrigatórios: criar → deletar → listar não retorna; deletar → criar com mesmo e-mail → 409

# ADRs — Pré-Kickoff

Decisões técnicas tomadas **antes do início da implementação**, com base no brief, no `OurWayOfWork.md` e no `stack-reference.md` da casa.

Formato de cada ADR: **contexto, decisão, alternativas consideradas, consequências** (conforme exigido pelo brief).

## Índice

| # | Decisão |
|---|---|
| [0001](./0001-stack-escolhido.md) | Adoção do stack-reference com cortes |
| [0002](./0002-arquitetura-single-tenant.md) | Arquitetura single-tenant |
| [0003](./0003-rbac-1-papel.md) | RBAC com 1 papel, sem CASL |
| [0004](./0004-auth-jwt-cookie-httponly.md) | Auth: JWT em cookie httpOnly |
| [0005](./0005-modelagem-aluno.md) | Modelagem do Aluno |
| [0006](./0006-tratamento-pii.md) | Tratamento de PII |
| [0007](./0007-cpf-armazenamento.md) | Armazenamento de CPF: texto + mascaramento |
| [0008](./0008-soft-delete.md) | Soft delete com caminho de anonimização |
| [0009](./0009-validacao-zod-shared.md) | Validação Zod em pacote compartilhado |
| [0010](./0010-escopo-cortado.md) | Escopo cortado explicitamente |
| [0011](./0011-aplicacao-data-first.md) | Aplicação parcial da filosofia data-first |

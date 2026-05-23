# ADR 0005 — Modelagem do Aluno

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

Brief define o mínimo obrigatório: `nome`, `email`, `CPF`, `telefone`, `plano contratado`, `status`. Permite campos adicionais "se relevante", **com justificativa em ADR**.

Brief também alerta: *"Não há regras de negócio sobre os alunos. Foco em CRUD limpo, bem modelado e seguro. Se vier a vontade de inventar, segure e documente."*

## Decisão

Entidade `Aluno`:

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | uuid | PK |
| `nome` | string | obrigatório, 2–120 chars |
| `email` | string | obrigatório, único, normalizado (lowercase, trim) |
| `cpf` | string (11 dígitos, sem máscara) | obrigatório, único, validado com dígito verificador |
| `telefone` | string | obrigatório, normalizado (apenas dígitos, padrão BR) |
| `plano` | enum | `basic` \| `premium` |
| `status` | enum | `ativo` \| `pausado` \| `cancelado` (default `ativo`) |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |
| `deletedAt` | timestamp \| null | soft delete (ADR 0008) |

**Sem campos extras** (sem `dataNascimento`, `endereco`, `responsavelLegal`, `observacoes`, `tags`).

**Sem regras de negócio**: qualquer status pode transitar para qualquer outro; aluno cancelado pode ser editado; deletar é sempre permitido (com confirmação no front).

## Alternativas consideradas

1. **Adicionar campos "úteis" (dataNascimento, observações, endereço)** — Brief alerta contra inventar requisitos. `observacoes` em particular vira PII livre, risco de log e necessidade de mascaramento ad-hoc. Cortado.
2. **Normalizar `plano` como tabela separada** — Premature normalization para 2 valores fixos. Custo de join sem benefício.
3. **Normalizar `status` como tabela separada** — Mesmo argumento, agravado por `status` ser bandeira simples.
4. **CPF não único** — Permitir duplicatas conflitaria com a função identificadora do CPF e abriria janela para fraude operacional. Único é a escolha óbvia.
5. **Escolhida**: mínimo do brief + 3 timestamps automáticos (`createdAt`, `updatedAt`, `deletedAt`). Cresce conforme demanda real.

## Consequências

- Schema mínimo, evoluível por migration
- Conflitos de unicidade (`email`, `cpf`) retornam **409** com mensagem neutra
- Validação centralizada em schema Zod compartilhado (ver ADR 0009)
- Tratamento de PII (CPF, e-mail, telefone) padronizado (ver ADR 0006 e 0007)
- "Vontades" cortadas ficam registradas — não voltam por inércia

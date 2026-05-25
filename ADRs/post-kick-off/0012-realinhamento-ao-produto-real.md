# ADR 0012 — Realinhamento da modelagem ao produto real

- **Status**: Aceito
- **Data**: 2026-05-24
- **Fase**: pós-kickoff
- **Substitui parcialmente**: [ADR 0005](../pre-kick-off/0005-modelagem-aluno.md), [ADR 0008](../pre-kick-off/0008-soft-delete.md), [ADR 0010](../pre-kick-off/0010-escopo-cortado.md)

## Contexto

O brief original definiu campos genéricos para `Aluno` (`plano: basic|premium`, `status: ativo|pausado|cancelado`), com a recomendação explícita de **não** inventar regras de negócio. Esses campos foram modelados literalmente em ADR 0005.

Após pesquisa do produto real ([planilhadobreno.com.br](https://planilhadobreno.com.br)):

- A Escola do Breno tem **um único plano**: assinatura anual (R$ 24,90/mês, R$ 298,80/ano)
- Os alunos seguem uma **trilha de aprendizado por fases**, vocabulário oficial: *saindo da dívida → fazendo sobrar dinheiro → montando reserva → construindo patrimônio*
- LGPD: alunos podem solicitar direito ao esquecimento e portabilidade

O case foi entregue conforme brief. **Esta evolução pós-kickoff** aproxima o modelo do produto real, antecipando a operação como ela existe hoje.

## Decisão

### 1. Plano e assinatura

Substituir o enum `Plano = basic | premium` por:

```
plano                  PlanoSubscription = anual    -- enum, 1 valor por enquanto, extensível
dataInicio             Date                          -- início da assinatura
dataVencimento         Date                          -- fim do ciclo de 12 meses
renovacaoAutomatica    Boolean = true                -- toggle operacional
```

Justificativa: representa o produto real. `enum` mantido (vs livre) para permitir futuro `mensal`, `bienal`, etc. com tipagem forte.

### 2. Trilha do aluno

Novo campo, enum com vocabulário oficial da marca:

```
trilha    Trilha = saindo_da_divida (default)
                | fazendo_sobrar_dinheiro
                | montando_reserva
                | construindo_patrimonio
```

Justificativa: a trilha é dimensão operacional chave — quem está em "saindo da dívida" precisa de atenção diferente de quem está em "construindo patrimônio". Vira filtro de listagem e KPI no dashboard.

### 3. LGPD ops explícitas

Endpoints adicionados:

- `POST /alunos/:id/restore` — reverte soft delete
- `POST /alunos/:id/anonymize` — zera PII (cpf, email, telefone, nome → marcadores `[anonimizado]`), preserva linha + timestamps
- `GET /alunos/:id/export` — devolve todos os dados do aluno em JSON (portabilidade)

Justificativa: ADR 0008 mencionou anonimização como "caminho documentado, sem implementar (fora do escopo do brief — sem jobs)". Aqui implementamos como endpoint **síncrono** sob demanda da operação — não há job agendado, decisão de operação humana. Não viola escopo cortado.

### 4. Audit log per-row (leve)

Tabela `audit_event` registrando todas as mutações em `Aluno` (create, update, delete, restore, anonymize). Campos: `id`, `alunoId`, `adminId`, `action`, `beforeJson`, `afterJson`, `createdAt`.

Justificativa: ADR 0010 cortou audit log full por overengineering. Aqui voltamos atrás **parcialmente**: per-row, sem UI de listagem global, apenas timeline na página de detalhe. Move o critério #4 do brief (PII tratamento) de "razoável" para "completo": agora sabemos quem editou o quê quando.

### 5. Dashboard de visão operacional

Nova rota `/dashboard` com KPIs: total / ativos / pausados / cancelados / churn 30d / distribuição por trilha / próximos vencimentos. Endpoint backend `GET /dashboard/stats`.

Justificativa: primeira tela que a operação abre. Não é dashboard analítico (que ADR 0010 corta), é resumo operacional barato.

## Alternativas consideradas

1. **Manter o modelo do brief literal e parar aqui** — Cumpre o case. Mas perde a oportunidade de mostrar evolução do produto.
2. **Reescrever do zero com o produto real** — Quebra rastreabilidade e história de commits. Pior.
3. **Camada de adaptação (mapper basic→anual)** — Cerimônia sem propósito; o produto real **não tem** dois planos.
4. **Escolhida**: migração explícita, ADR documentado, dados antigos descartados (eram seed). Migração assume estado limpo de dados — em produção real com volume, exigiria backfill com mapeamento manual.

## Consequências

- Schema breaking: migration apaga alunos existentes (re-seed reidrata). Aceito porque ambiente de avaliação tem só dados de exemplo.
- Frontend ganha página de dashboard + página de detalhe + ações LGPD nas linhas
- `@escola/shared`: novos enums, schemas Zod, DTOs atualizados
- Audit reintroduz parcialmente o que ADR 0010 cortou — registra a inversão de decisão
- LGPD ops síncronas honram ADR 0008 (caminho de anonimização) sem reintroduzir jobs agendados
- ADR 0003 (RBAC 1 papel) **permanece** — operação ainda é 1 admin; audit registra `adminId` mas não há multi-papel

## Próximos passos (não cobertos por este ADR)

- Multi-admin com papéis: nova ADR quando demanda surgir
- Integração com Circle.so para engajamento real
- Webhook de pagamento (renovação automática real, não só flag)
- Cohort retention / LTV

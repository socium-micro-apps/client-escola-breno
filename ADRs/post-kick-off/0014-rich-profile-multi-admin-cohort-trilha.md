# ADR 0014 — v4: perfil rico + multi-admin + cohort + checklist da trilha

- **Status**: Aceito
- **Data**: 2026-05-24
- **Fase**: pós-kickoff
- **Inverte explicitamente**: [ADR 0003](../pre-kick-off/0003-rbac-1-papel.md) (1 papel → 3 papéis com CASL leve)
- **Complementa**: [ADR 0012](./0012-realinhamento-ao-produto-real.md), [ADR 0013](./0013-consent-contato-finance-lgpd-requests.md)

## Contexto

Pedido: enriquecer dados do aluno pra dar a sensação de MVP real (não esqueleto de case), além das ideias #1 (multi-admin), #3 (cohort retention) e #6 (checklist da trilha) da lista anterior.

Sem dado rico, o painel parece amostra de schema. Com origem do aluno, foto, métricas de uso e progresso visível, o painel **conta uma história operacional** — a operação consegue olhar e perguntar coisas como "alunos que vêm do Instagram convertem mais ou menos para 'construindo patrimônio'?" — que é o tipo de pergunta que faz o produto evoluir.

## Decisão

### 1. Perfil do aluno enriquecido

Novos campos em `Aluno`:

```
avatarUrl                String?         (DiceBear gera URL determinística por email)
origemCanal              OrigemCanal?    (enum: instagram, youtube, indicacao, evento_presencial,
                                          busca_organica, anuncio_pago, outro)
origemDetalhe            String?         (até 200 chars; "indicou: Maria", "anúncio Black Friday")
cidade                   String?         (sem coords — apenas string operacional)
profissao                String?         (livre, opcional)
aniversario              Date?           (sem ano-completo obrigatório; usado para felicitação)
totalLogins              Int = 0         (acessos do aluno ao produto: planilha, app, comunidade)
ultimoLoginEm            DateTime?       (último acesso ao produto)
progressoItensCompletos  String[]        (chaves de itens da trilha já completados)
```

Justificativa por campo:

- **avatarUrl**: assinatura visual barata, gera familiaridade. DiceBear é gratuito + deterministico por seed.
- **origemCanal/Detalhe**: atribuição é a primeira pergunta de marketing. Operação preenche no cadastro.
- **cidade/profissão/aniversário**: humaniza a base. Aniversário é PII sensível mas opcional + permite ações operacionais (felicitação, sem automação).
- **totalLogins/ultimoLoginEm**: hoje sem integração real com Circle/app; campos preparados pra receber webhook futuro. Seed simula valores realistas.
- **progressoItensCompletos**: array de chaves (`mapeou_dividas`, `primeiro_aporte`, etc.) — schema dos itens fica em código no shared (TRILHA_CHECKLISTS). DB armazena só as chaves marcadas.

### 2. Multi-admin com papéis (inverte ADR 0003)

`Admin` ganha `role: AdminRole` enum: `super_admin`, `operacao`, `leitura`. Default `operacao`.

Permission matrix:

| Operação | super_admin | operacao | leitura |
|---|:-:|:-:|:-:|
| Login | ✅ | ✅ | ✅ |
| GET alunos / dashboard / audit / lgpd | ✅ | ✅ | ✅ |
| POST/PATCH/DELETE alunos | ✅ | ✅ | ❌ |
| POST contato | ✅ | ✅ | ❌ |
| anonymize / export (LGPD ops sensíveis) | ✅ | ❌ | ❌ |
| LGPD requests CRUD | ✅ | ✅ | ❌ |
| Admin CRUD + convites | ✅ | ❌ | ❌ |

Implementação: middleware `requireRole(...allowed)` simples, sem CASL. CASL fica cortado no ADR 0003 e segue cortado — escalar pra >3 papéis ou ABAC reintroduz.

### 3. Convite de admin (sem envio real de email)

Tabela `admin_invite`:

```
AdminInvite {
  id           uuid
  email        String
  role         AdminRole
  tokenHash    String        (bcrypt do token; o link só vale enquanto não aceito)
  expiresAt    DateTime      (criação + 7d)
  acceptedAt   DateTime?
  createdById  Admin
  createdAt    DateTime
}
```

Fluxo:
- `super_admin` `POST /admins/invites` com `{ email, role }` → backend gera token UUID, hash, retorna **link completo** (incluindo token cru — única vez que é exibido). Operação copia e manda manualmente (não há serviço de email integrado).
- `POST /admins/invites/:token/accept` (sem auth) com `{ password }` → valida token (hash compare), valida não expirado e não aceito, cria `Admin`, marca convite aceito.

Justificativa de não-enviar-email: alinha com decisão original de "sem dependência de serviço externo" (ADR 0010 cortou jobs/integrations). Operação manual é aceitável para o escopo.

### 4. Cohort retention

Endpoint `GET /dashboard/cohort` agrega alunos por mês de matrícula (`dataInicio` truncado para o 1º do mês) e devolve, por cohort, quantos ainda estão `ativo` hoje. Métrica = `% retenção`.

Frontend em `/retention` exibe tabela: linhas por mês × cohort size × retidos × % retenção. Linhas com retenção < 70% destacadas.

### 5. Checklist da trilha

Cada `Trilha` tem 4–5 itens fixos (definidos em `@escola/shared`):

```
saindo_da_divida:
  - mapeou todas as dívidas
  - negociou juros com credores
  - preencheu a primeira planilha
  - mês completo sem cartão de crédito

fazendo_sobrar_dinheiro:
  - orçamento mensal zerado
  - cortou assinaturas não-essenciais
  - sobrou ao menos 10% da renda
  - três meses seguidos sobrando

montando_reserva:
  - definiu meta (6 meses de gasto)
  - criou conta/aplicação separada
  - aporte mensal automático ativo
  - alcançou metade da reserva
  - reserva completa

construindo_patrimonio:
  - definiu perfil de investidor
  - primeiro aporte em renda variável
  - diversificou em ao menos 3 classes
  - rebalanceou a carteira ao menos uma vez
  - patrimônio acumulado de R$ 100k+
```

Itens marcados/desmarcados via `PATCH /alunos/:id` (campo `progressoItensCompletos` aceita array). UI: checkbox list na detail page mostrando só os itens da trilha atual.

## Alternativas consideradas

1. **CASL com regras declarativas** — ADR 0003 cortou, mantém cortado. Para 3 papéis ortogonais, matriz hardcoded em middleware é o tradeoff certo.
2. **Convite com envio de email real** (SendGrid/Resend) — ADR 0010 cortou jobs/integrations. Cortado.
3. **progressoTrilha como tabela relacional** (`trilha_item_completion`) — flexível mas overkill. Array de strings no JSON do Postgres é proporcional.
4. **Cohort retention computado por job noturno + snapshot** — depende de BullMQ (cortado em ADR 0010). Computar on-demand a cada request é OK pra ≤ 100k alunos.
5. **DiceBear self-hosted** — produção real talvez sim; aqui usar API pública dicebear.com é OK (URL pública, sem PII no payload).

## Consequências

- Painel ganha **densidade narrativa**: cada aluno tem rosto, origem, métricas de uso, progresso visível
- Cohort retention vira primeira métrica de retenção observável
- Multi-admin habilita pessoas reais com responsabilidades diferentes
- Checklist tira "trilha" de label decorativa pra **dimensão operacional ativa**
- Quebra explícita do ADR 0003 — sinaliza que pre-kickoff era proporcional ao brief; pós-kickoff acompanha a evolução do produto
- Audit log já registra mudanças desses campos (sem alteração)
- 75 testes do shared seguem passando; novos testes pra DTO acompanham as adições

## O que NÃO está neste ADR

- Envio real de email (convite ou notificação)
- Integração com Circle.so / Pagar.me (login do aluno ainda manual via webhook futuro)
- 2FA para admin
- Job de anonimização agendada
- Aniversário automático no dashboard como "do dia"

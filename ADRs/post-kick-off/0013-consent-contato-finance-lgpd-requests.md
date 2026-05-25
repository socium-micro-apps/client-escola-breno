# ADR 0013 — v3: consent + contato + finance + login audit + LGPD requests

- **Status**: Aceito
- **Data**: 2026-05-24
- **Fase**: pós-kickoff
- **Complementa**: [ADR 0012](./0012-realinhamento-ao-produto-real.md), [ADR 0006](../pre-kick-off/0006-tratamento-pii.md), [ADR 0008](../pre-kick-off/0008-soft-delete.md)
- **Inverte parcialmente**: [ADR 0003](../pre-kick-off/0003-rbac-1-papel.md) na dimensão "auditoria de acesso" (login agora auditado, antes não era)

## Contexto

Após v2 (trilha + assinatura + LGPD ops básicas + audit log per-aluno), faltam quatro dimensões pra um painel completo de operação real:

1. **Consentimento granular (LGPD entrada)** — quem aceitou termos, opt-in/opt-out por canal (`email`, `whatsapp`, `ofertas`). Pré-condição legal pra qualquer comunicação ativa.
2. **Tracking de pedidos LGPD recebidos por outros canais** (telefone, email manual) — DPO precisa registrar prazo de 15 dias e acompanhar.
3. **Dimensão financeira do negócio** — MRR/ARR, valor da assinatura. Hoje o painel não conversa com o lado $$$ do produto.
4. **Auditoria de login do admin** — quem logou, quando, de onde, sucesso/falha. Detecta brute-force e acesso suspeito.
5. **Registro de contato com o aluno** — "liguei sex passada, falou que vai voltar". Operação manual hoje, perdida em planilhas paralelas. Vira primeira-classe.

## Decisão

### 1. Consentimento (Aluno)

Três flags booleanas + timestamp:

```
consentEmail        Boolean = true  (termos aceitos → opt-in default)
consentWhatsapp     Boolean = true
consentOfertas      Boolean = false (ofertas/marketing → opt-in explícito)
termsAcceptedAt     DateTime        (registro do aceite)
```

Mudanças desses campos geram `AuditEvent` (já existe), preservando rastreabilidade.

### 2. Valor da assinatura (Aluno)

```
valorAnualCentavos  Int = 29880  (R$ 298,80 default = o preço público da Escola)
```

Em centavos pra evitar imprecisão de float. Configurável por aluno (alunos antigos podem ter preço promocional).

### 3. Registro de contato (Aluno)

```
ultimoContatoEm     DateTime?
ultimoContatoCanal  CanalContato?  (whatsapp, telefone, email, presencial, outro)
ultimoContatoNota   String?        (até 500 chars; opcional)
```

Endpoint `POST /alunos/:id/contact` registra o contato e gera audit event. Mostra "último contato há Xd" na lista, identifica alunos esquecidos.

### 4. Login audit (LoginAttempt)

Tabela nova:

```
LoginAttempt {
  id          uuid
  email       String  (não FK — falhas podem ser email não-cadastrado)
  ip          String?
  userAgent   String?
  success     Boolean
  reason      String?  (ex: "wrong_password", "user_not_found")
  createdAt   DateTime
}
```

Página `/audit/login` lista últimas N tentativas. Mensagem de erro **continua neutra na rota de login** (ADR 0006 mantido): a tabela registra o motivo real, mas a resposta ao cliente é sempre "credenciais inválidas".

### 5. LGPD requests (LgpdRequest)

Tabela nova pra registrar pedidos LGPD recebidos fora do sistema (DPO precisa rastrear SLA legal de 15 dias):

```
LgpdRequest {
  id                uuid
  aluno             Aluno?       (relação opcional — pode chegar pedido de não-cadastrado)
  requesterEmail    String
  requesterCpf      String?      (opcional — operação pode receber pedido sem ele)
  type              LgpdRequestType  (acesso, retificacao, apagamento, portabilidade, oposicao)
  status            LgpdRequestStatus (recebido, em_andamento, concluido, rejeitado)
  receivedAt        DateTime
  dueAt             DateTime     (= receivedAt + 15 dias)
  completedAt       DateTime?
  notes             String?
  handledByAdmin    Admin?
}
```

Página `/lgpd/requests`. Lista com filtro por status, ordenada por `dueAt` ASC (prazo legal mais próximo no topo). CRUD básico.

## Alternativas consideradas

1. **Consent event-sourced** (tabela `consent_log` com cada mudança) — mais correto teoricamente, mais código. Audit event já cobre histórico. **Cortado**.
2. **Valor por plano (entidade separada)** — coerente se houvesse muitos planos. Hoje 1 plano → premature normalization. **Cortado**.
3. **Login audit em audit_event genérico** — misturaria mutações em Aluno com tentativas de login (dimensões diferentes, retenção diferente). **Cortado**: tabela própria.
4. **LGPD requests como tags/notas no Aluno** — perde rastreamento de prazo, pedidos sem aluno identificado. **Cortado**.
5. **Escolhida**: campos no Aluno + 2 novas tabelas com responsabilidades isoladas.

## Consequências

- Schema cresce: 6 colunas em Aluno + 1 enum (`CanalContato`) + 2 enums + 2 tabelas
- Dashboard ganha 2 KPIs financeiros (MRR/ARR) e 1 panel "atenção requerida" (sem contato, vencendo, em pedidos LGPD pendentes)
- `/audit/login` e `/lgpd/requests` são novas rotas de admin
- Mensagem de erro de login **permanece neutra** ao cliente — log interno detalhado (privilegia ADR 0006)
- LGPD: critério #4 do brief passa de "boa" para "completa" (entrada via consent + saída via anonymize/export + tracking de pedidos externos)
- Audit log per-aluno expandido pra cobrir mudanças de consent, contato, valor

## O que NÃO está neste ADR (próximas ondas)

- Envio real de mensagens (email/WhatsApp) — só registramos templates copiáveis
- Multi-admin com papéis (CASL) — segue pendente
- 2FA TOTP — segue pendente
- Cohort retention / cobranças automáticas — segue pendente
- Integração com Pagar.me / Circle.so — segue pendente

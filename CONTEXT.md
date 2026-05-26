# Contexto do Domínio

> O que outra pessoa (humano ou agente de IA) precisa ler em 5 minutos para entender o **problema** que o sistema resolve — vocabulário do negócio, entidades, decisões de modelagem.
>
> Para o **brief original** veja [BRIEF.md](./BRIEF.md). Para o **histórico de decisões técnicas** veja [`ADRs/`](./ADRs).

---

## O problema

A **Escola do Breno** é uma escola de educação financeira (referência: [planilhadobreno.com.br](https://planilhadobreno.com.br)). Tem uma equipe interna que mantém a base de alunos matriculados: adiciona novos, atualiza contato, ajusta plano, pausa/cancela, registra interações.

Este sistema é o **painel admin** que essa equipe usa todo dia. **Não** é o produto que o aluno consome (planilha, app, comunidade Circle.so) — é a tela de gestão interna.

**Escopo do brief original**: 1 admin, 1 entidade (Aluno), CRUD puro, foco em PII bem tratada. O sistema evoluiu além disso ao longo do desenvolvimento (ver [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md) para honestidade sobre os desvios).

---

## Glossário do domínio

### Vocabulário do negócio

| Termo | Significado |
|---|---|
| **Aluno** | Pessoa matriculada na Escola do Breno. Tem nome, e-mail, CPF, telefone, assinatura e está numa fase da trilha. |
| **Plano** | Tipo de assinatura. Hoje só existe `anual` (R$ 298,80/ano) — espelha o produto real. Enum mantido para evolução. |
| **Status** | Estado da relação com a escola: `ativo` / `pausado` / `cancelado`. Operação altera; **não há regra automática** de transição. |
| **Trilha** | Fase do aluno na jornada financeira, vocabulário oficial da marca: `saindo da dívida` → `fazendo sobrar dinheiro` → `montando reserva` → `construindo patrimônio`. Cada trilha tem um **checklist** de itens marcáveis. |
| **Assinatura** | Período contratado: `dataInicio` + `dataVencimento` + `renovacaoAutomatica`. Valor padrão R$ 298,80 mas configurável (alunos antigos podem ter preço promocional). |
| **Origem (canal)** | Por onde o aluno chegou: Instagram, YouTube, indicação, evento presencial, busca orgânica, anúncio pago. |
| **Consentimento** | Opt-in/out por canal (e-mail, WhatsApp, ofertas) — LGPD. Marcado no cadastro, mutável. |
| **Contato** | Registro manual de uma interação operação → aluno (canal usado + nota opcional). |
| **CPF** | Identificador civil único (11 dígitos). **Dado mais sensível**; tratamento em camadas (ver §PII). |
| **Admin** | Usuário do painel. Tem **papel**: `super_admin`, `operacao` ou `leitura`. |
| **Convite** | Token de uso único, 7d TTL, gerado por super_admin pra adicionar admin novo. |
| **Soft delete** | Apagar não remove a linha; só marca `deletedAt`. Aluno some das listagens (ver [ADR 0008](./ADRs/pre-kick-off/0008-soft-delete.md)). |
| **Anonimização (LGPD)** | Substitui PII por marcadores; preserva linha + audit trail (ver [ADR 0006](./ADRs/pre-kick-off/0006-tratamento-pii.md)). |
| **Mascaramento** | CPF exibido como `***.***.123-45` por padrão. Revelar é ação intencional. |
| **Pedido LGPD** | Solicitação recebida por canal externo (e-mail, telefone) — direito de acesso, retificação, apagamento, portabilidade, oposição. SLA legal de 15 dias. |

---

## Entidades

### `Admin` — quem opera o painel

| Campo | Tipo | Função |
|---|---|---|
| `id` | uuid | PK |
| `email` | string único | login |
| `passwordHash` | string | bcrypt (cost 10) |
| `role` | enum | `super_admin` \| `operacao` \| `leitura` |
| `createdAt`/`updatedAt` | timestamp | auto |

**Permissões por papel** (ver [ADR 0014](./ADRs/post-kick-off/0014-rich-profile-multi-admin-cohort-trilha.md)):

| Operação | super_admin | operacao | leitura |
|---|:-:|:-:|:-:|
| Login + leitura geral | ✅ | ✅ | ✅ |
| CRUD aluno + contato + LGPD requests | ✅ | ✅ | ❌ |
| Anonimização / export (PII máxima) | ✅ | ❌ | ❌ |
| Gerenciar admins + convites | ✅ | ❌ | ❌ |

### `Aluno` — entidade principal

Campos obrigatórios do brief:

| Campo | Tipo | Restrições |
|---|---|---|
| `nome` | string | 2–120 chars |
| `email` | string | único, lowercase trim, validado |
| `cpf` | string (11 dígitos) | único, **validado com dígito verificador** |
| `telefone` | string | normalizado BR (10–11 dígitos, nono dígito 9 obrigatório em celular) |
| `plano` | enum | `anual` |
| `status` | enum | `ativo` \| `pausado` \| `cancelado` |

Assinatura ([ADR 0012](./ADRs/post-kick-off/0012-realinhamento-ao-produto-real.md)):

| Campo | Tipo | Default |
|---|---|---|
| `dataInicio` | timestamp | now |
| `dataVencimento` | timestamp | obrigatório |
| `renovacaoAutomatica` | boolean | true |
| `valorAnualCentavos` | int | 29880 (R$ 298,80) |

Trilha + perfil ([ADR 0014](./ADRs/post-kick-off/0014-rich-profile-multi-admin-cohort-trilha.md)):

| Campo | Tipo | Função |
|---|---|---|
| `trilha` | enum | fase atual; default `saindo_da_divida` |
| `progressoItensCompletos` | string[] | chaves dos itens marcados na trilha |
| `avatarUrl` | string? | DiceBear; gerado a partir do e-mail |
| `origemCanal` | enum? | atribuição (Instagram, YouTube, ...) |
| `origemDetalhe` | string? | até 200 chars |
| `cidade` | string? | |
| `profissao` | string? | |
| `aniversario` | date? | |
| `totalLogins` | int | acessos do aluno ao **produto** (planilha/app/comunidade) — alimentado por webhook futuro |
| `ultimoLoginEm` | timestamp? | idem |

Consent (LGPD entrada — [ADR 0013](./ADRs/post-kick-off/0013-consent-contato-finance-lgpd-requests.md)):

| Campo | Tipo | Default |
|---|---|---|
| `consentEmail` | boolean | true |
| `consentWhatsapp` | boolean | true |
| `consentOfertas` | boolean | false |
| `termsAcceptedAt` | timestamp | now |

Contato manual ([ADR 0013](./ADRs/post-kick-off/0013-consent-contato-finance-lgpd-requests.md)):

| Campo | Tipo |
|---|---|
| `ultimoContatoEm` | timestamp? |
| `ultimoContatoCanal` | enum? (WhatsApp/telefone/e-mail/presencial/outro) |
| `ultimoContatoNota` | string? até 500 chars |

LGPD + lifecycle:

| Campo | Tipo | Função |
|---|---|---|
| `anonymizedAt` | timestamp? | marcador de anonimização aplicada |
| `deletedAt` | timestamp? | soft delete |
| `createdAt`/`updatedAt` | timestamp | auto |

### `AuditEvent` — histórico de mudanças por aluno

| Campo | Tipo |
|---|---|
| `alunoId` | FK |
| `adminId` | FK? (SetNull se admin for removido) |
| `action` | enum (`create`/`update`/`delete`/`restore`/`anonymize`/`contact`) |
| `before` / `after` | JSON com snapshot **mascarado** (CPF/telefone redacted) |
| `createdAt` | timestamp |

> **Nota:** audit log era listado como "fora do escopo" no brief original. Reintroduzido em [ADR 0012](./ADRs/post-kick-off/0012-realinhamento-ao-produto-real.md) — ver [ADR 0015](./ADRs/post-kick-off/0015-auto-critica-desvios-de-escopo.md) para a auto-crítica desse desvio.

### `LoginAttempt` — auditoria de tentativas de login do admin

| Campo | Tipo |
|---|---|
| `email` | string (não FK — falhas podem ser email inexistente) |
| `ip`, `userAgent` | strings opcionais |
| `success` | boolean |
| `reason` | enum (`user_not_found` / `wrong_password`) — interno; resposta ao cliente é sempre neutra |

### `LgpdRequest` — pedidos LGPD recebidos por canais externos

Operação registra pedido recebido (e-mail, telefone, etc.) com prazo legal de 15 dias.

| Campo | Tipo |
|---|---|
| `requesterEmail` | string |
| `requesterCpf` | string? (mascarado na exibição) |
| `type` | enum (`acesso`/`retificacao`/`apagamento`/`portabilidade`/`oposicao`) |
| `status` | enum (`recebido`/`em_andamento`/`concluido`/`rejeitado`) |
| `receivedAt`, `dueAt` | `dueAt = receivedAt + 15d` |
| `completedAt`, `notes`, `handledByAdminId` | preenchidos durante o tratamento |

### `AdminInvite` — convite pendente

`super_admin` convida; token cru exibido **uma vez** na criação, guardado como `bcrypt(hash)`. TTL 7 dias.

---

## O que NÃO está modelado (e por quê)

| Não-entidade | Motivo |
|---|---|
| `Escola` | 1 escola única; modelar gera ruído ([ADR 0002](./ADRs/pre-kick-off/0002-arquitetura-single-tenant.md)) |
| Histórico de mudanças de senha | gap funcional, próxima evolução |
| Pagamentos / cobranças | viria de webhook do gateway (Pagar.me) — não integrado |
| Conteúdo da escola (aulas, módulos) | é responsabilidade de outro sistema (Circle.so / planilha / app) |
| Relacionamentos do aluno (turma, professor) | não há esse modelo no produto real |
| Job agendado de anonimização | ADR 0010 cortou jobs; LGPD ops são síncronas hoje |

---

## Decisões de modelagem (resumo, detalhes nos ADRs)

| Tópico | Decisão | ADR |
|---|---|---|
| CPF armazenamento | Texto + validação + mascaramento na camada de aplicação (sem cifragem em repouso) | [0007](./ADRs/pre-kick-off/0007-cpf-armazenamento.md) |
| E-mail | lowercase + trim na entrada; único | [0005](./ADRs/pre-kick-off/0005-modelagem-aluno.md) |
| Telefone | apenas dígitos, padrão BR (10/11 com 9 obrigatório em celular) | [0005](./ADRs/pre-kick-off/0005-modelagem-aluno.md) |
| Soft delete | `deletedAt` com filtro padrão; sem unicidade parcial | [0008](./ADRs/pre-kick-off/0008-soft-delete.md) |
| `Plano` e `status` | enum em vez de tabela (premature normalization evitada) | [0005](./ADRs/pre-kick-off/0005-modelagem-aluno.md) |
| Sem regras de transição de status | qualquer status pode virar qualquer outro | [0010](./ADRs/pre-kick-off/0010-escopo-cortado.md) |
| Trilha | enum + array de chaves completas (catálogo de itens no shared) | [0014](./ADRs/post-kick-off/0014-rich-profile-multi-admin-cohort-trilha.md) |
| Multi-admin com papéis | reverte ADR 0003 — necessário pra produto real | [0014](./ADRs/post-kick-off/0014-rich-profile-multi-admin-cohort-trilha.md) |

---

## Tratamento de dados sensíveis (PII)

Visão operacional — detalhes em [ADR 0006](./ADRs/pre-kick-off/0006-tratamento-pii.md):

1. **Validação rigorosa no boundary** (Zod + validador de CPF com dígito verificador)
2. **Pino redact** mascara campos sensíveis em todos os logs
3. **DTO de saída** controla o que vai na resposta — Prisma model nunca devolvido cru
4. **Mascaramento de CPF** na resposta e na UI por padrão; revelar é ação intencional
5. **Mensagens de erro neutras** no login (não distingue "usuário não existe" de "senha errada")
6. **Cookies seguros**: `httpOnly` + `secure` (prod) + `sameSite=lax`
7. **Soft delete** preserva histórico; **anonimização** zera PII preservando linha + audit
8. **Audit log** com snapshots mascarados (audit não vira vazamento secundário)
9. **Consent** opt-in/out por canal — base para qualquer comunicação ativa
10. **Pedidos LGPD externos** rastreados com SLA de 15 dias

---

## Como o domínio cresceria (não implementado)

- **Webhook Pagar.me** alimentando `dataVencimento`, `totalLogins`, `ultimoLoginEm` automaticamente
- **Integração Circle.so** sincronizando ativos com membros da comunidade
- **Job agendado** de anonimização por política de retenção (reintroduz BullMQ)
- **2FA TOTP** para admins
- **Cohort retention** mais sofisticado (segmentação por origem, etc.)
- **Importação em massa** via CSV (operação + bronze/silver/gold da casa)
- **Histórico de mudanças de senha** + revocação de JWT (token blacklist)

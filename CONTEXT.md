# Contexto do Domínio

> O que outra pessoa (humano ou agente de IA) precisa ler em 5 minutos para entender o **problema** — não o código. Vocabulário do negócio, decisões de modelagem, motivações.

---

## O problema

A **Escola do Breno** é uma escola de educação financeira. Tem uma equipe interna (a **secretaria/operação**) que precisa manter a base de **alunos** matriculados: adicionar matrículas novas, atualizar contato, ajustar o plano contratado, pausar ou cancelar alunos.

Hoje, a operação imaginária não tem ferramenta dedicada. O painel deste case **é** essa ferramenta.

**Escopo intencionalmente pequeno**: 1 escola, 1 admin operando, 1 entidade modelada. Não é portal do aluno. Não é dashboard analítico. É a tela que a operação abre no dia a dia para encontrar um aluno, editar um dado, registrar uma mudança de status.

---

## Glossário do domínio

| Termo | Significado |
|---|---|
| **Aluno** | Pessoa matriculada na Escola do Breno. Tem nome, e-mail, CPF, telefone, um plano contratado e um status atual. |
| **Plano** | Tipo de assinatura do aluno. Dois valores no domínio: `basic` e `premium`. Não há regra de transição entre planos — operação faz manualmente. |
| **Status** | Estado da relação do aluno com a escola. Três valores: `ativo` (acessa o conteúdo), `pausado` (pausou voluntariamente — assinatura suspensa), `cancelado` (encerrou). **Não há regra de transição** — qualquer status pode virar qualquer outro; quem decide é a operação, não o sistema. |
| **CPF** | Identificador civil único da pessoa (11 dígitos). Dado sensível sob LGPD. |
| **Admin** | Usuário do painel. Representa a operação/secretaria da escola. Há apenas um (ver ADR 0003). |
| **Matrícula** | Ato de cadastrar um aluno novo. Neste case, equivalente a "criar aluno". |
| **Soft delete** | Apagar um aluno **não** remove a linha do banco — apenas marca `deletedAt`. O registro some das listagens (ver ADR 0008). |
| **Mascaramento** | Forma de exibir um CPF protegendo a maior parte dos dígitos: `***.***.123-45`. Padrão na UI; revelar é ação intencional (ver ADR 0006). |

---

## Modelagem

### Entidade `Aluno`

| Campo | Tipo | Restrições | Por quê |
|---|---|---|---|
| `id` | uuid | PK | identificador interno, independente de PII |
| `nome` | string | obrigatório, 2–120 chars | dado básico de identificação |
| `email` | string | obrigatório, único, lowercase trim | canal de contato, identificador secundário |
| `cpf` | string (11 dígitos) | obrigatório, único, validado | identificador civil; dado mais sensível |
| `telefone` | string | obrigatório, normalizado BR | canal de contato direto |
| `plano` | enum (`basic`\|`premium`) | obrigatório | tipo de assinatura — sem hierarquia, sem regras |
| `status` | enum (`ativo`\|`pausado`\|`cancelado`) | obrigatório, default `ativo` | estado operacional — qualquer transição permitida |
| `createdAt` | timestamp | auto | rastreabilidade |
| `updatedAt` | timestamp | auto | rastreabilidade |
| `deletedAt` | timestamp \| null | nullable | soft delete |

**Sem outros campos.** A tentação de adicionar `dataNascimento`, `endereco`, `responsavelLegal`, `observacoes` foi rejeitada — o brief não os pede e cada campo PII adicional aumenta superfície de risco. Ver [ADR 0005](./ADRs/pre-kick-off/0005-modelagem-aluno.md).

### Entidade `Admin`

| Campo | Tipo | Restrições |
|---|---|---|
| `id` | uuid | PK |
| `email` | string | único |
| `passwordHash` | string | bcrypt (cost 10) |
| `createdAt` | timestamp | auto |
| `updatedAt` | timestamp | auto |

Sempre **um único** admin no sistema (semeado pelo seed). Não há cadastro de novos admins via API.

### O que **não** está modelado (e por quê)

- **Escola** (entidade) — só uma; modelar gera ruído (ver [ADR 0002](./ADRs/pre-kick-off/0002-arquitetura-single-tenant.md)).
- **Papéis / permissões** — só um papel (ADMIN); RBAC desnecessário (ver [ADR 0003](./ADRs/pre-kick-off/0003-rbac-1-papel.md)).
- **Histórico de mudanças** — audit log está fora do escopo do brief.
- **Pagamentos / cobranças** — não foi pedido.
- **Conteúdo da escola / aulas** — não foi pedido.
- **Relacionamentos do aluno (turma, professor, responsável)** — não foi pedido, e o brief alerta contra invenção de requisitos.

---

## Decisões de modelagem

### CPF: armazenado em texto, mascarado em camada de aplicação

CPF entra no DB validado (dígito verificador) e único. **Não** é criptografado em repouso. A defesa é em camadas: validação no boundary, redaction em log, DTO de saída mascarando por padrão, cookies seguros, acesso restrito ao DB. Detalhes e alternativas: [ADR 0006](./ADRs/pre-kick-off/0006-tratamento-pii.md) e [ADR 0007](./ADRs/pre-kick-off/0007-cpf-armazenamento.md).

### E-mail: lowercase normalizado, único

E-mails são case-insensitive na prática. O modelo guarda lowercase para evitar duplicidade silenciosa (`Joao@x.com` vs `joao@x.com`).

### Telefone: apenas dígitos, padrão BR

O input do form aceita formatos com máscara, mas o storage é normalizado (apenas dígitos, com DDD). Validação aceita 10 ou 11 dígitos (fixo ou celular).

### Soft delete sem unicidade parcial

`email` e `cpf` permanecem únicos no DB mesmo após `deletedAt` ser preenchido. Tentar recriar um aluno deletado retorna 409. Justificativa em [ADR 0008](./ADRs/pre-kick-off/0008-soft-delete.md).

### Plano e Status: enums, não tabelas

Dois valores fixos cada. Normalizar como tabela separada seria *premature normalization* — joins desnecessários e mais código sem benefício.

### Sem regras de negócio sobre status

Qualquer status pode transitar para qualquer outro. Quem decide é a operação, não o sistema. O brief é explícito: *"Não há regras de negócio sobre os alunos."* A tentação de adicionar transições foi rejeitada e registrada em [ADR 0010](./ADRs/pre-kick-off/0010-escopo-cortado.md).

---

## Tratamento de dados sensíveis (PII)

Resumo operacional — detalhes em [ADR 0006](./ADRs/pre-kick-off/0006-tratamento-pii.md):

1. **Validação rigorosa no boundary** (Zod + validador de CPF com dígito verificador)
2. **Pino redact** mascara campos sensíveis em todos os logs
3. **DTO de saída** controla o que vai para a API — Prisma model nunca cru
4. **Mascaramento de CPF na resposta e na UI** por padrão
5. **Mensagens de erro neutras** no login
6. **Cookies seguros** (httpOnly + secure + sameSite=lax)
7. **Soft delete** preserva histórico; caminho para anonimização documentado

---

## Como o domínio cresceria (não implementado)

Pontos previsíveis de evolução, listados aqui para contexto futuro:

- **Importar matrículas em lote** (CSV/Excel) → reintroduz `bronze/silver/gold` da casa
- **Múltiplas escolas** → reintroduz multi-tenancy ([ADR 0002](./ADRs/pre-kick-off/0002-arquitetura-single-tenant.md))
- **Múltiplos papéis** (atendente, gestor, super-admin) → reintroduz CASL ([ADR 0003](./ADRs/pre-kick-off/0003-rbac-1-papel.md))
- **Anonimização agendada** de alunos deletados → reintroduz BullMQ ([ADR 0001](./ADRs/pre-kick-off/0001-stack-escolhido.md))
- **Audit log** (quem editou o quê quando) → tabela de eventos + middleware

Cada um teria seu próprio ADR. Hoje, **nada disso** está no escopo.

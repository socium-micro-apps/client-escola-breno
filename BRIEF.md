# Teste técnico - Desenvolvedor Fullstack Sênior

## O que estamos avaliando (e o que não estamos)

Você **não** está sendo avaliada por:
- Velocidade de codar
- Quantidade de features entregues
- Polimento de UI

Você **está** sendo avaliada por:
1. Como organiza um projeto greenfield
2. Como documenta decisões arquiteturais (ADRs)
3. Como modela o domínio (CONTEXT.md)
4. Como trata dados sensíveis (PII)
5. Como pilota IA no workflow de desenvolvimento

## O que você vai construir

Um **painel administrativo de gestão de alunos** da Escola do Breno.

Funcionalidades:
- Login do admin
- Listar alunos
- Adicionar aluno
- Editar dados do aluno
- Apagar aluno

**Não há regras de negócio sobre os alunos.** Foco em CRUD limpo, bem modelado e seguro. Não invente transições de status, workflows ou regras tipo "não pode editar aluno cancelado". Se vier a vontade de fazer isso, segure e documente em ADR por que decidiu não fazer.

### Entidade Aluno

Mínimo obrigatório:
- nome
- email
- CPF
- telefone
- plano contratado (sugestão: `basic`, `premium`)
- status (sugestão: `ativo`, `cancelado`, `pausado`)

Você pode adicionar outros campos se considerar relevante. **Justifique a modelagem em um ADR.**

## Stack obrigatório

- **TypeScript** (frontend e backend)
- **PostgreSQL**
- **Docker Compose** (todo o setup precisa rodar com `docker compose up`)

### O resto é sua escolha

Frameworks (Next.js, Express, Fastify, Hono, Vite, etc), ORM (Prisma, Drizzle, Kysely, SQL puro), bibliotecas, organização de pastas, estratégia de auth: **decisão sua**. **Documente em ADR.**

## Sobre uso de IA

Vamos usar **Claude Code** ativamente no workflow. Esperamos que você também use IA (Claude Code, Cursor, Copilot, ChatGPT, qualquer ferramenta).

Não escondemos o uso de IA, e não esperamos que você esconda também.

**O que avaliamos:**
- O repositório final
- Os ADRs
- O CONTEXT.md
- A organização e disciplina do código

**O que NÃO avaliamos:**
- Suas sessões de IA
- Quantos prompts você usou
- Quanto código foi gerado vs digitado

Mencione no README qual ferramenta principal você usou. É só pra contexto, não influencia escolha.

**Referência opcional** pra estruturar seu workflow de IA: [mattpocock/skills](https://github.com/mattpocock/skills).

## Deliverables

Um **repositório público no GitHub** contendo:

### Código
- Frontend em TypeScript
- Backend em TypeScript
- Banco PostgreSQL
- Tudo orquestrado por `docker-compose.yml`

### Documentação

**`README.md`** na raiz, contendo:
- Setup em 1 comando (`docker compose up` deve subir tudo do zero)
- Como acessar como admin (credenciais de teste, seed automático, ou comando)
- Resumo do que foi entregue: must-have, nice-to-have feitos, fora do escopo
- Qual ferramenta de IA principal você usou

**`CONTEXT.md`** na raiz:
- Glossário do **domínio** (vocabulário do problema, não do código)
- Decisões de modelagem (por que essas entidades, esses campos, essas relações)
- Não é regurgitação do README. É o documento que outra pessoa (humano ou agente de IA) leria pra entender o domínio em 5 minutos.

**ADRs (Architecture Decision Records)** em `docs/adr/`:
- Mínimo **2**, sem máximo
- Formato livre, mas cada ADR precisa conter: **contexto, decisão, alternativas consideradas, consequências**
- ADR é registro de **decisão real**, não documentação de escolha óbvia. "Usar TypeScript" não é ADR (já era obrigatório). "Usar Drizzle ao invés de Prisma porque X" é ADR.
- Sugestões de tópicos: stack escolhido, estratégia de auth, modelagem do schema, organização de pastas, estratégia de validação, o que foi cortado e por quê.

### Testes
- Lógica de **validação** e **autorização** precisa ter testes.
- Não precisa testar componentes React/frontend nem ter cobertura alta. Foque no que importa: o que valida CPF? quem pode acessar o quê? as regras estão corretas?

## Must-have

- [ ] Login admin (qualquer estratégia: cookie, JWT, sessão)
- [ ] CRUD completo do aluno: listar, adicionar, editar, apagar
- [ ] Validação server-side dos campos sensíveis (CPF, email, telefone)
- [ ] Testes em lógica de validação e autorização
- [ ] `docker compose up` funcionando do zero
- [ ] README + CONTEXT.md + ≥ 2 ADRs

## Nice-to-have

- Filtros e busca na listagem
- Soft delete ao invés de hard delete (com ADR justificando)
- Lint configurado
- Testes de API
- ADRs adicionais

## Fora do escopo (não faça)

- Audit log / histórico de edições
- Regras de negócio sobre alunos (transições de status, "não pode editar cancelado", etc)
- Triggers, jobs, workflows agendados
- State machines
- UI bonita / branding / design polido

## Como entregar

1. Crie um repositório **público** no GitHub.
2. Faça todos os commits no repo. **Histórico de commits faz parte da entrega.**
3. README deve ter setup em 1 comando funcionando do zero.

## Perguntas?

Se algo neste brief estiver ambíguo: **decida você e documente em ADR.** Isso é parte do teste - sênior decide com info incompleta.

Se for impeditivo (não consegue avançar sem resposta), mande mensagem.

Boa sorte.

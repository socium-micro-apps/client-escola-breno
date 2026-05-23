# ADR 0011 — Aplicação parcial da filosofia data-first

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

`pasta inicial/OurWayOfWork.md` da casa institui a filosofia **data-first**:

> "Antes de construir a aplicação, estruturamos os dados."

Princípios incluem camadas **bronze → silver → gold**, separação entre **orquestração** e **API**, transformações no banco, evolução de dados crus para confiáveis.

A filosofia é claramente desenhada para projetos com **pipelines ETL** e **múltiplas fontes**. O case é um CRUD de 1 entidade sem fonte externa: aluno chega via formulário, é salvo, é editado, é deletado.

Aplicar bronze/silver/gold ao CRUD seria cerimônia sem propósito. Ignorar OurWayOfWork desalinha a entrega da convenção da casa.

## Decisão

**Adoção parcial e proporcional**:

### Aplicado
- **Schema modelado antes da UI** (data first literal)
- **Migrations versionadas** com Prisma (rastreabilidade)
- **Compartimentação via Docker** (Postgres em container separado da API e do front — conforme princípio "compartimentos")
- **Padronização** de nomes, tipos e validações (princípio "padronização")
- **Banco como fundação** — `docker compose up` provisiona Postgres antes de qualquer app

### Não aplicado (com motivo)
- **Bronze/silver/gold** — não há fontes brutas a transformar. O aluno chega via formulário validado (já é gold). Camadas adicionais seriam tabelas vazias com cerimônia.
- **Camada de orquestração** — sem rotinas agendadas, sem ingestão programada (fora do escopo do brief, ver ADR 0010)
- **Transformações no banco** — para um CRUD, lógica de validação fica no boundary (Zod), não em triggers/views

## Alternativas consideradas

1. **Aplicar bronze/silver/gold mesmo no CRUD** (ex: views como gold, tabela base como silver) — Cerimônia sem propósito. Documentação confusa para quem chega.
2. **Ignorar OurWayOfWork** — Desalinha com a casa sem motivo. Perde demonstração de compreensão da filosofia.
3. **Aplicar OurWayOfWork "como se" houvesse fonte externa** (ex: tratar payload do form como bronze e tabela como gold) — Reinterpretação forçada; aumenta complexidade sem benefício.
4. **Escolhida**: adoção parcial proporcional ao domínio. Honra os **princípios universais** (data first, compartimentação, padronização, banco como fundação) e corta o que assume um perfil de projeto que não é este.

## Consequências

- Schema é o entregável fundacional — sai antes do front
- Compartimentos Docker explícitos (DB / backend / frontend), conforme OurWayOfWork
- Crescimento futuro reintroduz camadas naturalmente:
  - **Importar matrículas de planilha** → bronze (raw CSV/Excel) + silver (validado) + gold (`Aluno`)
  - **Rotinas agendadas** (anonimização, notificações) → orquestração via BullMQ
- ADR documenta o princípio: **filosofia adapta-se ao domínio, não o domínio à filosofia**

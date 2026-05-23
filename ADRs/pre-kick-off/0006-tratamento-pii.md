# ADR 0006 — Tratamento de PII

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

Brief avalia explicitamente **"como trata dados sensíveis (PII)"** como critério #4. O domínio tem:
- CPF (alta sensibilidade — LGPD, identificador único nacional)
- E-mail (média)
- Telefone (média)
- Nome (médio quando combinado)

O `stack-reference.md` da casa não tem seção dedicada a PII (segurança aparece como helmet, rate limit, cookies). Este case adiciona a seção (ver [stack.md §PII](../../stack.md)).

## Decisão

Defesa em camadas, obrigatória em todas as rotas que tocam PII:

1. **Validação server-side rigorosa** (Zod + validadores específicos)
   - CPF: dígito verificador (não apenas formato)
   - E-mail: RFC + normalização (`.trim().toLowerCase()`)
   - Telefone: normalização BR (apenas dígitos, comprimento esperado)

2. **Redaction em log** via `pino.redact`
   - Caminhos mascarados em qualquer profundidade: `cpf`, `email`, `telefone`, `phone`, `password`, `senha`, `token`, `cookie`, `authorization`, `req.body.cpf`, `req.body.email`, etc.
   - Body de rotas sensíveis (login, criar/editar aluno) **não loga** payload bruto

3. **DTO de saída explícito**
   - Camada de serialização entre Prisma model e response
   - Model nunca devolvido cru
   - DTO controla mascaramento (CPF → `***.***.123-45`) e ausência (sem hash de senha em response)

4. **Mascaramento na resposta da API e na UI**
   - CPF mascarado **por padrão** em listagens e edições
   - "Mostrar" é ação intencional (botão revelar), idealmente registrável

5. **Mensagens de erro neutras**
   - Login: `credenciais inválidas` (sem distinguir usuário/senha)
   - Conflito de unicidade: 409 com `email já está em uso` (revela existência, aceito para email; **não** revela para CPF — usar mensagem genérica de "dados inválidos")

6. **Cookies seguros** (ver ADR 0004)

7. **Soft delete + caminho de anonimização** (ver ADR 0008)

Detalhes de CPF em ADR 0007.

## Alternativas consideradas

1. **Criptografar tudo no banco** — Atrapalha validação, busca e unicidade; falsa segurança se logs vazam ou DTO devolve cru. Defesa em camadas é mais robusta.
2. **Apenas validação, sem redaction/mascaramento** — Logs vazam payload em erros; respostas devolvem PII em claro. Falha em LGPD na prática.
3. **Apenas mascaramento na UI** — Backend ainda devolve PII em claro; outro cliente acessa o JSON. Inseguro.
4. **Escolhida**: defesa em camadas (validação + redaction + DTO + mascaramento + cookies + soft-delete). Cada camada falha independentemente.

## Consequências

- Logs auditáveis sem expor dados
- Frontend confia que a API não vaza
- Pequeno overhead de mascaramento/serialização — aceitável
- Conjunto de testes obrigatório: validador de CPF, validador de e-mail, validador de telefone, redaction de log (snapshot), DTO mascara CPF
- LGPD: passo seguinte é política formal de retenção e anonimização — registrar em ADR pós-kickoff quando aplicável

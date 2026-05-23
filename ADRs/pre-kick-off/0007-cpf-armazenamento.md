# ADR 0007 — Armazenamento de CPF: texto + validação + mascaramento

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

CPF é o dado mais sensível do domínio. Três abordagens viáveis:

- **A** — Texto único, validado, **sem** criptografia em repouso. Defesa fica na camada de aplicação (DTO, mascaramento, redaction) e infra (acesso restrito ao DB, cookies seguros).
- **B** — Texto único, validado, **com criptografia em coluna** (pgcrypto ou camada de aplicação com AES). Defende contra dump do banco.
- **C** — **Hash determinístico** (para busca/unicidade) + texto cifrado separado (para exibição). Padrão de produção bancária / fintech.

Trade-off central: proporcionalidade entre proteção e complexidade dado o escopo (1 admin, ambiente de avaliação, sem volume de risco real).

## Decisão

**Opção A**: CPF armazenado em texto, **único**, **validado** (dígito verificador), **mascarado** na resposta da API e UI, **redacted** em logs.

- Coluna: `cpf VARCHAR(11)`, único, NOT NULL
- Validação no boundary (Zod + função de dígito verificador)
- Mascaramento via DTO (default `***.***.123-45`; revelar é intencional)
- Redaction em Pino (ver ADR 0006)

Caminho de upgrade para **C** documentado para uso em produção real.

## Alternativas consideradas

1. **B (criptografia de coluna com pgcrypto)** — Defende dump, mas complica busca exata e unicidade (precisa cifragem determinística com IV fixo, com riscos próprios). Para o escopo do case, peso > benefício.
2. **C (hash determinístico + cifra)** — Padrão correto em produção real (fintech, saúde). Para o case é overengineering teatral; multiplicaria código, dificultaria testes, sem proteger contra o vetor real de risco do case (ambiente de avaliação local).
3. **Escolhida**: **A** com proporcionalidade explícita. Defesa **em camadas** (validação + DTO + mascaramento + redaction + cookies + acesso restrito ao DB) cobre os vetores reais deste escopo. Em produção real, migrar para **C** — caminho de migration documentável.

## Consequências

- Schema simples, busca exata por CPF trivial (`WHERE cpf = ?`)
- Validação obrigatória no boundary impede CPF inválido entrar no DB
- Defesa de PII concentrada na camada de aplicação (ver ADR 0006)
- Em produção real recomenda-se migrar para **C** — registrar novo ADR e migration de transformação
- Decisão registrada com **proporcionalidade** explícita: o case avalia critério, não força produção-grade onde não faz sentido

# ADR 0004 — Auth: JWT em cookie httpOnly

- **Status**: Aceito
- **Data**: 2026-05-23
- **Fase**: pré-kickoff

## Contexto

Brief permite qualquer estratégia de autenticação (cookie, JWT, sessão). O `stack-reference.md` institui JWT armazenado em cookie `httpOnly`.

Precisamos definir:
- onde guardar o token
- como expirar
- se há refresh token
- se há recuperação de senha
- proteções contra ataques comuns (XSS, CSRF, brute force)

## Decisão

- **JWT** assinado com `JWT_SECRET` (HMAC SHA-256), payload mínimo: `sub` (user id), `role` (`ADMIN`), `iat`, `exp`
- **Cookie**: `httpOnly: true`, `secure: true` em produção, `sameSite: 'lax'`, `maxAge` alinhado a `JWT_EXPIRES_IN` (default 7d)
- **Senha** hasheada com `bcrypt` (cost 10)
- **Rate limit** na rota `POST /auth/login` via `express-rate-limit`
- **Mensagem de erro neutra** no login: `"credenciais inválidas"` (sem distinguir "usuário não existe" de "senha errada")
- **Sem refresh token** — sessão única de 7 dias é proporcional para admin interno
- **Sem recuperação de senha por e-mail** — 1 admin seed; reset operacional via re-seed
- **Sem 2FA / SSO / OAuth** — fora do escopo do brief
- **Logout** = `res.clearCookie('auth')` (server-side stateless é suficiente)

## Alternativas consideradas

1. **JWT em `localStorage`** — XSS expõe o token. Rejeitado.
2. **Sessão server-side com store (Redis/DB)** — Adiciona infraestrutura (Redis cortado em ADR 0001) ou tabela de sessões. Overhead sem benefício para 1 usuário.
3. **JWT em cookie + refresh token rotativo** — Padrão robusto para SPAs com sessão curta; aqui adiciona complexidade sem ganho (7 dias é aceitável; usuário re-loga).
4. **Escolhida**: JWT em cookie httpOnly + bcrypt + rate limit + erros neutros. Refresh adicionável depois sem migration.

## Consequências

- XSS isolado (não acessa o cookie httpOnly)
- CSRF mitigado por `sameSite=lax` + API JSON-only (sem submissão de form cross-site)
- Brute force mitigado por rate limit
- Renovação = re-login (UX aceitável para painel interno)
- Auditoria via Pino (sem PII em log — ver ADR 0006)
- Testes obrigatórios: login com credencial inválida, rota protegida sem cookie, rota protegida com cookie expirado, rate limit ativando

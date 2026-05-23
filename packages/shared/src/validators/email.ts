// Email validation — RFC 5322 (subset prático) + normalização.
// Ver ADR 0006 (PII).

// Padrão prático que cobre 99% dos casos sem cair em ReDoS.
// Não é exaustivo; e-mails extremos exigem libs como `email-validator`.
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const MAX_EMAIL_LENGTH = 254; // limite prático RFC 5321

/**
 * Normaliza e-mail: lowercase + trim.
 * Domínios são case-insensitive na prática.
 */
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Valida e-mail no formato prático.
 * - Não vazio
 * - Estrutura local@dominio.tld
 * - Limite de 254 caracteres
 */
export function isValidEmail(value: string | null | undefined): boolean {
  if (value == null) return false;

  const normalized = normalizeEmail(value);
  if (normalized.length === 0) return false;
  if (normalized.length > MAX_EMAIL_LENGTH) return false;

  return EMAIL_REGEX.test(normalized);
}

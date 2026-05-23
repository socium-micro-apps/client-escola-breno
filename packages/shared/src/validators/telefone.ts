// Telefone BR — normalização e validação.
// Ver ADR 0006 (PII).
//
// Formato aceito:
// - 10 dígitos: fixo (DDD + 8 dígitos)
// - 11 dígitos: celular (DDD + 9 + 8 dígitos)
//
// Entrada do form pode ter formatação ("(11) 98765-4321"), o storage é apenas dígitos.

const MIN_DDD = 11;
const MAX_DDD = 99;
const FIXED_LENGTH = 10;
const MOBILE_LENGTH = 11;
const MOBILE_NINTH_DIGIT = '9';

/**
 * Remove formatação do telefone, mantendo apenas dígitos.
 */
export function normalizeTelefone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Formata telefone para exibição.
 * - 10 dígitos: "(11) 1234-5678"
 * - 11 dígitos: "(11) 91234-5678"
 */
export function formatTelefone(value: string): string {
  const digits = normalizeTelefone(value);
  if (digits.length === FIXED_LENGTH) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === MOBILE_LENGTH) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return value;
}

/**
 * Valida telefone BR (fixo ou celular).
 *
 * Regras:
 * - 10 ou 11 dígitos
 * - DDD entre 11 e 99
 * - Se 11 dígitos, o 3º caractere (1º depois do DDD) precisa ser 9 (regra da Anatel)
 */
export function isValidTelefone(value: string | null | undefined): boolean {
  if (value == null) return false;

  const digits = normalizeTelefone(value);
  if (digits.length !== FIXED_LENGTH && digits.length !== MOBILE_LENGTH) return false;

  const ddd = Number(digits.slice(0, 2));
  if (Number.isNaN(ddd) || ddd < MIN_DDD || ddd > MAX_DDD) return false;

  if (digits.length === MOBILE_LENGTH && digits[2] !== MOBILE_NINTH_DIGIT) return false;

  return true;
}

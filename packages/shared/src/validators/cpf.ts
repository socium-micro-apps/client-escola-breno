// CPF validation — algoritmo oficial dos dígitos verificadores.
// Ver ADR 0006 (PII) e ADR 0007 (CPF storage).

const CPF_LENGTH = 11;

/**
 * Remove formatação do CPF, mantendo apenas dígitos.
 * Aceita entradas como "123.456.789-09" → "12345678909".
 */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Aplica máscara visual ao CPF. Apenas para exibição.
 * "12345678909" → "***.***.789-09" (oculta os 6 primeiros dígitos).
 */
export function maskCpf(value: string): string {
  const digits = normalizeCpf(value);
  if (digits.length !== CPF_LENGTH) return value;
  return `***.***.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formata o CPF com a máscara padrão "123.456.789-09".
 * Usado para exibição reveladora (ação intencional do admin).
 */
export function formatCpf(value: string): string {
  const digits = normalizeCpf(value);
  if (digits.length !== CPF_LENGTH) return value;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Valida um CPF.
 *
 * Regras:
 * - 11 dígitos (após remoção de formatação)
 * - Rejeita CPFs com todos os dígitos iguais (00000000000, 11111111111, ...)
 *   — são tecnicamente válidos pelo algoritmo mas não emitidos pela Receita
 * - Valida os dois dígitos verificadores (módulo 11)
 */
export function isValidCpf(value: string | null | undefined): boolean {
  if (value == null) return false;

  const digits = normalizeCpf(value);
  if (digits.length !== CPF_LENGTH) return false;
  if (!/^\d{11}$/.test(digits)) return false;

  // Rejeita CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const computeCheckDigit = (slice: string, weightStart: number): number => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += Number(slice[i]) * (weightStart - i);
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstNine = digits.slice(0, 9);
  const expectedDigit10 = computeCheckDigit(firstNine, 10);
  if (Number(digits[9]) !== expectedDigit10) return false;

  const firstTen = digits.slice(0, 10);
  const expectedDigit11 = computeCheckDigit(firstTen, 11);
  if (Number(digits[10]) !== expectedDigit11) return false;

  return true;
}

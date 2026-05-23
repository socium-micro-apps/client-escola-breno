import { describe, expect, it } from 'vitest';
import { isValidEmail, normalizeEmail } from './email.js';

describe('normalizeEmail', () => {
  it('aplica lowercase', () => {
    expect(normalizeEmail('Joao@Escola.com')).toBe('joao@escola.com');
  });

  it('remove espaços nas pontas', () => {
    expect(normalizeEmail('  joao@escola.com  ')).toBe('joao@escola.com');
  });

  it('preserva o local-part interno', () => {
    expect(normalizeEmail('joao.silva+admin@escola.com')).toBe('joao.silva+admin@escola.com');
  });
});

describe('isValidEmail', () => {
  describe('e-mails válidos', () => {
    const validEmails = [
      'a@b.co',
      'admin@escolabreno.com.br',
      'joao.silva@example.com',
      'user+tag@example.org',
      'first.last@sub.domain.com',
      'USER@EXAMPLE.COM', // case-insensitive
      '  spaces@trimmed.com  ', // será normalizado
    ];

    it.each(validEmails)('aceita: %s', (email) => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  describe('e-mails inválidos', () => {
    const invalidEmails = [
      '',
      'plainaddress',
      '@missing-local.com',
      'missing-at.com',
      'missing-domain@',
      'spaces in@local.com',
      'two@@signs.com',
      'no-tld@domain',
      'a@b', // sem TLD
      'a@.com', // domínio vazio
    ];

    it.each(invalidEmails)('rejeita: "%s"', (email) => {
      expect(isValidEmail(email)).toBe(false);
    });

    it('rejeita e-mail acima de 254 chars', () => {
      const tooLong = 'a'.repeat(250) + '@b.co';
      expect(isValidEmail(tooLong)).toBe(false);
    });

    it('rejeita null e undefined', () => {
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
    });
  });
});

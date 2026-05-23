import { describe, expect, it } from 'vitest';
import { formatTelefone, isValidTelefone, normalizeTelefone } from './telefone.js';

describe('normalizeTelefone', () => {
  it('remove parênteses, hífen, espaços', () => {
    expect(normalizeTelefone('(11) 98765-4321')).toBe('11987654321');
    expect(normalizeTelefone('11 9876-5432')).toBe('1198765432');
  });

  it('mantém entrada apenas com dígitos', () => {
    expect(normalizeTelefone('11987654321')).toBe('11987654321');
  });
});

describe('formatTelefone', () => {
  it('formata celular (11 dígitos)', () => {
    expect(formatTelefone('11987654321')).toBe('(11) 98765-4321');
  });

  it('formata fixo (10 dígitos)', () => {
    expect(formatTelefone('1112345678')).toBe('(11) 1234-5678');
  });

  it('retorna entrada se comprimento inválido', () => {
    expect(formatTelefone('123')).toBe('123');
  });
});

describe('isValidTelefone', () => {
  describe('telefones válidos', () => {
    const validNumbers = [
      '11987654321', // celular SP
      '21976543210', // celular RJ
      '31998877665',
      '41987651122',
      '1112345678', // fixo SP (10 dígitos)
      '2133445566', // fixo RJ
      '(11) 98765-4321', // formatado
      '(11) 1234-5678', // fixo formatado
    ];

    it.each(validNumbers)('aceita: %s', (telefone) => {
      expect(isValidTelefone(telefone)).toBe(true);
    });
  });

  describe('telefones inválidos', () => {
    it('rejeita comprimento errado', () => {
      expect(isValidTelefone('123')).toBe(false);
      expect(isValidTelefone('123456789')).toBe(false); // 9 dígitos
      expect(isValidTelefone('123456789012')).toBe(false); // 12 dígitos
    });

    it('rejeita DDD inválido', () => {
      expect(isValidTelefone('01987654321')).toBe(false); // DDD 01
      expect(isValidTelefone('10987654321')).toBe(false); // DDD 10
    });

    it('rejeita celular sem o nono dígito 9', () => {
      expect(isValidTelefone('11887654321')).toBe(false); // começa com 8, não 9
      expect(isValidTelefone('11787654321')).toBe(false);
    });

    it('rejeita entrada não numérica', () => {
      expect(isValidTelefone('telefone aqui')).toBe(false);
      expect(isValidTelefone('')).toBe(false);
    });

    it('rejeita null e undefined', () => {
      expect(isValidTelefone(null)).toBe(false);
      expect(isValidTelefone(undefined)).toBe(false);
    });
  });
});

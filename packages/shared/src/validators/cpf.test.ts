import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf, maskCpf, normalizeCpf } from './cpf.js';

describe('normalizeCpf', () => {
  it('remove pontos, traços e espaços', () => {
    expect(normalizeCpf('123.456.789-09')).toBe('12345678909');
    expect(normalizeCpf(' 123 456 789 09 ')).toBe('12345678909');
    expect(normalizeCpf('123-456-789-09')).toBe('12345678909');
  });

  it('mantém string apenas com dígitos inalterada', () => {
    expect(normalizeCpf('12345678909')).toBe('12345678909');
  });

  it('retorna string vazia para entrada sem dígitos', () => {
    expect(normalizeCpf('---')).toBe('');
    expect(normalizeCpf('')).toBe('');
  });
});

describe('maskCpf', () => {
  it('oculta os 6 primeiros dígitos', () => {
    expect(maskCpf('52998224725')).toBe('***.***.247-25');
  });

  it('funciona com CPF já formatado', () => {
    expect(maskCpf('529.982.247-25')).toBe('***.***.247-25');
  });

  it('retorna a entrada original se não tiver 11 dígitos', () => {
    expect(maskCpf('123')).toBe('123');
    expect(maskCpf('')).toBe('');
  });
});

describe('formatCpf', () => {
  it('aplica máscara padrão com 3.3.3-2', () => {
    expect(formatCpf('52998224725')).toBe('529.982.247-25');
  });

  it('retorna a entrada se não tiver 11 dígitos', () => {
    expect(formatCpf('123')).toBe('123');
  });
});

describe('isValidCpf', () => {
  describe('CPFs válidos', () => {
    const validCpfs = [
      '52998224725',
      '11144477735',
      '93541134780',
      '39053344705',
      '15350946056',
      '04094445102',
      '46625325821',
      '70283457007',
    ];

    it.each(validCpfs)('aceita CPF válido: %s', (cpf) => {
      expect(isValidCpf(cpf)).toBe(true);
    });

    it('aceita CPF válido com formatação', () => {
      expect(isValidCpf('529.982.247-25')).toBe(true);
      expect(isValidCpf('111.444.777-35')).toBe(true);
    });
  });

  describe('CPFs inválidos', () => {
    it('rejeita CPF com dígito verificador errado', () => {
      expect(isValidCpf('52998224726')).toBe(false); // último dígito alterado
      expect(isValidCpf('11144477734')).toBe(false);
    });

    it('rejeita CPFs com todos os dígitos iguais', () => {
      expect(isValidCpf('00000000000')).toBe(false);
      expect(isValidCpf('11111111111')).toBe(false);
      expect(isValidCpf('22222222222')).toBe(false);
      expect(isValidCpf('99999999999')).toBe(false);
    });

    it('rejeita string com menos de 11 dígitos', () => {
      expect(isValidCpf('1234567890')).toBe(false);
      expect(isValidCpf('')).toBe(false);
    });

    it('rejeita string com mais de 11 dígitos', () => {
      expect(isValidCpf('123456789090')).toBe(false);
    });

    it('rejeita entrada com caracteres não numéricos não-formatadores', () => {
      expect(isValidCpf('12345678a09')).toBe(false);
      expect(isValidCpf('abcdefghijk')).toBe(false);
    });
  });

  describe('entradas nulas/undefined', () => {
    it('rejeita null', () => {
      expect(isValidCpf(null)).toBe(false);
    });

    it('rejeita undefined', () => {
      expect(isValidCpf(undefined)).toBe(false);
    });
  });
});

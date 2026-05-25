import { describe, expect, it } from 'vitest';
import { toAlunoDTO, toAlunoRevealedDTO, type AlunoRecord } from './aluno.js';

const fixture: AlunoRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Ana Souza',
  email: 'ana.souza@example.com',
  cpf: '52998224725',
  telefone: '11987654321',
  plano: 'anual',
  status: 'ativo',
  trilha: 'construindo_patrimonio',
  dataInicio: new Date('2026-01-01T10:00:00Z'),
  dataVencimento: new Date('2027-01-01T10:00:00Z'),
  renovacaoAutomatica: true,
  anonymizedAt: null,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
  deletedAt: null,
};

describe('toAlunoDTO', () => {
  it('mascara o CPF por padrão e não expõe cpf cru', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.cpfMasked).toBe('***.***.247-25');
    expect('cpf' in dto).toBe(false);
  });

  it('inclui telefone bruto e formatado', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.telefone).toBe('11987654321');
    expect(dto.telefoneFormatado).toBe('(11) 98765-4321');
  });

  it('serializa datas como ISO strings', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.createdAt).toBe('2026-01-01T10:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-01-02T10:00:00.000Z');
    expect(dto.dataInicio).toBe('2026-01-01T10:00:00.000Z');
    expect(dto.dataVencimento).toBe('2027-01-01T10:00:00.000Z');
  });

  it('expõe campos de assinatura e trilha', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.plano).toBe('anual');
    expect(dto.trilha).toBe('construindo_patrimonio');
    expect(dto.renovacaoAutomatica).toBe(true);
  });

  it('calcula diasParaVencimento', () => {
    const today = new Date();
    const futureRecord: AlunoRecord = {
      ...fixture,
      dataVencimento: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
    };
    const dto = toAlunoDTO(futureRecord);
    expect(dto.diasParaVencimento).toBeGreaterThanOrEqual(29);
    expect(dto.diasParaVencimento).toBeLessThanOrEqual(30);
  });

  it('marca anonimizado: false quando anonymizedAt é null', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.anonimizado).toBe(false);
  });

  it('marca anonimizado: true quando anonymizedAt é Date', () => {
    const anonRecord: AlunoRecord = { ...fixture, anonymizedAt: new Date() };
    const dto = toAlunoDTO(anonRecord);
    expect(dto.anonimizado).toBe(true);
  });

  it('preserva deletedAt como ISO string ou null', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.deletedAt).toBeNull();

    const deletedRecord: AlunoRecord = {
      ...fixture,
      deletedAt: new Date('2026-05-01T10:00:00Z'),
    };
    expect(toAlunoDTO(deletedRecord).deletedAt).toBe('2026-05-01T10:00:00.000Z');
  });

  it('preserva nome, email, status', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.nome).toBe('Ana Souza');
    expect(dto.email).toBe('ana.souza@example.com');
    expect(dto.status).toBe('ativo');
  });
});

describe('toAlunoRevealedDTO', () => {
  it('revela CPF em claro e formatado', () => {
    const dto = toAlunoRevealedDTO(fixture);
    expect(dto.cpf).toBe('52998224725');
    expect(dto.cpfFormatado).toBe('529.982.247-25');
  });

  it('ainda inclui o cpfMasked', () => {
    const dto = toAlunoRevealedDTO(fixture);
    expect(dto.cpfMasked).toBe('***.***.247-25');
  });
});

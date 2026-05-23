import { describe, expect, it } from 'vitest';
import { toAlunoDTO, toAlunoRevealedDTO, type AlunoRecord } from './aluno.js';

const fixture: AlunoRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  nome: 'Ana Souza',
  email: 'ana.souza@example.com',
  cpf: '52998224725',
  telefone: '11987654321',
  plano: 'premium',
  status: 'ativo',
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-02T10:00:00Z'),
  deletedAt: null,
};

describe('toAlunoDTO', () => {
  it('mascara o CPF por padrão', () => {
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
  });

  it('não inclui deletedAt nem campos internos', () => {
    const dto = toAlunoDTO(fixture);
    expect('deletedAt' in dto).toBe(false);
  });

  it('preserva nome, email, plano e status', () => {
    const dto = toAlunoDTO(fixture);
    expect(dto.nome).toBe('Ana Souza');
    expect(dto.email).toBe('ana.souza@example.com');
    expect(dto.plano).toBe('premium');
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

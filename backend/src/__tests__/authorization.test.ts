// Testes de autorização — cobrem o critério "lógica de autorização precisa ter testes" do brief.
//
// Estratégia: monta o app real com createApp(), conecta no Postgres do docker
// compose, cria 3 admins de teste (um por papel) + 1 aluno de teste, gera JWTs
// válidos, exercita endpoints com Supertest. Cleanup no afterAll.
//
// Requer: docker compose com Postgres rodando + DATABASE_URL apontando pra ele.
// Os tokens são assinados com o env.JWT_SECRET atual, então os testes funcionam
// em qualquer ambiente que tenha a app subindo corretamente.

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { AdminRole } from '@escola/shared';
import { createApp } from '../app.js';
import { env } from '../env.js';
import { AUTH_COOKIE_NAME } from '../middleware/auth.js';
import { prisma } from '../prisma.js';

const app = createApp();

// IDs/emails de teste — usam sufixo único pra não colidir com seed
const TEST_TAG = `authtest-${Date.now()}`;
const TEST_PWD = 'TestPassword123!';

interface TestAdmin {
  id: string;
  email: string;
  role: AdminRole;
  cookie: string; // pronto para `.set('Cookie', cookie)`
}

const admins: Record<AdminRole, TestAdmin> = {} as Record<AdminRole, TestAdmin>;
let testAlunoId: string;
let testAlunoCpf: string;

async function createTestAdmin(role: AdminRole): Promise<TestAdmin> {
  const email = `${role}-${TEST_TAG}@test.local`;
  const passwordHash = await bcrypt.hash(TEST_PWD, 4); // cost baixo só pra teste
  const admin = await prisma.admin.create({
    data: { email, passwordHash, role },
  });
  const token = jwt.sign(
    { sub: admin.id, email: admin.email },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );
  return { id: admin.id, email, role, cookie: `${AUTH_COOKIE_NAME}=${token}` };
}

beforeAll(async () => {
  admins.super_admin = await createTestAdmin('super_admin');
  admins.operacao = await createTestAdmin('operacao');
  admins.leitura = await createTestAdmin('leitura');

  testAlunoCpf = `989${TEST_TAG.slice(-8).replace(/\D/g, '').padStart(8, '0')}`.slice(0, 11);
  // CPF gerado pode não ser válido pelo dígito; usamos UPDATE para inserir
  // contornando a validação (caminho controlado por código de teste, não
  // pelo schema Zod). Vamos usar um CPF válido conhecido reservado para testes.
  testAlunoCpf = '70283457007';
  // Se já existir do seed, pega; senão cria.
  const existing = await prisma.aluno.findUnique({ where: { cpf: testAlunoCpf } });
  if (existing) {
    testAlunoId = existing.id;
  } else {
    const aluno = await prisma.aluno.create({
      data: {
        nome: `Aluno Teste ${TEST_TAG}`,
        email: `aluno-${TEST_TAG}@test.local`,
        cpf: testAlunoCpf,
        telefone: '11987654321',
        dataVencimento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    testAlunoId = aluno.id;
  }
});

afterAll(async () => {
  // Remove em ordem para respeitar foreign keys
  await prisma.auditEvent.deleteMany({ where: { aluno: { email: { contains: TEST_TAG } } } });
  await prisma.auditEvent.deleteMany({ where: { admin: { email: { contains: TEST_TAG } } } });
  await prisma.aluno.deleteMany({ where: { email: { contains: TEST_TAG } } });
  await prisma.admin.deleteMany({ where: { email: { contains: TEST_TAG } } });
  await prisma.$disconnect();
});

// =============================================================================
// 1) requireAuth — autenticação básica
// =============================================================================
describe('requireAuth', () => {
  it('GET /api/alunos sem cookie → 401', async () => {
    const r = await request(app).get('/api/alunos');
    expect(r.status).toBe(401);
    expect(r.body.error).toBe('unauthorized');
  });

  it('GET /api/alunos com cookie aleatório → 401', async () => {
    const r = await request(app)
      .get('/api/alunos')
      .set('Cookie', `${AUTH_COOKIE_NAME}=lixo-nao-jwt`);
    expect(r.status).toBe(401);
  });

  it('GET /api/alunos com JWT assinado com secret errado → 401', async () => {
    const fake = jwt.sign({ sub: 'x', email: 'y@y.com' }, 'wrong-secret-with-enough-chars-12345');
    const r = await request(app)
      .get('/api/alunos')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${fake}`);
    expect(r.status).toBe(401);
  });

  it('GET /api/alunos com cookie válido (leitura) → 200', async () => {
    const r = await request(app).get('/api/alunos').set('Cookie', admins.leitura.cookie);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('items');
  });

  it('GET /api/auth/me devolve role do admin autenticado', async () => {
    const r = await request(app).get('/api/auth/me').set('Cookie', admins.operacao.cookie);
    expect(r.status).toBe(200);
    expect(r.body.role).toBe('operacao');
  });
});

// =============================================================================
// 2) requireRole — controle por papel em /api/alunos
// =============================================================================
describe('requireRole em /api/alunos', () => {
  it('leitura NÃO pode criar (POST → 403)', async () => {
    const r = await request(app)
      .post('/api/alunos')
      .set('Cookie', admins.leitura.cookie)
      .send({
        nome: 'X Y',
        email: `novo-${Date.now()}@test.local`,
        cpf: '52998224725',
        telefone: '11987654321',
      });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('forbidden');
  });

  it('leitura NÃO pode editar (PATCH → 403)', async () => {
    const r = await request(app)
      .patch(`/api/alunos/${testAlunoId}`)
      .set('Cookie', admins.leitura.cookie)
      .send({ nome: 'tentando editar' });
    expect(r.status).toBe(403);
  });

  it('leitura NÃO pode deletar (DELETE → 403)', async () => {
    const r = await request(app)
      .delete(`/api/alunos/${testAlunoId}`)
      .set('Cookie', admins.leitura.cookie);
    expect(r.status).toBe(403);
  });

  it('leitura NÃO pode registrar contato (POST → 403)', async () => {
    const r = await request(app)
      .post(`/api/alunos/${testAlunoId}/contact`)
      .set('Cookie', admins.leitura.cookie)
      .send({ canal: 'whatsapp', nota: 'teste' });
    expect(r.status).toBe(403);
  });

  it('operacao PODE registrar contato (POST → 200)', async () => {
    const r = await request(app)
      .post(`/api/alunos/${testAlunoId}/contact`)
      .set('Cookie', admins.operacao.cookie)
      .send({ canal: 'telefone', nota: 'teste de autorização' });
    expect(r.status).toBe(200);
  });

  it('operacao NÃO pode anonimizar (POST /:id/anonymize → 403)', async () => {
    const r = await request(app)
      .post(`/api/alunos/${testAlunoId}/anonymize`)
      .set('Cookie', admins.operacao.cookie);
    expect(r.status).toBe(403);
  });

  it('operacao NÃO pode exportar (GET /:id/export → 403)', async () => {
    const r = await request(app)
      .get(`/api/alunos/${testAlunoId}/export`)
      .set('Cookie', admins.operacao.cookie);
    expect(r.status).toBe(403);
  });

  it('super_admin PODE exportar (GET /:id/export → 200)', async () => {
    const r = await request(app)
      .get(`/api/alunos/${testAlunoId}/export`)
      .set('Cookie', admins.super_admin.cookie);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('aluno');
  });
});

// =============================================================================
// 3) requireRole — /api/admins é exclusivo de super_admin
// =============================================================================
describe('requireRole em /api/admins', () => {
  it('leitura NÃO acessa /api/admins (GET → 403)', async () => {
    const r = await request(app).get('/api/admins').set('Cookie', admins.leitura.cookie);
    expect(r.status).toBe(403);
  });

  it('operacao NÃO acessa /api/admins (GET → 403)', async () => {
    const r = await request(app).get('/api/admins').set('Cookie', admins.operacao.cookie);
    expect(r.status).toBe(403);
  });

  it('operacao NÃO pode criar convite (POST → 403)', async () => {
    const r = await request(app)
      .post('/api/admins/invites')
      .set('Cookie', admins.operacao.cookie)
      .send({ email: 'novo@test.local', role: 'leitura' });
    expect(r.status).toBe(403);
  });

  it('super_admin acessa /api/admins (GET → 200)', async () => {
    const r = await request(app).get('/api/admins').set('Cookie', admins.super_admin.cookie);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('admins');
  });
});

// =============================================================================
// 4) Endpoints públicos (sem auth) — não devem aceitar admin cookies como bypass
// =============================================================================
describe('endpoints públicos', () => {
  it('GET /api/health → 200 sem auth', async () => {
    const r = await request(app).get('/api/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });

  it('GET /api/admins/invites/:token (preview) responde 400/404 sem token válido', async () => {
    const r = await request(app).get('/api/admins/invites/token-invalido-curto');
    expect([400, 404]).toContain(r.status);
  });
});

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@escolabreno.com.br';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
const BCRYPT_COST = 10;

const sampleAlunos = [
  {
    nome: 'Ana Souza',
    email: 'ana.souza@example.com',
    cpf: '52998224725',
    telefone: '11987654321',
    plano: 'premium',
    status: 'ativo',
  },
  {
    nome: 'Bruno Costa',
    email: 'bruno.costa@example.com',
    cpf: '11144477735',
    telefone: '21976543210',
    plano: 'basic',
    status: 'ativo',
  },
  {
    nome: 'Carla Mendes',
    email: 'carla.mendes@example.com',
    cpf: '93541134780',
    telefone: '31998877665',
    plano: 'premium',
    status: 'pausado',
  },
  {
    nome: 'Daniel Lima',
    email: 'daniel.lima@example.com',
    cpf: '70283457007',
    telefone: '41987651122',
    plano: 'basic',
    status: 'cancelado',
  },
  {
    nome: 'Eduarda Pereira',
    email: 'eduarda.pereira@example.com',
    cpf: '39053344705',
    telefone: '51999887766',
    plano: 'premium',
    status: 'ativo',
  },
  {
    nome: 'Fernando Alves',
    email: 'fernando.alves@example.com',
    cpf: '15350946056',
    telefone: '61988776655',
    plano: 'basic',
    status: 'ativo',
  },
  {
    nome: 'Gabriela Rocha',
    email: 'gabriela.rocha@example.com',
    cpf: '04094445102',
    telefone: '71977665544',
    plano: 'premium',
    status: 'ativo',
  },
  {
    nome: 'Henrique Dias',
    email: 'henrique.dias@example.com',
    cpf: '46625325821',
    telefone: '81966554433',
    plano: 'basic',
    status: 'pausado',
  },
] as const;

async function main() {
  console.log('🌱 Seeding database...');

  // Admin (idempotente)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST);
  const admin = await prisma.admin.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash },
    create: { email: ADMIN_EMAIL, passwordHash },
  });
  console.log(`  ✓ Admin: ${admin.email}`);

  // Alunos (idempotente por CPF)
  for (const aluno of sampleAlunos) {
    await prisma.aluno.upsert({
      where: { cpf: aluno.cpf },
      update: {},
      create: aluno,
    });
  }
  console.log(`  ✓ Alunos: ${sampleAlunos.length} registros`);

  console.log('🌱 Seed completo.');
}

main()
  .catch((e) => {
    console.error('❌ Seed falhou:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@escolabreno.com.br';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'admin123';
const BCRYPT_COST = 10;

function plusDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

const today = new Date();

const sampleAlunos = [
  {
    nome: 'Ana Souza',
    email: 'ana.souza@example.com',
    cpf: '52998224725',
    telefone: '11987654321',
    status: 'ativo' as const,
    trilha: 'construindo_patrimonio' as const,
    dataInicio: plusDays(-200, today),
    dataVencimento: plusDays(165, today),
    renovacaoAutomatica: true,
  },
  {
    nome: 'Bruno Costa',
    email: 'bruno.costa@example.com',
    cpf: '11144477735',
    telefone: '21976543210',
    status: 'ativo' as const,
    trilha: 'fazendo_sobrar_dinheiro' as const,
    dataInicio: plusDays(-90, today),
    dataVencimento: plusDays(275, today),
    renovacaoAutomatica: true,
  },
  {
    nome: 'Carla Mendes',
    email: 'carla.mendes@example.com',
    cpf: '93541134780',
    telefone: '31998877665',
    status: 'pausado' as const,
    trilha: 'montando_reserva' as const,
    dataInicio: plusDays(-150, today),
    dataVencimento: plusDays(215, today),
    renovacaoAutomatica: false,
  },
  {
    nome: 'Daniel Lima',
    email: 'daniel.lima@example.com',
    cpf: '70283457007',
    telefone: '41987651122',
    status: 'cancelado' as const,
    trilha: 'saindo_da_divida' as const,
    dataInicio: plusDays(-300, today),
    dataVencimento: plusDays(-30, today),
    renovacaoAutomatica: false,
  },
  {
    nome: 'Eduarda Pereira',
    email: 'eduarda.pereira@example.com',
    cpf: '39053344705',
    telefone: '51999887766',
    status: 'ativo' as const,
    trilha: 'construindo_patrimonio' as const,
    dataInicio: plusDays(-30, today),
    dataVencimento: plusDays(335, today),
    renovacaoAutomatica: true,
  },
  {
    nome: 'Fernando Alves',
    email: 'fernando.alves@example.com',
    cpf: '15350946056',
    telefone: '61988776655',
    status: 'ativo' as const,
    trilha: 'saindo_da_divida' as const,
    dataInicio: plusDays(-10, today),
    dataVencimento: plusDays(355, today),
    renovacaoAutomatica: true,
  },
  {
    nome: 'Gabriela Rocha',
    email: 'gabriela.rocha@example.com',
    cpf: '04094445102',
    telefone: '71977665544',
    status: 'ativo' as const,
    trilha: 'fazendo_sobrar_dinheiro' as const,
    dataInicio: plusDays(-60, today),
    dataVencimento: plusDays(15, today), // perto de vencer — destaca no dashboard
    renovacaoAutomatica: true,
  },
  {
    nome: 'Henrique Dias',
    email: 'henrique.dias@example.com',
    cpf: '46625325821',
    telefone: '81966554433',
    status: 'pausado' as const,
    trilha: 'montando_reserva' as const,
    dataInicio: plusDays(-180, today),
    dataVencimento: plusDays(185, today),
    renovacaoAutomatica: true,
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

  // Alunos (idempotente por CPF — só cria se não existir, para preservar
  // edições da operação após o primeiro seed)
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

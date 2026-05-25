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
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: true,
    ultimoContatoEm: plusDays(-15, today),
    ultimoContatoCanal: 'whatsapp' as const,
    ultimoContatoNota: 'pediu mais conteudo sobre investimentos',
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
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: false,
    consentOfertas: false,
    ultimoContatoEm: plusDays(-3, today),
    ultimoContatoCanal: 'email' as const,
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
    valorAnualCentavos: 19800, // promo antiga
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: false,
    ultimoContatoEm: plusDays(-45, today),
    ultimoContatoCanal: 'telefone' as const,
    ultimoContatoNota: 'pediu pausa por 3 meses por motivo financeiro',
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
    valorAnualCentavos: 29880,
    consentEmail: false,
    consentWhatsapp: false,
    consentOfertas: false,
    ultimoContatoEm: plusDays(-30, today),
    ultimoContatoCanal: 'whatsapp' as const,
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
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: true,
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
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: false,
  },
  {
    nome: 'Gabriela Rocha',
    email: 'gabriela.rocha@example.com',
    cpf: '04094445102',
    telefone: '71977665544',
    status: 'ativo' as const,
    trilha: 'fazendo_sobrar_dinheiro' as const,
    dataInicio: plusDays(-60, today),
    dataVencimento: plusDays(15, today),
    renovacaoAutomatica: true,
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: true,
    ultimoContatoEm: plusDays(-70, today),
    ultimoContatoCanal: 'presencial' as const,
    ultimoContatoNota: 'encontro presencial no evento',
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
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: false,
    consentOfertas: false,
  },
] as const;

const sampleLgpdRequests = [
  {
    requesterEmail: 'maria.passada@example.com',
    requesterCpf: '52998224725',
    type: 'apagamento' as const,
    status: 'em_andamento' as const,
    receivedAt: plusDays(-5, today),
    dueAt: plusDays(10, today),
    notes: 'recebido por whatsapp; ela pediu remoção total da base',
  },
  {
    requesterEmail: 'curioso@example.com',
    type: 'acesso' as const,
    status: 'recebido' as const,
    receivedAt: plusDays(-1, today),
    dueAt: plusDays(14, today),
    notes: 'cliente quer relatório completo dos próprios dados',
  },
];

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

  // Alunos (idempotente — só cria, preserva edições)
  for (const aluno of sampleAlunos) {
    await prisma.aluno.upsert({
      where: { cpf: aluno.cpf },
      update: {},
      create: aluno,
    });
  }
  console.log(`  ✓ Alunos: ${sampleAlunos.length} registros`);

  // LGPD requests (só cria se zero existem — não duplicar a cada deploy)
  const existingRequests = await prisma.lgpdRequest.count();
  if (existingRequests === 0) {
    for (const req of sampleLgpdRequests) {
      await prisma.lgpdRequest.create({ data: req });
    }
    console.log(`  ✓ LGPD requests: ${sampleLgpdRequests.length} registros (seed inicial)`);
  } else {
    console.log(`  ✓ LGPD requests: ${existingRequests} já existem, skip`);
  }

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

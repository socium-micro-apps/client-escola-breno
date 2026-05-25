import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Bootstrap do admin inicial.
// Lógica: só cria se as duas envs estiverem definidas E não houver nenhum
// super_admin no sistema ainda. Isso impede que o seed recrie um admin
// default removido intencionalmente pela operação.
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const BCRYPT_COST = 10;

function plusDays(days: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d;
}

function avatarFor(seed: string): string {
  // DiceBear avataaars — deterministico por seed (email)
  const encoded = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/avataaars/svg?seed=${encoded}&backgroundColor=ffd5b5,ffdfbf,ffe6c7,fff0d6,c0aede`;
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
    progressoItensCompletos: [
      'perfil_investidor',
      'primeiro_aporte',
      'diversificou',
      'rebalanceou',
    ],
    dataInicio: plusDays(-340, today),
    dataVencimento: plusDays(25, today),
    renovacaoAutomatica: true,
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: true,
    ultimoContatoEm: plusDays(-15, today),
    ultimoContatoCanal: 'whatsapp' as const,
    ultimoContatoNota: 'pediu mais conteudo sobre investimentos',
    avatarUrl: avatarFor('ana.souza@example.com'),
    origemCanal: 'indicacao' as const,
    origemDetalhe: 'indicada por Carla Mendes',
    cidade: 'São Paulo - SP',
    profissao: 'gerente de marketing',
    aniversario: new Date('1989-03-12'),
    totalLogins: 142,
    ultimoLoginEm: plusDays(-1, today),
  },
  {
    nome: 'Bruno Costa',
    email: 'bruno.costa@example.com',
    cpf: '11144477735',
    telefone: '21976543210',
    status: 'ativo' as const,
    trilha: 'fazendo_sobrar_dinheiro' as const,
    progressoItensCompletos: ['orcamento_zerado', 'corte_assinaturas'],
    dataInicio: plusDays(-90, today),
    dataVencimento: plusDays(275, today),
    renovacaoAutomatica: true,
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: false,
    consentOfertas: false,
    ultimoContatoEm: plusDays(-3, today),
    ultimoContatoCanal: 'email' as const,
    avatarUrl: avatarFor('bruno.costa@example.com'),
    origemCanal: 'instagram' as const,
    origemDetalhe: 'campanha "saia das dívidas em 2026"',
    cidade: 'Rio de Janeiro - RJ',
    profissao: 'desenvolvedor',
    aniversario: new Date('1992-07-22'),
    totalLogins: 38,
    ultimoLoginEm: plusDays(-2, today),
  },
  {
    nome: 'Carla Mendes',
    email: 'carla.mendes@example.com',
    cpf: '93541134780',
    telefone: '31998877665',
    status: 'pausado' as const,
    trilha: 'montando_reserva' as const,
    progressoItensCompletos: ['meta_definida', 'conta_separada', 'aporte_mensal'],
    dataInicio: plusDays(-450, today),
    dataVencimento: plusDays(-85, today),
    renovacaoAutomatica: false,
    valorAnualCentavos: 19800,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: false,
    ultimoContatoEm: plusDays(-45, today),
    ultimoContatoCanal: 'telefone' as const,
    ultimoContatoNota: 'pediu pausa por 3 meses por motivo financeiro',
    avatarUrl: avatarFor('carla.mendes@example.com'),
    origemCanal: 'youtube' as const,
    origemDetalhe: 'vídeo "como montar reserva de emergência"',
    cidade: 'Belo Horizonte - MG',
    profissao: 'professora',
    aniversario: new Date('1985-11-04'),
    totalLogins: 287,
    ultimoLoginEm: plusDays(-30, today),
  },
  {
    nome: 'Daniel Lima',
    email: 'daniel.lima@example.com',
    cpf: '70283457007',
    telefone: '41987651122',
    status: 'cancelado' as const,
    trilha: 'saindo_da_divida' as const,
    progressoItensCompletos: ['mapeou_dividas'],
    dataInicio: plusDays(-300, today),
    dataVencimento: plusDays(-30, today),
    renovacaoAutomatica: false,
    valorAnualCentavos: 29880,
    consentEmail: false,
    consentWhatsapp: false,
    consentOfertas: false,
    ultimoContatoEm: plusDays(-30, today),
    ultimoContatoCanal: 'whatsapp' as const,
    avatarUrl: avatarFor('daniel.lima@example.com'),
    origemCanal: 'anuncio_pago' as const,
    origemDetalhe: 'Google Ads — "sair das dívidas"',
    cidade: 'Curitiba - PR',
    profissao: 'autônomo',
    aniversario: new Date('1995-02-18'),
    totalLogins: 6,
    ultimoLoginEm: plusDays(-95, today),
  },
  {
    nome: 'Eduarda Pereira',
    email: 'eduarda.pereira@example.com',
    cpf: '39053344705',
    telefone: '51999887766',
    status: 'ativo' as const,
    trilha: 'construindo_patrimonio' as const,
    progressoItensCompletos: ['perfil_investidor', 'primeiro_aporte'],
    dataInicio: plusDays(-30, today),
    dataVencimento: plusDays(335, today),
    renovacaoAutomatica: true,
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: true,
    avatarUrl: avatarFor('eduarda.pereira@example.com'),
    origemCanal: 'evento_presencial' as const,
    origemDetalhe: 'evento "diálogos sobre dinheiro" — SP, abril/26',
    cidade: 'Porto Alegre - RS',
    profissao: 'enfermeira',
    aniversario: new Date('1988-09-30'),
    totalLogins: 22,
    ultimoLoginEm: plusDays(0, today),
  },
  {
    nome: 'Fernando Alves',
    email: 'fernando.alves@example.com',
    cpf: '15350946056',
    telefone: '61988776655',
    status: 'ativo' as const,
    trilha: 'saindo_da_divida' as const,
    progressoItensCompletos: [],
    dataInicio: plusDays(-10, today),
    dataVencimento: plusDays(355, today),
    renovacaoAutomatica: true,
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: true,
    consentOfertas: false,
    avatarUrl: avatarFor('fernando.alves@example.com'),
    origemCanal: 'busca_organica' as const,
    origemDetalhe: 'buscou "planilha controle financeiro" no Google',
    cidade: 'Brasília - DF',
    profissao: 'servidor público',
    aniversario: new Date('1980-06-15'),
    totalLogins: 4,
    ultimoLoginEm: plusDays(-1, today),
  },
  {
    nome: 'Gabriela Rocha',
    email: 'gabriela.rocha@example.com',
    cpf: '04094445102',
    telefone: '71977665544',
    status: 'ativo' as const,
    trilha: 'fazendo_sobrar_dinheiro' as const,
    progressoItensCompletos: ['orcamento_zerado', 'corte_assinaturas', 'sobrou_10pct'],
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
    avatarUrl: avatarFor('gabriela.rocha@example.com'),
    origemCanal: 'indicacao' as const,
    origemDetalhe: 'indicada por Ana Souza',
    cidade: 'Salvador - BA',
    profissao: 'designer',
    aniversario: new Date('1993-12-08'),
    totalLogins: 87,
    ultimoLoginEm: plusDays(-1, today),
  },
  {
    nome: 'Henrique Dias',
    email: 'henrique.dias@example.com',
    cpf: '46625325821',
    telefone: '81966554433',
    status: 'pausado' as const,
    trilha: 'montando_reserva' as const,
    progressoItensCompletos: ['meta_definida', 'conta_separada'],
    dataInicio: plusDays(-180, today),
    dataVencimento: plusDays(185, today),
    renovacaoAutomatica: true,
    valorAnualCentavos: 29880,
    consentEmail: true,
    consentWhatsapp: false,
    consentOfertas: false,
    avatarUrl: avatarFor('henrique.dias@example.com'),
    origemCanal: 'instagram' as const,
    origemDetalhe: 'reel "3 contas pra você ter agora"',
    cidade: 'Recife - PE',
    profissao: 'comerciante',
    aniversario: new Date('1978-04-25'),
    totalLogins: 54,
    ultimoLoginEm: plusDays(-12, today),
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

  // Bootstrap idempotente: só cria admin inicial se ainda não houver nenhum
  // super_admin no banco. Evita recriar admin default removido pela operação.
  const superAdminCount = await prisma.admin.count({ where: { role: 'super_admin' } });
  if (superAdminCount === 0) {
    if (ADMIN_EMAIL && ADMIN_PASSWORD) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_COST);
      const admin = await prisma.admin.upsert({
        where: { email: ADMIN_EMAIL },
        update: { passwordHash, role: 'super_admin' },
        create: { email: ADMIN_EMAIL, passwordHash, role: 'super_admin' },
      });
      console.log(`  ✓ Admin bootstrap criado: ${admin.email}`);
    } else {
      console.log('  ⚠ Sem super_admin e sem SEED_ADMIN_* — defina as envs ou crie via API');
    }
  } else {
    console.log(`  ✓ ${superAdminCount} super_admin já existem, skip bootstrap`);
  }

  for (const aluno of sampleAlunos) {
    const existing = await prisma.aluno.findUnique({ where: { cpf: aluno.cpf } });
    if (!existing) {
      await prisma.aluno.create({ data: aluno });
      continue;
    }
    // Hidrata apenas campos NULL/zero — preserva edições da operação.
    // Útil para popular dados v4 em registros criados em versões anteriores.
    const updateData: Record<string, unknown> = {};
    if (!existing.avatarUrl) updateData.avatarUrl = aluno.avatarUrl;
    if (!existing.origemCanal) updateData.origemCanal = aluno.origemCanal;
    if (!existing.origemDetalhe) updateData.origemDetalhe = aluno.origemDetalhe;
    if (!existing.cidade) updateData.cidade = aluno.cidade;
    if (!existing.profissao) updateData.profissao = aluno.profissao;
    if (!existing.aniversario) updateData.aniversario = aluno.aniversario;
    if (existing.totalLogins === 0) updateData.totalLogins = aluno.totalLogins;
    if (!existing.ultimoLoginEm) updateData.ultimoLoginEm = aluno.ultimoLoginEm;
    if (existing.progressoItensCompletos.length === 0) {
      updateData.progressoItensCompletos = aluno.progressoItensCompletos;
    }
    if (Object.keys(updateData).length > 0) {
      await prisma.aluno.update({ where: { cpf: aluno.cpf }, data: updateData });
    }
  }
  console.log(`  ✓ Alunos: ${sampleAlunos.length} registros (sincronizados)`);

  const existingRequests = await prisma.lgpdRequest.count();
  if (existingRequests === 0) {
    for (const req of sampleLgpdRequests) {
      await prisma.lgpdRequest.create({ data: req });
    }
    console.log(`  ✓ LGPD requests: ${sampleLgpdRequests.length} (seed inicial)`);
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

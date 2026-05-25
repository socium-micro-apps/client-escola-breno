import {
  ORIGEM_LABEL,
  TRILHA_LABEL,
  type Plano,
  type StatusAluno,
  type Trilha,
} from '@escola/shared';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Eye, EyeOff, Info, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlunoFormDialog } from '@/components/AlunoFormDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Topbar } from '@/components/Topbar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { api } from '@/lib/api';

interface AlunoDTO {
  id: string;
  nome: string;
  email: string;
  cpfMasked: string;
  cpf?: string;
  telefone: string;
  telefoneFormatado: string;
  plano: Plano;
  status: StatusAluno;
  trilha: Trilha;
  dataInicio: string;
  dataVencimento: string;
  renovacaoAutomatica: boolean;
  valorAnualCentavos: number;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentOfertas: boolean;
  avatarUrl: string | null;
  origemCanal: import('@escola/shared').OrigemCanal | null;
  origemDetalhe: string | null;
  cidade: string | null;
  profissao: string | null;
  aniversario: string | null;
  totalLogins: number;
  ultimoLoginEm: string | null;
  diasDesdeUltimoLogin: number | null;
  diasNaPlataforma: number;
  progressoItensCompletos: string[];
  progressoPct: number;
  diasParaVencimento: number;
  anonimizado: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ListResponse {
  items: AlunoDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS: Array<{ value: StatusAluno | 'all'; label: string }> = [
  { value: 'all', label: 'todos os status' },
  { value: 'ativo', label: 'ativo' },
  { value: 'pausado', label: 'pausado' },
  { value: 'cancelado', label: 'cancelado' },
];

const TRILHA_OPTIONS: Array<{ value: Trilha | 'all'; label: string }> = [
  { value: 'all', label: 'todas as trilhas' },
  { value: 'saindo_da_divida', label: TRILHA_LABEL.saindo_da_divida },
  { value: 'fazendo_sobrar_dinheiro', label: TRILHA_LABEL.fazendo_sobrar_dinheiro },
  { value: 'montando_reserva', label: TRILHA_LABEL.montando_reserva },
  { value: 'construindo_patrimonio', label: TRILHA_LABEL.construindo_patrimonio },
];

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function VencimentoBadge({ dias, dataVencimento }: { dias: number; dataVencimento: string }) {
  if (dias < 0) {
    return <Badge variant="vencido">venceu {formatDateShort(dataVencimento)}</Badge>;
  }
  if (dias <= 30) {
    return <Badge variant="vencendo">vence em {dias}d</Badge>;
  }
  return <span className="text-neutral-500">{formatDateShort(dataVencimento)}</span>;
}

export function AlunosPage() {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusAluno | 'all'>('all');
  const [trilhaFilter, setTrilhaFilter] = useState<Trilha | 'all'>('all');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, string>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editAluno, setEditAluno] = useState<AlunoDTO | null>(null);
  const [deleteAluno, setDeleteAluno] = useState<AlunoDTO | null>(null);

  const query = useQuery({
    queryKey: ['alunos', { q, statusFilter, trilhaFilter }],
    queryFn: () =>
      api.get<ListResponse>('/alunos', {
        q: q || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        trilha: trilhaFilter === 'all' ? undefined : trilhaFilter,
        pageSize: 50,
      }),
  });

  async function toggleReveal(aluno: AlunoDTO) {
    if (revealedIds.has(aluno.id)) {
      const next = new Set(revealedIds);
      next.delete(aluno.id);
      setRevealedIds(next);
      return;
    }
    const revealed = await api.get<AlunoDTO & { cpf: string; cpfFormatado: string }>(
      `/alunos/${aluno.id}`,
      { reveal: 'true' },
    );
    setRevealedCpfs((prev) => ({ ...prev, [aluno.id]: revealed.cpfFormatado }));
    setRevealedIds(new Set(revealedIds).add(aluno.id));
  }

  async function handleEdit(aluno: AlunoDTO) {
    const revealed = await api.get<AlunoDTO & { cpf: string }>(`/alunos/${aluno.id}`, {
      reveal: 'true',
    });
    setEditAluno({ ...aluno, cpf: revealed.cpf });
  }

  const items = query.data?.items ?? [];

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold lowercase tracking-tight text-brand-deep">
              gestão de alunos
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {query.data
                ? `${query.data.total} ${query.data.total === 1 ? 'aluno' : 'alunos'}`
                : 'carregando...'}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            adicionar aluno
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr,200px,200px]">
          <Input
            placeholder="buscar por nome, e-mail ou CPF..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusAluno | 'all')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={trilhaFilter} onValueChange={(v) => setTrilhaFilter(v as Trilha | 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRILHA_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Nome
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Contato
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  CPF
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Trilha
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Vencimento
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {query.isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                    carregando...
                  </td>
                </tr>
              )}

              {!query.isLoading && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    nenhum aluno por aqui ainda
                  </td>
                </tr>
              )}

              {items.map((aluno) => {
                const isRevealed = revealedIds.has(aluno.id);
                return (
                  <tr key={aluno.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/alunos/${aluno.id}`}
                        className="flex items-center gap-3 hover:text-brand-orange"
                      >
                        <Avatar url={aluno.avatarUrl} alt={aluno.nome} size="md" />
                        <div>
                          <div className="font-medium text-brand-deep">{aluno.nome}</div>
                          <div className="text-xs text-neutral-500">
                            {aluno.cidade ?? '—'}
                            {aluno.profissao && ` · ${aluno.profissao}`}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      <div>{aluno.email}</div>
                      <div className="text-xs text-neutral-500">{aluno.telefoneFormatado}</div>
                      {aluno.origemCanal && (
                        <div className="mt-1 text-xs text-neutral-400">
                          via {ORIGEM_LABEL[aluno.origemCanal]}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-neutral-700">
                      <div className="flex items-center gap-2">
                        <span>{isRevealed ? revealedCpfs[aluno.id] : aluno.cpfMasked}</span>
                        <button
                          type="button"
                          onClick={() => toggleReveal(aluno)}
                          className="text-neutral-400 hover:text-brand-orange"
                          aria-label={isRevealed ? 'esconder CPF' : 'mostrar CPF'}
                          title={isRevealed ? 'esconder' : 'mostrar'}
                        >
                          {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="trilha">{TRILHA_LABEL[aluno.trilha]}</Badge>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full bg-brand-orange"
                            style={{ width: `${aluno.progressoPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-neutral-500">{aluno.progressoPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={aluno.status as 'ativo' | 'pausado' | 'cancelado'}>
                        {aluno.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <VencimentoBadge
                        dias={aluno.diasParaVencimento}
                        dataVencimento={aluno.dataVencimento}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/alunos/${aluno.id}`}>
                          <Button variant="ghost" size="icon" aria-label="detalhes">
                            <Info className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(aluno)}
                          aria-label="editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteAluno(aluno)}
                          aria-label="remover"
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      <AlunoFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <AlunoFormDialog
        open={Boolean(editAluno)}
        onOpenChange={(o) => !o && setEditAluno(null)}
        initial={editAluno ?? undefined}
      />
      <ConfirmDeleteDialog
        open={Boolean(deleteAluno)}
        onOpenChange={(o) => !o && setDeleteAluno(null)}
        aluno={deleteAluno}
      />
    </div>
  );
}

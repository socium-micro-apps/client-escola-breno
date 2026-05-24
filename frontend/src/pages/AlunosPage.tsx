import type { Plano, StatusAluno } from '@escola/shared';
import { useQuery } from '@tanstack/react-query';
import { Edit2, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AlunoFormDialog } from '@/components/AlunoFormDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { Topbar } from '@/components/Topbar';
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
  createdAt: string;
  updatedAt: string;
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

const PLANO_OPTIONS: Array<{ value: Plano | 'all'; label: string }> = [
  { value: 'all', label: 'todos os planos' },
  { value: 'basic', label: 'basic' },
  { value: 'premium', label: 'premium' },
];

export function AlunosPage() {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusAluno | 'all'>('all');
  const [planoFilter, setPlanoFilter] = useState<Plano | 'all'>('all');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [revealedCpfs, setRevealedCpfs] = useState<Record<string, string>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editAluno, setEditAluno] = useState<AlunoDTO | null>(null);
  const [deleteAluno, setDeleteAluno] = useState<AlunoDTO | null>(null);

  const query = useQuery({
    queryKey: ['alunos', { q, statusFilter, planoFilter }],
    queryFn: () =>
      api.get<ListResponse>('/alunos', {
        q: q || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        plano: planoFilter === 'all' ? undefined : planoFilter,
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
    // Busca o CPF revelado da API (ação intencional, ADR 0006)
    const revealed = await api.get<AlunoDTO & { cpf: string; cpfFormatado: string }>(
      `/alunos/${aluno.id}`,
      { reveal: 'true' },
    );
    setRevealedCpfs((prev) => ({ ...prev, [aluno.id]: revealed.cpfFormatado }));
    setRevealedIds(new Set(revealedIds).add(aluno.id));
  }

  async function handleEdit(aluno: AlunoDTO) {
    // Para edição, traz CPF em claro pra possibilitar prefill seguro do form
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
              {query.data ? `${query.data.total} ${query.data.total === 1 ? 'aluno' : 'alunos'}` : 'carregando...'}
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
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusAluno | 'all')}>
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
          <Select value={planoFilter} onValueChange={(v) => setPlanoFilter(v as Plano | 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLANO_OPTIONS.map((o) => (
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
                  E-mail
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  CPF
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Telefone
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Plano
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Status
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
                    <td className="px-4 py-3 font-medium text-brand-deep">{aluno.nome}</td>
                    <td className="px-4 py-3 text-neutral-700">{aluno.email}</td>
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
                    <td className="px-4 py-3 text-neutral-700">{aluno.telefoneFormatado}</td>
                    <td className="px-4 py-3">
                      <Badge variant="plano">{aluno.plano}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={aluno.status as 'ativo' | 'pausado' | 'cancelado'}>
                        {aluno.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
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

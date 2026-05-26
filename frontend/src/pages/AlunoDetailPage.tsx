import {
  CANAL_LABEL,
  ORIGEM_LABEL,
  TRILHA_LABEL,
  type AlunoChecklistItemDTO,
  type CanalContato,
  type OrigemCanal,
  type Plano,
  type StatusAluno,
  type Trilha,
} from '@escola/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArchiveRestore,
  CheckCircle2,
  Download,
  History,
  Pencil,
  PhoneCall,
  ShieldOff,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlunoFormDialog } from '@/components/AlunoFormDialog';
import { ConfirmDeleteDialog } from '@/components/ConfirmDeleteDialog';
import { RegisterContactDialog } from '@/components/RegisterContactDialog';
import { Topbar } from '@/components/Topbar';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { ApiError, api } from '@/lib/api';

interface AlunoDetailDTO {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  cpfFormatado?: string;
  cpfMasked: string;
  telefone: string;
  telefoneFormatado: string;
  plano: Plano;
  status: StatusAluno;
  trilha: Trilha;
  dataInicio: string;
  dataVencimento: string;
  renovacaoAutomatica: boolean;
  valorAnualCentavos: number;
  valorAnualFormatado: string;
  consentEmail: boolean;
  consentWhatsapp: boolean;
  consentOfertas: boolean;
  termsAcceptedAt: string;
  ultimoContatoEm: string | null;
  ultimoContatoCanal: CanalContato | null;
  ultimoContatoNota: string | null;
  diasDesdeUltimoContato: number | null;
  diasParaVencimento: number;
  // v4
  avatarUrl: string | null;
  origemCanal: OrigemCanal | null;
  origemDetalhe: string | null;
  cidade: string | null;
  profissao: string | null;
  aniversario: string | null;
  totalLogins: number;
  ultimoLoginEm: string | null;
  diasDesdeUltimoLogin: number | null;
  diasNaPlataforma: number;
  progressoItensCompletos: string[];
  progressoChecklist: AlunoChecklistItemDTO[];
  progressoPct: number;
  anonimizado: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

type AuditAction = 'create' | 'update' | 'delete' | 'restore' | 'anonymize';

interface AuditEvent {
  id: string;
  action: AuditAction;
  adminEmail: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_LABEL: Record<AuditAction, string> = {
  create: 'criado',
  update: 'atualizado',
  delete: 'removido (soft)',
  restore: 'restaurado',
  anonymize: 'anonimizado (LGPD)',
};

const ACTION_COLOR: Record<AuditAction, string> = {
  create: 'bg-brand-lime',
  update: 'bg-blue-300',
  delete: 'bg-neutral-400',
  restore: 'bg-orange-300',
  anonymize: 'bg-red-300',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): Array<{ key: string; before: unknown; after: unknown }> {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const skip = new Set(['id', 'cpfMasked', 'telefoneMasked']);
  return Array.from(keys)
    .filter((k) => !skip.has(k))
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((key) => ({ key, before: before[key], after: after[key] }));
}

export function AlunoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [anonymizeOpen, setAnonymizeOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const detailQuery = useQuery<AlunoDetailDTO>({
    queryKey: ['alunos', id, 'detail'],
    queryFn: () => api.get<AlunoDetailDTO>(`/alunos/${id}`, { reveal: 'true' }),
    enabled: Boolean(id),
  });

  const historyQuery = useQuery<{ items: AuditEvent[] }>({
    queryKey: ['alunos', id, 'history'],
    queryFn: () => api.get<{ items: AuditEvent[] }>(`/alunos/${id}/history`),
    enabled: Boolean(id),
  });

  const restoreMutation = useMutation({
    mutationFn: () => api.post(`/alunos/${id}/restore`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('aluno restaurado');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'algo deu errado');
    },
  });

  const toggleChecklistItem = useMutation({
    mutationFn: async (itemKey: string) => {
      const current = detailQuery.data!.progressoItensCompletos;
      const next = current.includes(itemKey)
        ? current.filter((k) => k !== itemKey)
        : [...current, itemKey];
      return api.patch(`/alunos/${id}`, { progressoItensCompletos: next });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos', id] });
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'algo deu errado');
    },
  });

  const anonymizeMutation = useMutation({
    mutationFn: () => api.post(`/alunos/${id}/anonymize`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('aluno anonimizado (LGPD)');
      setAnonymizeOpen(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'algo deu errado');
    },
  });

  async function handleExport() {
    try {
      const data = await api.get(`/alunos/${id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aluno-${id}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('export gerado');
    } catch {
      toast.error('não foi possível exportar');
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <Topbar />
        <main className="mx-auto max-w-4xl px-6 py-8">carregando...</main>
      </div>
    );
  }

  if (!detailQuery.data) {
    return (
      <div className="min-h-screen">
        <Topbar />
        <main className="mx-auto max-w-4xl px-6 py-8">
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
            <h2 className="font-display text-xl text-brand-deep">aluno não encontrado</h2>
            <Link to="/alunos">
              <Button variant="secondary" className="mt-4">
                voltar para listagem
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const aluno = detailQuery.data;
  const isDeleted = aluno.deletedAt !== null;
  const isAnonymized = aluno.anonimizado;

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Link
          to="/alunos"
          className="mb-4 inline-flex items-center text-sm text-neutral-500 hover:text-brand-deep"
        >
          ← gestão de alunos
        </Link>

        {/* Card de identificação */}
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar url={aluno.avatarUrl} alt={aluno.nome} size="lg" />
              <div>
                <h1 className="font-display text-2xl font-bold text-brand-deep">{aluno.nome}</h1>
                <p className="text-sm text-neutral-500">{aluno.email}</p>
                {(aluno.cidade || aluno.profissao) && (
                  <p className="text-xs text-neutral-500">
                    {aluno.cidade}
                    {aluno.cidade && aluno.profissao && ' · '}
                    {aluno.profissao}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant={aluno.status as 'ativo' | 'pausado' | 'cancelado'}>
                    {aluno.status}
                  </Badge>
                  <Badge variant="trilha">{TRILHA_LABEL[aluno.trilha]}</Badge>
                  <Badge variant="plano">plano {aluno.plano}</Badge>
                  {aluno.origemCanal && (
                    <Badge variant="default">via {ORIGEM_LABEL[aluno.origemCanal]}</Badge>
                  )}
                  {isDeleted && <Badge variant="cancelado">deletado</Badge>}
                  {isAnonymized && <Badge variant="anonimizado">anonimizado</Badge>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isDeleted && !isAnonymized && (
                <Button variant="primary" size="sm" onClick={() => setContactOpen(true)}>
                  <PhoneCall className="h-4 w-4" />
                  registrar contato
                </Button>
              )}
              {!isDeleted && !isAnonymized && (
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-4 w-4" />
                  editar
                </Button>
              )}
              {isDeleted && !isAnonymized && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => restoreMutation.mutate()}
                  disabled={restoreMutation.isPending}
                >
                  <ArchiveRestore className="h-4 w-4" />
                  restaurar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                exportar (LGPD)
              </Button>
              {!isAnonymized && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAnonymizeOpen(true)}
                  className="text-danger hover:bg-red-50"
                >
                  <ShieldOff className="h-4 w-4" />
                  anonimizar
                </Button>
              )}
              {!isDeleted && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="text-danger hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  remover
                </Button>
              )}
            </div>
          </div>

          {/* Dados detalhados */}
          <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-neutral-100 pt-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">CPF</dt>
              <dd className="mt-1 font-mono text-sm text-neutral-700">
                {aluno.cpfFormatado ?? aluno.cpfMasked}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">Telefone</dt>
              <dd className="mt-1 text-sm text-neutral-700">{aluno.telefoneFormatado}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">Início da assinatura</dt>
              <dd className="mt-1 text-sm text-neutral-700">
                {new Date(aluno.dataInicio).toLocaleDateString('pt-BR')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">Vencimento</dt>
              <dd className="mt-1 text-sm text-neutral-700">
                {new Date(aluno.dataVencimento).toLocaleDateString('pt-BR')}
                {aluno.diasParaVencimento < 0 ? (
                  <span className="ml-2 text-danger">(vencida)</span>
                ) : aluno.diasParaVencimento <= 30 ? (
                  <span className="ml-2 text-warning">(em {aluno.diasParaVencimento} dias)</span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">Renovação automática</dt>
              <dd className="mt-1 text-sm text-neutral-700">
                {aluno.renovacaoAutomatica ? 'sim' : 'não'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">Matriculado em</dt>
              <dd className="mt-1 text-sm text-neutral-700">
                {new Date(aluno.createdAt).toLocaleDateString('pt-BR')}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase text-neutral-500">Valor anual</dt>
              <dd className="mt-1 text-sm text-neutral-700">{aluno.valorAnualFormatado}</dd>
            </div>
            {aluno.origemDetalhe && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase text-neutral-500">Detalhe da origem</dt>
                <dd className="mt-1 text-sm text-neutral-700">{aluno.origemDetalhe}</dd>
              </div>
            )}
            {aluno.aniversario && (
              <div>
                <dt className="text-xs font-medium uppercase text-neutral-500">Aniversário</dt>
                <dd className="mt-1 text-sm text-neutral-700">
                  {new Date(aluno.aniversario).toLocaleDateString('pt-BR')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Engajamento no produto + progresso da trilha */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold lowercase text-brand-deep">
              uso do produto
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs font-medium uppercase text-neutral-500">Total logins</div>
                <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                  {aluno.totalLogins}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-neutral-500">Último login</div>
                <div className="mt-1 text-sm text-neutral-700">
                  {aluno.diasDesdeUltimoLogin === null
                    ? 'nunca'
                    : aluno.diasDesdeUltimoLogin === 0
                      ? 'hoje'
                      : `há ${aluno.diasDesdeUltimoLogin}d`}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase text-neutral-500">Dias na plataforma</div>
                <div className="mt-1 text-sm text-neutral-700">{aluno.diasNaPlataforma}d</div>
              </div>
            </div>
            <p className="mt-4 text-xs text-neutral-400">
              dados alimentados por integração futura (Pagar.me / Circle / app mobile). Hoje
              populados via seed.
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold lowercase text-brand-deep">
                progresso da trilha
              </h2>
              <span className="text-sm text-neutral-500">{aluno.progressoPct}% concluído</span>
            </div>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-brand-orange transition-all"
                style={{ width: `${aluno.progressoPct}%` }}
              />
            </div>
            <ul className="space-y-2">
              {aluno.progressoChecklist.map((item) => (
                <li key={item.key}>
                  <label
                    className={`flex cursor-pointer items-start gap-2 text-sm ${
                      isDeleted || isAnonymized ? 'cursor-not-allowed opacity-60' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.completo}
                      disabled={
                        isDeleted ||
                        isAnonymized ||
                        toggleChecklistItem.isPending
                      }
                      onChange={() => toggleChecklistItem.mutate(item.key)}
                      className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-orange focus:ring-brand-orange disabled:cursor-not-allowed"
                    />
                    <span
                      className={
                        item.completo ? 'text-neutral-700 line-through' : 'text-neutral-700'
                      }
                    >
                      {item.label}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Consent + último contato */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold lowercase text-brand-deep">
              consentimento (LGPD)
            </h2>
            <ul className="space-y-2 text-sm">
              {[
                { key: 'consentEmail', label: 'e-mail', value: aluno.consentEmail },
                { key: 'consentWhatsapp', label: 'WhatsApp', value: aluno.consentWhatsapp },
                { key: 'consentOfertas', label: 'ofertas', value: aluno.consentOfertas },
              ].map((c) => (
                <li key={c.key} className="flex items-center gap-2">
                  {c.value ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-neutral-400" />
                  )}
                  <span className={c.value ? 'text-neutral-700' : 'text-neutral-400'}>
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-neutral-500">
              termos aceitos em {new Date(aluno.termsAcceptedAt).toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold lowercase text-brand-deep">
                último contato
              </h2>
              {!isDeleted && !isAnonymized && (
                <Button variant="ghost" size="sm" onClick={() => setContactOpen(true)}>
                  <PhoneCall className="h-3.5 w-3.5" />
                  registrar
                </Button>
              )}
            </div>
            {aluno.ultimoContatoEm ? (
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <Badge variant="plano">
                    {aluno.ultimoContatoCanal ? CANAL_LABEL[aluno.ultimoContatoCanal] : '—'}
                  </Badge>
                  <span className="text-sm text-neutral-700">
                    {new Date(aluno.ultimoContatoEm).toLocaleDateString('pt-BR')}
                  </span>
                  <span
                    className={`text-xs ${
                      (aluno.diasDesdeUltimoContato ?? 0) > 60 ? 'text-warning' : 'text-neutral-500'
                    }`}
                  >
                    (há {aluno.diasDesdeUltimoContato}d)
                  </span>
                </div>
                {aluno.ultimoContatoNota && (
                  <p className="text-sm text-neutral-700">{aluno.ultimoContatoNota}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">nunca contatado</div>
            )}
          </div>
        </div>

        {/* Timeline de auditoria */}
        <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-neutral-500" />
            <h2 className="font-display text-lg font-semibold lowercase text-brand-deep">
              histórico
            </h2>
          </div>

          {historyQuery.isLoading && <div className="text-sm text-neutral-500">carregando...</div>}
          {historyQuery.data?.items.length === 0 && (
            <div className="text-sm text-neutral-500">nenhum evento registrado</div>
          )}

          <ol className="relative space-y-4 border-l border-neutral-200 pl-6">
            {historyQuery.data?.items.map((event) => {
              const changes = diffFields(event.before, event.after);
              return (
                <li key={event.id} className="relative">
                  <span
                    className={`absolute -left-[27px] flex h-3 w-3 items-center justify-center rounded-full ring-4 ring-white ${ACTION_COLOR[event.action]}`}
                  />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-brand-deep">
                      {ACTION_LABEL[event.action]}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {event.adminEmail ?? 'sistema'} · {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                  {event.action === 'update' && changes.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
                      {changes.map((c) => (
                        <li key={c.key}>
                          <span className="font-mono text-neutral-500">{c.key}</span>:{' '}
                          <span className="line-through text-neutral-400">{String(c.before)}</span>{' '}
                          → <span className="font-medium">{String(c.after)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </main>

      <AlunoFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={aluno.cpf ? { ...aluno, cpf: aluno.cpf } : undefined}
      />
      <RegisterContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        alunoId={aluno.id}
        alunoNome={aluno.nome}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        aluno={aluno}
      />

      <Dialog open={anonymizeOpen} onOpenChange={setAnonymizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>anonimizar aluno?</DialogTitle>
            <DialogDescription>
              esta ação atende à LGPD (direito ao esquecimento). nome, CPF, e-mail e telefone serão
              <strong> permanentemente substituídos</strong> por marcadores genéricos. o histórico
              de auditoria é preservado para rastreabilidade. <strong>não pode ser desfeito.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAnonymizeOpen(false)}>
              cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => anonymizeMutation.mutate()}
              disabled={anonymizeMutation.isPending}
            >
              {anonymizeMutation.isPending ? 'anonimizando...' : 'anonimizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

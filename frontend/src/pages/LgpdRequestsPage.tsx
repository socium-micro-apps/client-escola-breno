import {
  LGPD_STATUS_LABEL,
  LGPD_TYPE_LABEL,
  type LgpdRequestDTO,
  type LgpdRequestStatus,
  type LgpdRequestType,
  createLgpdRequestSchema,
  type CreateLgpdRequestInput,
} from '@escola/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Topbar } from '@/components/Topbar';
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
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { ApiError, api } from '@/lib/api';

interface Response {
  items: LgpdRequestDTO[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: { totalAbertos: number; vencidos: number };
}

function StatusBadge({ status }: { status: LgpdRequestStatus }) {
  const variant = (
    {
      recebido: 'pausado',
      em_andamento: 'plano',
      concluido: 'ativo',
      rejeitado: 'cancelado',
    } as const
  )[status];
  return <Badge variant={variant}>{LGPD_STATUS_LABEL[status]}</Badge>;
}

function PrazoBadge({ dias, completedAt }: { dias: number; completedAt: string | null }) {
  if (completedAt) return <span className="text-xs text-neutral-500">concluído</span>;
  if (dias < 0) return <Badge variant="vencido">vencido há {Math.abs(dias)}d</Badge>;
  if (dias <= 5) return <Badge variant="vencendo">{dias}d</Badge>;
  return <span className="text-sm text-neutral-700">{dias}d</span>;
}

function NewRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<CreateLgpdRequestInput>({
    resolver: zodResolver(createLgpdRequestSchema),
    defaultValues: { requesterEmail: '', requesterCpf: '', type: 'acesso', notes: '' },
  });

  const type = watch('type');

  const mutation = useMutation({
    mutationFn: (data: CreateLgpdRequestInput) => api.post('/lgpd/requests', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lgpd'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('pedido registrado');
      reset();
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        for (const [field, msgs] of Object.entries(err.details)) {
          if (msgs?.[0]) setError(field as keyof CreateLgpdRequestInput, { message: msgs[0] });
        }
        return;
      }
      toast.error(err instanceof ApiError ? err.message : 'algo deu errado');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>novo pedido LGPD</DialogTitle>
          <DialogDescription>
            registre um pedido recebido por canal externo (telefone, e-mail manual). prazo legal de
            15 dias é calculado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail do solicitante</Label>
            <Input id="email" type="email" {...register('requesterEmail')} />
            {errors.requesterEmail && (
              <span className="text-xs text-danger">{errors.requesterEmail.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cpf">CPF do solicitante (opcional)</Label>
            <Input id="cpf" placeholder="000.000.000-00" {...register('requesterCpf')} />
            {errors.requesterCpf && (
              <span className="text-xs text-danger">{errors.requesterCpf.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setValue('type', v as LgpdRequestType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LGPD_TYPE_LABEL) as LgpdRequestType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {LGPD_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas</Label>
            <Input id="notes" placeholder="como o pedido chegou, observações..." {...register('notes')} />
            {errors.notes && <span className="text-xs text-danger">{errors.notes.message}</span>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'registrando...' : 'registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LgpdRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<LgpdRequestStatus | 'all'>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const query = useQuery<Response>({
    queryKey: ['lgpd', 'requests', statusFilter],
    queryFn: () =>
      api.get<Response>('/lgpd/requests', {
        status: statusFilter === 'all' ? undefined : statusFilter,
        pageSize: 50,
      }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LgpdRequestStatus }) =>
      api.patch(`/lgpd/requests/${id}`, { status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lgpd'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('status atualizado');
    },
  });

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold lowercase tracking-tight text-brand-deep">
              pedidos LGPD
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              registro de solicitações com prazo legal de 15 dias
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            novo pedido
          </Button>
        </div>

        {query.data && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Abertos
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {query.data.summary.totalAbertos}
              </div>
            </div>
            <div
              className={`rounded-lg border p-4 ${
                query.data.summary.vencidos > 0
                  ? 'border-danger/30 bg-red-50/40'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Vencidos
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {query.data.summary.vencidos}
              </div>
            </div>
          </div>
        )}

        <div className="mb-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as LgpdRequestStatus | 'all')}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">todos os status</SelectItem>
              {(Object.keys(LGPD_STATUS_LABEL) as LgpdRequestStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {LGPD_STATUS_LABEL[s]}
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
                  Recebido
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Solicitante
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Prazo
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {query.isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    carregando...
                  </td>
                </tr>
              )}
              {query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                    nenhum pedido no filtro
                  </td>
                </tr>
              )}
              {query.data?.items.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 text-neutral-700">
                    {new Date(r.receivedAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-brand-deep">{r.requesterEmail}</div>
                    {r.requesterCpfMasked && (
                      <div className="font-mono text-xs text-neutral-500">{r.requesterCpfMasked}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="plano">{LGPD_TYPE_LABEL[r.type]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">
                    <PrazoBadge dias={r.diasParaPrazo} completedAt={r.completedAt} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'recebido' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ id: r.id, status: 'em_andamento' })
                        }
                      >
                        iniciar
                      </Button>
                    )}
                    {r.status === 'em_andamento' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: r.id, status: 'concluido' })}
                      >
                        concluir
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <NewRequestDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

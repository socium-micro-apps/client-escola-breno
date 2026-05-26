import {
  AdminRoleSchema,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  inviteAdminSchema,
  type AdminDTO,
  type AdminInviteDTO,
  type AdminRole,
  type InviteAdminInput,
} from '@escola/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
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
import { useAuth } from '@/lib/auth';

interface ListResponse {
  admins: AdminDTO[];
  invitesPendentes: AdminInviteDTO[];
}

interface InviteCreated extends AdminInviteDTO {
  token?: string;
  link?: string;
}

function InviteCreatedDialog({
  invite,
  onClose,
}: {
  invite: InviteCreated | null;
  onClose: () => void;
}) {
  const fullLink = invite?.link
    ? `${window.location.origin}${invite.link}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullLink);
      toast.success('link copiado');
    } catch {
      toast.error('falha ao copiar');
    }
  };

  return (
    <Dialog open={Boolean(invite)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>convite criado</DialogTitle>
          <DialogDescription>
            envie este link para <strong className="text-brand-deep">{invite?.email}</strong>{' '}
            por qualquer canal (WhatsApp, e-mail). o token só é exibido **uma vez** — não é
            possível recuperar depois. expira em 7 dias.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-xs text-neutral-700 break-all">
          {fullLink}
        </div>

        <DialogFooter>
          <Button variant="primary" onClick={copyLink}>
            <Copy className="h-4 w-4" />
            copiar link
          </Button>
          <Button variant="ghost" onClick={onClose}>
            fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewInviteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (invite: InviteCreated) => void;
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
  } = useForm<InviteAdminInput>({
    resolver: zodResolver(inviteAdminSchema),
    defaultValues: { email: '', role: 'operacao' },
  });

  const role = watch('role');

  const mutation = useMutation({
    mutationFn: (data: InviteAdminInput) => api.post<InviteCreated>('/admins/invites', data),
    onSuccess: async (invite) => {
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
      reset();
      onOpenChange(false);
      onCreated(invite);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.details) {
        for (const [field, msgs] of Object.entries(err.details)) {
          if (msgs?.[0]) setError(field as keyof InviteAdminInput, { message: msgs[0] });
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
          <DialogTitle>novo admin</DialogTitle>
          <DialogDescription>
            envia um link de convite. quem aceitar define a própria senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="colega@escola.com" {...register('email')} />
            {errors.email && (
              <span className="text-xs text-danger">{errors.email.message}</span>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Papel</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as AdminRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AdminRoleSchema.options.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-neutral-500">{ROLE_DESCRIPTION[role]}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'gerando...' : 'gerar convite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoleBadge({ role }: { role: AdminRole }) {
  const variant = role === 'super_admin' ? 'ativo' : role === 'operacao' ? 'plano' : 'pausado';
  return <Badge variant={variant}>{ROLE_LABEL[role]}</Badge>;
}

export function AdminsPage() {
  const { admin: current, can } = useAuth();
  const queryClient = useQueryClient();
  const [newInviteOpen, setNewInviteOpen] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<InviteCreated | null>(null);
  const isSuperAdmin = can('super_admin');

  // Hooks declarados ANTES do guard — preserva ordem em todas as renderizações
  // (regras dos Hooks). O enabled controla se a query/mutation chega no servidor.
  const query = useQuery<ListResponse>({
    queryKey: ['admins'],
    queryFn: () => api.get<ListResponse>('/admins'),
    enabled: isSuperAdmin,
  });

  const updateRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminRole }) =>
      api.patch(`/admins/${id}/role`, { role }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('papel atualizado');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'algo deu errado'),
  });

  const removeAdmin = useMutation({
    mutationFn: (id: string) => api.delete(`/admins/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('admin removido');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'algo deu errado'),
  });

  const revokeInvite = useMutation({
    mutationFn: (id: string) => api.delete(`/admins/invites/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast.success('convite revogado');
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'algo deu errado'),
  });

  // Guard renderizado após todos os hooks
  if (!isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold lowercase tracking-tight text-brand-deep">
              administradores
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              quem acessa o painel — convide pessoas e defina o papel de cada uma
            </p>
          </div>
          <Button onClick={() => setNewInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            convidar admin
          </Button>
        </div>

        {/* Admins ativos */}
        <h2 className="mb-3 font-display text-lg font-semibold lowercase text-brand-deep">
          ativos
        </h2>
        <div className="mb-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  E-mail
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Papel
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Desde
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {query.data?.admins.map((a) => {
                const isMe = a.id === current?.id;
                return (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      {a.email}
                      {isMe && <span className="ml-2 text-xs text-neutral-500">(você)</span>}
                    </td>
                    <td className="px-4 py-3">
                      {isMe ? (
                        <RoleBadge role={a.role} />
                      ) : (
                        <Select
                          value={a.role}
                          onValueChange={(v) =>
                            updateRole.mutate({ id: a.id, role: v as AdminRole })
                          }
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AdminRoleSchema.options.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABEL[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">
                      {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isMe && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAdmin.mutate(a.id)}
                          aria-label="remover"
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Convites pendentes */}
        {query.data && query.data.invitesPendentes.length > 0 && (
          <>
            <h2 className="mb-3 font-display text-lg font-semibold lowercase text-brand-deep">
              convites pendentes
            </h2>
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      E-mail
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Papel
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Convidado por
                    </th>
                    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Expira
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-neutral-500">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {query.data.invitesPendentes.map((inv) => (
                    <tr key={inv.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3">{inv.email}</td>
                      <td className="px-4 py-3">
                        <RoleBadge role={inv.role} />
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">
                        {inv.createdByEmail ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {inv.expirado ? (
                          <Badge variant="vencido">expirado</Badge>
                        ) : (
                          <span className="text-neutral-700">
                            {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => revokeInvite.mutate(inv.id)}
                          aria-label="revogar"
                        >
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <NewInviteDialog
        open={newInviteOpen}
        onOpenChange={setNewInviteOpen}
        onCreated={setCreatedInvite}
      />
      <InviteCreatedDialog invite={createdInvite} onClose={() => setCreatedInvite(null)} />
    </div>
  );
}

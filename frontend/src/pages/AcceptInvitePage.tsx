import { ROLE_LABEL, acceptInviteSchema, type AcceptInviteInput, type AdminRole } from '@escola/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ApiError, api } from '@/lib/api';

interface InvitePreview {
  email: string;
  role: AdminRole;
  expiresAt: string;
}

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();

  const preview = useQuery<InvitePreview>({
    queryKey: ['invite', token],
    queryFn: () => api.get<InvitePreview>(`/admins/invites/${token}`),
    enabled: Boolean(token),
    retry: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: { password: '' },
  });

  const accept = useMutation({
    mutationFn: (data: AcceptInviteInput) =>
      api.post(`/admins/invites/${token}/accept`, data),
    onSuccess: () => toast.success('conta criada! você já pode fazer login'),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'algo deu errado'),
  });

  if (accept.isSuccess) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-neutral-50">
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-brand-orange text-3xl font-display font-bold text-white">
            e
          </div>
          <h1 className="font-display text-2xl font-bold lowercase tracking-tight text-brand-deep">
            escola do breno
          </h1>
          <p className="text-sm text-neutral-500">aceitar convite de admin</p>
        </div>

        <div className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
          {preview.isLoading && <div className="text-sm text-neutral-500">validando convite...</div>}

          {preview.isError && (
            <div className="text-center">
              <h2 className="text-lg font-semibold text-danger">convite inválido</h2>
              <p className="mt-2 text-sm text-neutral-500">
                este link pode ter sido revogado ou expirado.
              </p>
            </div>
          )}

          {preview.data && (
            <>
              <div className="mb-4 rounded-md bg-neutral-50 p-3 text-sm">
                <div className="text-neutral-700">
                  <strong>{preview.data.email}</strong>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <Badge variant="plano">{ROLE_LABEL[preview.data.role]}</Badge>
                  <span className="text-neutral-500">
                    expira em {new Date(preview.data.expiresAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit((d) => accept.mutate(d))} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">defina uma senha (mínimo 8 caracteres)</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    {...register('password')}
                  />
                  {errors.password && (
                    <span className="text-xs text-danger">{errors.password.message}</span>
                  )}
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting || accept.isPending}>
                  {accept.isPending ? 'criando conta...' : 'aceitar e criar conta'}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

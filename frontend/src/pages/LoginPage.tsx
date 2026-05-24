import { loginSchema, type LoginInput } from '@escola/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { ApiError, api } from '@/lib/api';
import { useAuth, type Admin } from '@/lib/auth';

export function LoginPage() {
  const { isAuthenticated, isLoading, refetch } = useAuth();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: (data: LoginInput) => api.post<Admin>('/auth/login', data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      refetch();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          toast.error('credenciais inválidas');
          return;
        }
        if (err.status === 429) {
          toast.error(err.message);
          return;
        }
        toast.error(err.message);
        return;
      }
      toast.error('algo deu errado. tenta de novo?');
    },
  });

  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/alunos" replace />;

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
          <p className="text-sm text-neutral-500">painel admin</p>
        </div>

        <form
          onSubmit={handleSubmit((data) => login.mutate(data))}
          className="w-full rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@escolabreno.com.br"
                autoComplete="username"
                autoFocus
                {...register('email')}
              />
              {errors.email && <span className="text-xs text-danger">{errors.email.message}</span>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
              />
              {errors.password && (
                <span className="text-xs text-danger">{errors.password.message}</span>
              )}
            </div>

            <Button type="submit" size="lg" disabled={isSubmitting || login.isPending}>
              {login.isPending ? 'entrando...' : 'entrar'}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-500">
          ferramenta interna · acesso restrito à operação
        </p>
      </div>
    </div>
  );
}

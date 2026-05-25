import { changePasswordSchema, type ChangePasswordInput } from '@escola/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ApiError, api } from '@/lib/api';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  useEffect(() => {
    if (open) reset({ currentPassword: '', newPassword: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (data: ChangePasswordInput) => api.post('/auth/change-password', data),
    onSuccess: () => {
      toast.success('senha alterada');
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError('currentPassword', { message: 'senha atual incorreta' });
          return;
        }
        if (err.status === 400 && err.details) {
          for (const [field, msgs] of Object.entries(err.details)) {
            if (msgs?.[0]) setError(field as keyof ChangePasswordInput, { message: msgs[0] });
          }
          return;
        }
        toast.error(err.message);
        return;
      }
      toast.error('algo deu errado. tenta de novo?');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>trocar senha</DialogTitle>
          <DialogDescription>
            sua sessão atual continua válida após a troca. outras sessões eventualmente abertas
            também — JWTs ativos não são invalidados ainda (próxima evolução).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="currentPassword">Senha atual</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <span className="text-xs text-danger">{errors.currentPassword.message}</span>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="mínimo 8 caracteres"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <span className="text-xs text-danger">{errors.newPassword.message}</span>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'salvando...' : 'trocar senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import {
  CANAL_LABEL,
  registerContactSchema,
  type CanalContato,
  type RegisterContactInput,
} from '@escola/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/Select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alunoId: string;
  alunoNome: string;
}

export function RegisterContactDialog({ open, onOpenChange, alunoId, alunoNome }: Props) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<RegisterContactInput>({
    resolver: zodResolver(registerContactSchema),
    defaultValues: { canal: 'whatsapp', nota: '' },
  });

  useEffect(() => {
    if (open) reset({ canal: 'whatsapp', nota: '' });
  }, [open, reset]);

  const canal = watch('canal');

  const mutation = useMutation({
    mutationFn: (data: RegisterContactInput) => api.post(`/alunos/${alunoId}/contact`, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('contato registrado');
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'algo deu errado');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>registrar contato</DialogTitle>
          <DialogDescription>
            registre o canal usado e uma nota opcional sobre a conversa com{' '}
            <strong className="text-brand-deep">{alunoNome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="canal">Canal</Label>
            <Select value={canal} onValueChange={(v) => setValue('canal', v as CanalContato)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">{CANAL_LABEL.whatsapp}</SelectItem>
                <SelectItem value="telefone">{CANAL_LABEL.telefone}</SelectItem>
                <SelectItem value="email">{CANAL_LABEL.email}</SelectItem>
                <SelectItem value="presencial">{CANAL_LABEL.presencial}</SelectItem>
                <SelectItem value="outro">{CANAL_LABEL.outro}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="nota">Nota (opcional)</Label>
            <Input id="nota" placeholder="o que foi conversado..." {...register('nota')} />
            {errors.nota && <span className="text-xs text-danger">{errors.nota.message}</span>}
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

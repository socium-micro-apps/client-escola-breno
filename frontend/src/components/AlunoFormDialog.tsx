import {
  createAlunoSchema,
  formatCpf,
  formatTelefone,
  type CreateAlunoInput,
  type Plano,
  type StatusAluno,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/Select';

interface AlunoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Quando passado, é modo edição
  initial?: {
    id: string;
    nome: string;
    email: string;
    cpf?: string; // só presente quando revelado
    cpfMasked: string;
    telefone: string;
    plano: Plano;
    status: StatusAluno;
  };
}

export function AlunoFormDialog({ open, onOpenChange, initial }: AlunoFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<CreateAlunoInput>({
    resolver: zodResolver(createAlunoSchema),
    defaultValues: {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      plano: 'basic',
      status: 'ativo',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        nome: initial?.nome ?? '',
        email: initial?.email ?? '',
        cpf: initial?.cpf ?? '',
        telefone: initial?.telefone ? formatTelefone(initial.telefone) : '',
        plano: initial?.plano ?? 'basic',
        status: initial?.status ?? 'ativo',
      });
    }
  }, [open, initial, reset]);

  const plano = watch('plano');
  const status = watch('status');

  const mutation = useMutation({
    mutationFn: (data: CreateAlunoInput) => {
      return isEdit
        ? api.patch(`/alunos/${initial!.id}`, data)
        : api.post('/alunos', data);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      toast.success(isEdit ? 'aluno atualizado' : 'aluno adicionado');
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.details) {
          for (const [field, messages] of Object.entries(err.details)) {
            if (messages?.[0]) setError(field as keyof CreateAlunoInput, { message: messages[0] });
          }
          return;
        }
        toast.error(err.message);
        return;
      }
      toast.error('algo deu errado. tenta de novo?');
    },
  });

  const onSubmit = handleSubmit((data) => mutation.mutate(data));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'editar aluno' : 'adicionar aluno'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'atualize os dados do aluno. CPF não pode ser alterado.'
              : 'preencha os dados para cadastrar.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" {...register('nome')} autoFocus />
            {errors.nome && <span className="text-xs text-danger">{errors.nome.message}</span>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <span className="text-xs text-danger">{errors.email.message}</span>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                placeholder="(11) 98765-4321"
                {...register('telefone')}
              />
              {errors.telefone && (
                <span className="text-xs text-danger">{errors.telefone.message}</span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              disabled={isEdit}
              defaultValue={initial?.cpf ? formatCpf(initial.cpf) : undefined}
              {...register('cpf')}
            />
            {isEdit && (
              <span className="text-xs text-neutral-500">
                {initial?.cpfMasked} (mascarado por padrão)
              </span>
            )}
            {errors.cpf && <span className="text-xs text-danger">{errors.cpf.message}</span>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="plano">Plano</Label>
              <Select value={plano} onValueChange={(v) => setValue('plano', v as Plano)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">basic</SelectItem>
                  <SelectItem value="premium">premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setValue('status', v as StatusAluno)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">ativo</SelectItem>
                  <SelectItem value="pausado">pausado</SelectItem>
                  <SelectItem value="cancelado">cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'salvando...' : isEdit ? 'salvar' : 'adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

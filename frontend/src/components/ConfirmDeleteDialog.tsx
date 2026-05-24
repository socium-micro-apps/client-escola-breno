import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from './ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/Dialog';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aluno: { id: string; nome: string } | null;
}

export function ConfirmDeleteDialog({ open, onOpenChange, aluno }: ConfirmDeleteDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/alunos/${aluno!.id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      toast.success('aluno removido');
      onOpenChange(false);
    },
    onError: () => {
      toast.error('algo deu errado. tenta de novo?');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>tem certeza?</DialogTitle>
          <DialogDescription>
            essa ação remove <strong className="text-brand-deep">{aluno?.nome}</strong> da listagem.
            o registro fica preservado no banco (soft delete) e pode ser recuperado manualmente se
            necessário.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-2">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'removendo...' : 'remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

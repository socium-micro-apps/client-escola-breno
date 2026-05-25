import {
  TRILHA_LABEL,
  createAlunoSchema,
  formatCpf,
  formatTelefone,
  type CreateAlunoInput,
  type StatusAluno,
  type Trilha,
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
  initial?: {
    id: string;
    nome: string;
    email: string;
    cpf?: string;
    cpfMasked: string;
    telefone: string;
    status: StatusAluno;
    trilha: Trilha;
    dataInicio: string;
    dataVencimento: string;
    renovacaoAutomatica: boolean;
    valorAnualCentavos: number;
    consentEmail: boolean;
    consentWhatsapp: boolean;
    consentOfertas: boolean;
  };
}

function dateInputValue(iso: string | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function AlunoFormDialog({ open, onOpenChange, initial }: AlunoFormDialogProps) {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initial);

  type FormInput = Omit<CreateAlunoInput, 'dataInicio' | 'dataVencimento'> & {
    dataInicio?: string;
    dataVencimento?: string;
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<FormInput>({
    resolver: zodResolver(createAlunoSchema) as never,
    defaultValues: {
      nome: '',
      email: '',
      cpf: '',
      telefone: '',
      plano: 'anual',
      status: 'ativo',
      trilha: 'saindo_da_divida',
      renovacaoAutomatica: true,
      valorAnualCentavos: 29880,
      consentEmail: true,
      consentWhatsapp: true,
      consentOfertas: false,
    },
  });

  useEffect(() => {
    if (open) {
      const today = new Date();
      const nextYear = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      reset({
        nome: initial?.nome ?? '',
        email: initial?.email ?? '',
        cpf: initial?.cpf ?? '',
        telefone: initial?.telefone ? formatTelefone(initial.telefone) : '',
        plano: 'anual',
        status: initial?.status ?? 'ativo',
        trilha: initial?.trilha ?? 'saindo_da_divida',
        dataInicio: dateInputValue(initial?.dataInicio) || today.toISOString().slice(0, 10),
        dataVencimento:
          dateInputValue(initial?.dataVencimento) || nextYear.toISOString().slice(0, 10),
        renovacaoAutomatica: initial?.renovacaoAutomatica ?? true,
        valorAnualCentavos: initial?.valorAnualCentavos ?? 29880,
        consentEmail: initial?.consentEmail ?? true,
        consentWhatsapp: initial?.consentWhatsapp ?? true,
        consentOfertas: initial?.consentOfertas ?? false,
      });
    }
  }, [open, initial, reset]);

  const status = watch('status');
  const trilha = watch('trilha');
  const renovacaoAutomatica = watch('renovacaoAutomatica');
  const valorAnualCentavos = watch('valorAnualCentavos') ?? 29880;
  const consentEmail = watch('consentEmail');
  const consentWhatsapp = watch('consentWhatsapp');
  const consentOfertas = watch('consentOfertas');

  const mutation = useMutation({
    mutationFn: (data: FormInput) => {
      const payload = {
        ...data,
        dataInicio: data.dataInicio ? new Date(data.dataInicio).toISOString() : undefined,
        dataVencimento: data.dataVencimento
          ? new Date(data.dataVencimento).toISOString()
          : undefined,
      };
      return isEdit
        ? api.patch(`/alunos/${initial!.id}`, payload)
        : api.post('/alunos', payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alunos'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(isEdit ? 'aluno atualizado' : 'aluno adicionado');
      onOpenChange(false);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 400 && err.details) {
          for (const [field, messages] of Object.entries(err.details)) {
            if (messages?.[0]) setError(field as keyof FormInput, { message: messages[0] });
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
      <DialogContent className="max-w-2xl">
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
              <Input id="telefone" placeholder="(11) 98765-4321" {...register('telefone')} />
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
              <Label htmlFor="trilha">Trilha</Label>
              <Select value={trilha} onValueChange={(v) => setValue('trilha', v as Trilha)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saindo_da_divida">{TRILHA_LABEL.saindo_da_divida}</SelectItem>
                  <SelectItem value="fazendo_sobrar_dinheiro">
                    {TRILHA_LABEL.fazendo_sobrar_dinheiro}
                  </SelectItem>
                  <SelectItem value="montando_reserva">
                    {TRILHA_LABEL.montando_reserva}
                  </SelectItem>
                  <SelectItem value="construindo_patrimonio">
                    {TRILHA_LABEL.construindo_patrimonio}
                  </SelectItem>
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="dataInicio">Início da assinatura</Label>
              <Input id="dataInicio" type="date" {...register('dataInicio')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dataVencimento">Vencimento</Label>
              <Input id="dataVencimento" type="date" {...register('dataVencimento')} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="valorAnual">Valor anual (centavos)</Label>
              <Input
                id="valorAnual"
                type="number"
                min="0"
                step="100"
                {...register('valorAnualCentavos', { valueAsNumber: true })}
              />
              <span className="text-xs text-neutral-500">
                {(valorAnualCentavos / 100).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
            <div className="flex items-end gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
              <input
                id="renovacaoAutomatica"
                type="checkbox"
                checked={renovacaoAutomatica}
                onChange={(e) => setValue('renovacaoAutomatica', e.target.checked)}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
              />
              <label
                htmlFor="renovacaoAutomatica"
                className="cursor-pointer text-sm text-neutral-700"
              >
                renovação automática
              </label>
            </div>
          </div>

          <fieldset className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
            <legend className="px-1 text-xs font-medium uppercase tracking-wide text-neutral-600">
              consentimentos LGPD
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                { key: 'consentEmail', label: 'e-mail', value: consentEmail },
                { key: 'consentWhatsapp', label: 'WhatsApp', value: consentWhatsapp },
                { key: 'consentOfertas', label: 'ofertas', value: consentOfertas },
              ].map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700"
                >
                  <input
                    type="checkbox"
                    checked={c.value}
                    onChange={(e) =>
                      setValue(c.key as 'consentEmail' | 'consentWhatsapp' | 'consentOfertas', e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer rounded border-neutral-300 text-brand-orange focus:ring-brand-orange"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </fieldset>

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

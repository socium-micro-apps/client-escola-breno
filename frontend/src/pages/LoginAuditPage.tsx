import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { useState } from 'react';
import { Topbar } from '@/components/Topbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { api } from '@/lib/api';

interface LoginAttempt {
  id: string;
  email: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  reason: string | null;
  createdAt: string;
}

interface Response {
  items: LoginAttempt[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: { sucessos24h: number; falhas24h: number };
}

type Filter = 'all' | 'true' | 'false';

const FILTER_LABEL: Record<Filter, string> = {
  all: 'todas',
  true: 'somente sucesso',
  false: 'somente falhas',
};

const REASON_LABEL: Record<string, string> = {
  user_not_found: 'usuário não existe',
  wrong_password: 'senha incorreta',
};

function shortUA(ua: string | null): string {
  if (!ua) return '';
  if (ua.length < 60) return ua;
  return ua.slice(0, 57) + '...';
}

export function LoginAuditPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const query = useQuery<Response>({
    queryKey: ['audit', 'login', filter],
    queryFn: () => api.get<Response>('/audit/login', { success: filter, pageSize: 100 }),
  });

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold lowercase tracking-tight text-brand-deep">
              auditoria de login
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              tentativas de acesso ao painel (sucesso + falha)
            </p>
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{FILTER_LABEL.all}</SelectItem>
              <SelectItem value="true">{FILTER_LABEL.true}</SelectItem>
              <SelectItem value="false">{FILTER_LABEL.false}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {query.data && (
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-brand-lime bg-lime-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Sucessos 24h
                </span>
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {query.data.summary.sucessos24h}
              </div>
            </div>
            <div
              className={`rounded-lg border p-4 ${
                query.data.summary.falhas24h > 0
                  ? 'border-danger/30 bg-red-50/40'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Falhas 24h
                </span>
                <ShieldAlert className="h-4 w-4 text-danger" />
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {query.data.summary.falhas24h}
              </div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Total no filtro
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {query.data.total}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Quando
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  E-mail
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  IP
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  User-Agent
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {query.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    carregando...
                  </td>
                </tr>
              )}
              {query.data?.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    nenhuma tentativa no filtro
                  </td>
                </tr>
              )}
              {query.data?.items.map((a) => (
                <tr key={a.id} className={a.success ? '' : 'bg-red-50/30'}>
                  <td className="px-4 py-3 text-neutral-700">
                    {new Date(a.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-700">{a.email}</td>
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{a.ip ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{shortUA(a.userAgent)}</td>
                  <td className="px-4 py-3">
                    {a.success ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" /> sucesso
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-danger">
                        <XCircle className="h-4 w-4" />
                        {REASON_LABEL[a.reason ?? ''] ?? a.reason ?? 'falha'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

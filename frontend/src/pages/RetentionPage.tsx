import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { Topbar } from '@/components/Topbar';
import { api } from '@/lib/api';

interface CohortRow {
  cohort: string; // YYYY-MM
  total: number;
  ativos: number;
  retidos: number;
  pctRetencao: number;
}

interface Response {
  cohorts: CohortRow[];
  geradoEm: string;
}

function formatCohortLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

function retentionColor(pct: number): string {
  if (pct >= 90) return 'bg-brand-lime text-brand-deep';
  if (pct >= 70) return 'bg-lime-200 text-brand-deep';
  if (pct >= 50) return 'bg-yellow-200 text-brand-deep';
  if (pct >= 30) return 'bg-orange-200 text-brand-deep';
  return 'bg-red-200 text-brand-deep';
}

export function RetentionPage() {
  const query = useQuery<Response>({
    queryKey: ['dashboard', 'cohort'],
    queryFn: () => api.get<Response>('/dashboard/cohort'),
  });

  const cohorts = query.data?.cohorts ?? [];
  const sortedAsc = [...cohorts].sort((a, b) => a.cohort.localeCompare(b.cohort));

  const totalMatriculados = cohorts.reduce((s, c) => s + c.total, 0);
  const totalAtivos = cohorts.reduce((s, c) => s + c.ativos, 0);
  const retencaoGlobal =
    totalMatriculados > 0 ? Math.round((totalAtivos / totalMatriculados) * 100) : 0;

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold lowercase tracking-tight text-brand-deep">
            retenção por cohort
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            quantos alunos de cada mês de matrícula ainda estão ativos hoje
          </p>
        </div>

        {query.data && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Cohorts
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {cohorts.length}
              </div>
              <div className="text-xs text-neutral-500">meses observados</div>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Matriculados
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {totalMatriculados}
              </div>
              <div className="text-xs text-neutral-500">total acumulado</div>
            </div>
            <div className="rounded-lg border border-brand-lime bg-lime-50/40 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Retenção global
                </span>
                <TrendingUp className="h-4 w-4 text-neutral-400" />
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-brand-deep">
                {retencaoGlobal}%
              </div>
              <div className="text-xs text-neutral-500">
                {totalAtivos} de {totalMatriculados}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Mês de entrada
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Matriculados
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Ainda ativos
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  % retenção
                </th>
                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Visualização
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
              {sortedAsc.length === 0 && !query.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                    sem dados de cohort
                  </td>
                </tr>
              )}
              {sortedAsc.map((c) => (
                <tr key={c.cohort} className="hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-brand-deep">
                    {formatCohortLabel(c.cohort)}
                  </td>
                  <td className="px-4 py-3 font-mono text-neutral-700">{c.total}</td>
                  <td className="px-4 py-3 font-mono text-neutral-700">{c.ativos}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${retentionColor(
                        c.pctRetencao,
                      )}`}
                    >
                      {c.pctRetencao}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-neutral-100">
                      <div
                        className={`h-full rounded-full ${
                          c.pctRetencao >= 70 ? 'bg-brand-lime' : 'bg-brand-orange'
                        }`}
                        style={{ width: `${c.pctRetencao}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          calculado a partir do <code>dataInicio</code> de cada aluno (truncado pelo mês).
          retenção = alunos com status <code>ativo</code> ÷ total da cohort.
        </p>
      </main>
    </div>
  );
}

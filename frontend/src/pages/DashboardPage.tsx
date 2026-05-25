import { TRILHA_LABEL, type Trilha } from '@escola/shared';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CalendarClock, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Topbar } from '@/components/Topbar';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface DashboardStats {
  total: number;
  novosUltimos30: number;
  canceladosUltimos30: number;
  vencendoProximos30: number;
  vencidos: number;
  status: { ativo: number; pausado: number; cancelado: number };
  trilha: Record<Trilha, number>;
  geradoEm: string;
}

const trilhaOrder: Trilha[] = [
  'saindo_da_divida',
  'fazendo_sobrar_dinheiro',
  'montando_reserva',
  'construindo_patrimonio',
];

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  emphasis?: 'default' | 'positive' | 'warning' | 'danger';
  to?: string;
}

function KpiCard({ label, value, hint, icon: Icon, emphasis = 'default', to }: KpiCardProps) {
  const styles = {
    default: 'border-neutral-200',
    positive: 'border-brand-lime bg-lime-50/40',
    warning: 'border-warning/30 bg-yellow-50/40',
    danger: 'border-danger/30 bg-red-50/40',
  } as const;

  const inner = (
    <div
      className={cn(
        'rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm',
        styles[emphasis],
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-neutral-400" />
      </div>
      <div className="mt-2 font-display text-3xl font-bold text-brand-deep">{value}</div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );

  return to ? (
    <Link to={to}>{inner}</Link>
  ) : (
    inner
  );
}

interface BarProps {
  label: string;
  count: number;
  total: number;
  color: string;
}

function Bar({ label, count, total, color }: BarProps) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="lowercase text-neutral-700">{label}</span>
        <span className="font-mono text-neutral-500">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const query = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get<DashboardStats>('/dashboard/stats'),
    staleTime: 30 * 1000,
  });

  const stats = query.data;

  return (
    <div className="min-h-screen">
      <Topbar />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="font-display text-3xl font-bold lowercase tracking-tight text-brand-deep">
            visão geral
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {stats
              ? `atualizado ${new Date(stats.geradoEm).toLocaleString('pt-BR')}`
              : 'carregando...'}
          </p>
        </div>

        {!stats && (
          <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center text-neutral-500">
            carregando...
          </div>
        )}

        {stats && (
          <>
            {/* KPIs principais */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard
                label="Total ativos"
                value={stats.total - stats.status.cancelado}
                hint={`${stats.total} cadastros no total`}
                icon={Users}
                to="/alunos?status=ativo"
              />
              <KpiCard
                label="Novos 30 dias"
                value={stats.novosUltimos30}
                hint="matrículas recentes"
                icon={TrendingUp}
                emphasis="positive"
              />
              <KpiCard
                label="Cancelados 30 dias"
                value={stats.canceladosUltimos30}
                hint="churn no período"
                icon={TrendingDown}
                emphasis={stats.canceladosUltimos30 > 0 ? 'warning' : 'default'}
              />
              <KpiCard
                label="Vencendo em 30 dias"
                value={stats.vencendoProximos30}
                hint="renovação próxima"
                icon={CalendarClock}
                emphasis={stats.vencendoProximos30 > 0 ? 'warning' : 'default'}
                to="/alunos"
              />
              <KpiCard
                label="Assinaturas vencidas"
                value={stats.vencidos}
                hint="ação requerida"
                icon={AlertTriangle}
                emphasis={stats.vencidos > 0 ? 'danger' : 'default'}
                to="/alunos"
              />
            </div>

            {/* Distribuições */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 font-display text-lg font-semibold lowercase text-brand-deep">
                  por status
                </h2>
                <div className="space-y-4">
                  <Bar
                    label="ativo"
                    count={stats.status.ativo}
                    total={stats.total}
                    color="bg-brand-lime"
                  />
                  <Bar
                    label="pausado"
                    count={stats.status.pausado}
                    total={stats.total}
                    color="bg-warning"
                  />
                  <Bar
                    label="cancelado"
                    count={stats.status.cancelado}
                    total={stats.total}
                    color="bg-neutral-400"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 bg-white p-6">
                <h2 className="mb-4 font-display text-lg font-semibold lowercase text-brand-deep">
                  por trilha
                </h2>
                <div className="space-y-4">
                  {trilhaOrder.map((t, idx) => (
                    <Bar
                      key={t}
                      label={TRILHA_LABEL[t]}
                      count={stats.trilha[t] ?? 0}
                      total={stats.total}
                      color={
                        idx === 0
                          ? 'bg-red-300'
                          : idx === 1
                            ? 'bg-orange-300'
                            : idx === 2
                              ? 'bg-yellow-300'
                              : 'bg-brand-lime'
                      }
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs text-neutral-500">
                  vocabulário oficial da escola — fase atual de cada aluno na jornada financeira
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import { ROLE_LABEL } from '@escola/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  LogOut,
  ScrollText,
  ShieldCheck,
  TrendingUp,
  Users,
  UsersRound,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from './ui/Button';

export function Topbar() {
  const { admin, refetch, can } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: async () => {
      await queryClient.clear();
      refetch();
    },
  });

  const navItems = [
    { to: '/dashboard', label: 'dashboard', icon: LayoutDashboard, show: true },
    { to: '/alunos', label: 'alunos', icon: Users, show: true },
    { to: '/retention', label: 'retenção', icon: TrendingUp, show: true },
    { to: '/lgpd/requests', label: 'LGPD', icon: ShieldCheck, show: true },
    { to: '/audit/login', label: 'auditoria', icon: ScrollText, show: true },
    {
      to: '/admins',
      label: 'admins',
      icon: UsersRound,
      show: can('super_admin'),
    },
  ].filter((n) => n.show);

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-orange text-white font-display font-bold">
              e
            </div>
            <span className="font-display text-lg font-bold lowercase text-brand-deep">
              escola do breno
            </span>
            <span className="ml-2 hidden text-xs text-neutral-500 sm:inline">admin</span>
          </Link>
          <nav className="hidden gap-1 sm:flex">
            {navItems.map((item) => {
              const active = location.pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-neutral-100 text-brand-deep'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-brand-deep',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {admin && (
            <div className="hidden text-right sm:block">
              <div className="text-sm text-neutral-700">{admin.email}</div>
              <div className="text-xs text-neutral-500">{ROLE_LABEL[admin.role]}</div>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut className="h-4 w-4" />
            sair
          </Button>
        </div>
      </div>
    </header>
  );
}

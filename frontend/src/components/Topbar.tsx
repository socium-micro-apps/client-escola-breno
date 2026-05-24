import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Button } from './ui/Button';

export function Topbar() {
  const { admin, refetch } = useAuth();
  const queryClient = useQueryClient();

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: async () => {
      await queryClient.clear();
      refetch();
    },
  });

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-orange text-white font-display font-bold">
            e
          </div>
          <span className="font-display text-lg font-bold lowercase text-brand-deep">
            escola do breno
          </span>
          <span className="ml-2 hidden text-xs text-neutral-500 sm:inline">admin</span>
        </div>

        <div className="flex items-center gap-3">
          {admin && <span className="hidden text-sm text-neutral-600 sm:inline">{admin.email}</span>}
          <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
            <LogOut className="h-4 w-4" />
            sair
          </Button>
        </div>
      </div>
    </header>
  );
}

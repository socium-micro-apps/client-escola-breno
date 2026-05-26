import type { AdminRole } from '@escola/shared';
import { useQuery } from '@tanstack/react-query';
import { createContext, useContext, type ReactNode } from 'react';
import { ApiError, api } from './api';

export interface Admin {
  id: string;
  email: string;
  role: AdminRole;
}

interface AuthContextValue {
  admin: Admin | undefined;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => void;
  can: (...allowed: AdminRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        return await api.get<Admin>('/auth/me');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const admin = data ?? undefined;

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: Boolean(data),
        refetch,
        can: (...allowed) => Boolean(admin && allowed.includes(admin.role)),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}

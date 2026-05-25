import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AlunoDetailPage } from '@/pages/AlunoDetailPage';
import { AlunosPage } from '@/pages/AlunosPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LgpdRequestsPage } from '@/pages/LgpdRequestsPage';
import { LoginAuditPage } from '@/pages/LoginAuditPage';
import { LoginPage } from '@/pages/LoginPage';
import { useAuth } from '@/lib/auth';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-neutral-500">
        carregando...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/alunos"
          element={
            <RequireAuth>
              <AlunosPage />
            </RequireAuth>
          }
        />
        <Route
          path="/alunos/:id"
          element={
            <RequireAuth>
              <AlunoDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/lgpd/requests"
          element={
            <RequireAuth>
              <LgpdRequestsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/audit/login"
          element={
            <RequireAuth>
              <LoginAuditPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </>
  );
}

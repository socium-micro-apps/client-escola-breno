import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AlunosPage } from '@/pages/AlunosPage';
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
          path="/alunos"
          element={
            <RequireAuth>
              <AlunosPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/alunos" replace />} />
        <Route path="*" element={<Navigate to="/alunos" replace />} />
      </Routes>
      <Toaster position="bottom-right" richColors />
    </>
  );
}

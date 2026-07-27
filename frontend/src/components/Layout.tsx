import { Outlet, useLocation, Navigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          Store — учебный проект. Фронтенд на React + shadcn/ui, бэкенд на .NET 10.
        </div>
      </footer>
    </div>
  );
}

/** Гард для маршрутов, требующих Customer-токен. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Запоминаем, куда шли, чтобы вернуть после логина
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

/** Гард для админки — нужен dev-токен из /get-test-admin-token. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

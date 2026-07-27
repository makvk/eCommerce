import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/api/endpoints";
import { getToken, setToken } from "@/api/client";
import { decodeJwt, isExpired } from "@/lib/jwt";
import type { FullName } from "@/api/types";

const ADMIN_TOKEN_KEY = "ecommerce.adminToken";

interface AuthState {
  token: string | null;
  email: string | null;
  userId: string | null;
  isAuthenticated: boolean;
  /** Отдельный dev-токен админа из GET /get-test-admin-token */
  adminToken: string | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: FullName) => Promise<void>;
  logout: () => void;
  enableAdmin: () => Promise<void>;
  disableAdmin: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [token, setTokenState] = useState<string | null>(() => {
    const stored = getToken();
    // Протухший токен чистим сразу, чтобы не ловить 401 на каждом запросе
    if (stored && isExpired(stored)) {
      setToken(null);
      return null;
    }
    return stored;
  });

  const [adminToken, setAdminTokenState] = useState<string | null>(() => {
    const stored = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (stored && isExpired(stored)) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return null;
    }
    return stored;
  });

  const claims = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const applyToken = useCallback(
    (next: string | null) => {
      setToken(next);
      setTokenState(next);
      // Данные предыдущего пользователя больше не валидны
      queryClient.clear();
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const { token: newToken } = await authApi.login(email, password);
      applyToken(newToken);
    },
    [applyToken],
  );

  const register = useCallback(
    async (email: string, password: string, fullName: FullName) => {
      const { token: newToken } = await authApi.register(email, password, fullName);
      applyToken(newToken);
    },
    [applyToken],
  );

  const logout = useCallback(() => applyToken(null), [applyToken]);

  const enableAdmin = useCallback(async () => {
    const { token: newToken } = await authApi.testAdminToken();
    localStorage.setItem(ADMIN_TOKEN_KEY, newToken);
    setAdminTokenState(newToken);
  }, []);

  const disableAdmin = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminTokenState(null);
  }, []);

  // Токен живёт 60 минут — выкидываем ровно в момент истечения, а не по 401
  useEffect(() => {
    if (!claims?.expiresAt) return;
    const ms = claims.expiresAt - Date.now();
    if (ms <= 0) {
      applyToken(null);
      return;
    }
    const timer = setTimeout(() => applyToken(null), ms);
    return () => clearTimeout(timer);
  }, [claims?.expiresAt, applyToken]);

  const value = useMemo<AuthState>(
    () => ({
      token,
      email: claims?.email ?? null,
      userId: claims?.userId ?? null,
      isAuthenticated: Boolean(token),
      adminToken,
      isAdmin: Boolean(adminToken),
      login,
      register,
      logout,
      enableAdmin,
      disableAdmin,
    }),
    [token, claims, adminToken, login, register, logout, enableAdmin, disableAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен вызываться внутри <AuthProvider>");
  return ctx;
}

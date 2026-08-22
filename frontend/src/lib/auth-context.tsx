"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import type { AuthUser, Company } from "./types";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) => Promise<void>;
  logout: () => void;
  /** Troca a propriedade ativa (usuários com mais de uma) e atualiza a sessão local. */
  selectCompany: (companyId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function persistSession(res: AuthResponse) {
  window.localStorage.setItem("mga360_access_token", res.accessToken);
  window.localStorage.setItem("mga360_refresh_token", res.refreshToken);
  window.localStorage.setItem("mga360_user", JSON.stringify(res.user));
}

/**
 * Depois de logar/cadastrar, decide para onde mandar o usuário:
 * - ADMIN -> painel administrativo, sempre.
 * - CLIENT com companyId já definido (login resolveu sozinho, só 1 propriedade) -> dashboard.
 * - CLIENT sem companyId -> confere quantas propriedades ele tem:
 *     0 -> onboarding (cadastrar a primeira)
 *     2+ -> tela de escolher qual propriedade usar agora
 */
async function resolveDestination(user: AuthUser): Promise<string> {
  if (user.role === "ADMIN") return "/admin";
  if (user.companyId) return "/dashboard";

  const companies = await api.get<Company[]>("/auth/my-companies");
  if (companies.length === 0) return "/onboarding";
  return "/selecionar-propriedade";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = window.localStorage.getItem("mga360_user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/login", { email, password });
      persistSession(res);
      setUser(res.user);
      router.push(await resolveDestination(res.user));
    },
    [router]
  );

  const signup = useCallback(
    async (data: { name: string; email: string; phone?: string; password: string; confirmPassword: string }) => {
      const res = await api.post<AuthResponse>("/auth/signup", data);
      persistSession(res);
      setUser(res.user);
      router.push(await resolveDestination(res.user));
    },
    [router]
  );

  const selectCompany = useCallback(
    async (companyId: string) => {
      const res = await api.post<{ accessToken: string; companyId: string }>("/auth/select-company", { companyId });
      window.localStorage.setItem("mga360_access_token", res.accessToken);
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, companyId: res.companyId };
        window.localStorage.setItem("mga360_user", JSON.stringify(updated));
        return updated;
      });
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(() => {
    window.localStorage.removeItem("mga360_access_token");
    window.localStorage.removeItem("mga360_refresh_token");
    window.localStorage.removeItem("mga360_user");
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, selectCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

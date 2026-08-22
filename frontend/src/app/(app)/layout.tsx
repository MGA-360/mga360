"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/Sidebar";
import { api } from "@/lib/api";
import type { Company } from "@/lib/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // CLIENT sem propriedade ativa: manda pro onboarding (ou pra escolher,
    // se já tiver mais de uma) em vez de deixar acessar telas que dependem
    // de uma empresa selecionada.
    if (user.role === "CLIENT" && !user.companyId) {
      api.get<Company[]>("/auth/my-companies").then((companies) => {
        router.replace(companies.length === 0 ? "/onboarding" : "/selecionar-propriedade");
      });
    }
  }, [loading, user, router]);

  if (loading || !user || (user.role === "CLIENT" && !user.companyId)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-soft">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-palha">
      <Sidebar />
      <main className="flex-1 p-8 max-w-6xl">{children}</main>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Company } from "@/lib/types";

export default function SelecionarPropriedadePage() {
  const { user, loading, selectCompany, logout } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      api.get<Company[]>("/auth/my-companies").then((list) => {
        if (list.length === 0) {
          router.replace("/onboarding");
        } else {
          setCompanies(list);
        }
      });
    }
  }, [user, router]);

  async function handleSelect(companyId: string) {
    setSwitchingId(companyId);
    try {
      await selectCompany(companyId);
    } finally {
      setSwitchingId(null);
    }
  }

  if (loading || !user || !companies) return null;

  return (
    <main className="min-h-screen bg-palha flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="growth-line w-14 mb-4" />
        <h1 className="text-2xl font-semibold">Minhas Propriedades</h1>
        <p className="text-ink-soft mt-1 mb-8">Escolha qual propriedade você quer acessar agora.</p>

        <div className="space-y-3">
          {companies.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.id)}
              disabled={switchingId !== null}
              className="card w-full text-left hover:border-pasto/40 transition-colors flex items-center justify-between disabled:opacity-50"
            >
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-sm text-ink-faint">
                  {c.ownerName}
                  {c.city ? ` — ${c.city}${c.state ? `/${c.state}` : ""}` : ""}
                </p>
              </div>
              <span className="text-pasto text-sm">{switchingId === c.id ? "Entrando..." : "Acessar →"}</span>
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Link href="/onboarding" className="btn-secondary text-sm">
            + Cadastrar nova propriedade
          </Link>
          <button onClick={logout} className="text-sm text-ink-soft hover:text-ink">
            Sair
          </button>
        </div>
      </div>
    </main>
  );
}

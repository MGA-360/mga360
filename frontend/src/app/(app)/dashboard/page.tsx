"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { ProgressBar } from "@/components/ui";
import type { Company, ProgressSummary } from "@/lib/types";

const MODULE_LABELS: Record<string, string> = {
  CADASTRO: "Cadastro",
  PLANEJAMENTO: "Planejamento",
  FINANCEIRO: "Financeiro",
  CUSTOS: "Custos",
  ESTOQUE: "Estoque",
  PESSOAS: "Pessoas",
};

export default function DashboardInicialPage() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get<Company>("/companies/me"), api.get<ProgressSummary>("/progress")])
      .then(([c, p]) => {
        setCompany(c);
        setProgress(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <div>
        <div className="growth-line w-14 mb-4" />
        <h1 className="text-3xl font-semibold">Olá, {firstName}.</h1>
        <p className="text-ink-soft mt-1">
          {loading ? "Carregando dados da propriedade..." : `${company?.name ?? "Sua propriedade"} — vamos continuar o diagnóstico.`}
        </p>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-ink-soft">Diagnóstico concluído</p>
            <p className="font-mono text-3xl font-medium text-mata">
              {loading ? "—" : `${Math.round(progress?.overallPct ?? 0)}%`}
            </p>
          </div>
          <Link href="/diagnostico/financeiro" className="btn-primary">
            Continuar Diagnóstico
          </Link>
        </div>
        <ProgressBar pct={progress?.overallPct ?? 0} />
        <p className="text-sm text-ink-faint mt-3">
          {loading
            ? " "
            : `${progress?.completedModules ?? 0} de ${progress?.totalModules ?? 6} módulos concluídos`}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Módulos</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(MODULE_LABELS).map(([key, label]) => {
            const pct = progress?.byModule?.[key] ?? 0;
            const href =
              key === "CADASTRO" ? "/cadastro" : `/diagnostico/${label.toLowerCase()}`;
            return (
              <Link key={key} href={href} className="card hover:border-pasto/40 transition-colors block">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-ink">{label}</span>
                  <span className="text-xs text-ink-faint font-mono">{Math.round(pct)}%</span>
                </div>
                <ProgressBar pct={pct} />
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/resultados/radar" className="card hover:border-pasto/40 transition-colors">
          <p className="text-sm text-ink-soft mb-1">🎯 Radar MGA 360</p>
          <p className="text-ink-faint text-sm">Veja o índice de saúde da gestão da propriedade.</p>
        </Link>
        <Link href="/resultados/dashboard" className="card hover:border-pasto/40 transition-colors">
          <p className="text-sm text-ink-soft mb-1">📊 Dashboard</p>
          <p className="text-ink-faint text-sm">KPIs, ponto de equilíbrio e evolução do ano.</p>
        </Link>
        <Link href="/resultados/decisao" className="card hover:border-pasto/40 transition-colors">
          <p className="text-sm text-ink-soft mb-1">🧭 Decisão</p>
          <p className="text-ink-faint text-sm">Respostas às perguntas-guia de gestão.</p>
        </Link>
      </div>
    </div>
  );
}

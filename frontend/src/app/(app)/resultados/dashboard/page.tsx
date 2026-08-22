"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "@/lib/api";
import { formatBRL, formatPct } from "@/lib/format";
import { KpiCard } from "@/components/ui";
import { BreakEvenGauge } from "@/components/BreakEvenGauge";
import type { DashboardSummary, ActivityComparisonRow, Activity } from "@/lib/types";

export default function DashboardResultadosPage() {
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comparison, setComparison] = useState<ActivityComparisonRow[] | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<string>(""); // "" = Geral
  const year = new Date().getFullYear();

  // Lista de atividades (para o seletor) e comparativo carregam uma vez só —
  // não dependem da atividade selecionada no momento.
  useEffect(() => {
    api.get<Activity[]>("/activities").then(setActivities);
    api.get<ActivityComparisonRow[]>(`/dashboard/by-activity?year=${year}`).then(setComparison);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O resumo do Dashboard recarrega toda vez que a atividade selecionada muda.
  useEffect(() => {
    const query = selectedActivityId ? `?year=${year}&activityId=${selectedActivityId}` : `?year=${year}`;
    setDashboard(null);
    api.get<DashboardSummary>(`/dashboard/summary${query}`).then(setDashboard);
  }, [year, selectedActivityId]);

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-ink-soft mt-1">Indicadores gerais e evolução do diagnóstico em {year}.</p>
        </div>

        {activities.length > 0 && (
          <div className="min-w-[220px]">
            <label className="field-label">Atividade</label>
            <select
              className="field-input"
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
            >
              <option value="">Geral (todas as atividades)</option>
              {activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!dashboard ? (
        <p className="text-ink-faint">Carregando...</p>
      ) : (
        <>
          {dashboard.activityName && (
            <p className="text-sm text-ink-soft -mt-4">
              Mostrando somente dados de <strong>{dashboard.activityName}</strong>.
            </p>
          )}

          <div className="grid sm:grid-cols-4 gap-4">
            <KpiCard label="Receita Anual" value={formatBRL(dashboard.annualRevenue)} />
            <KpiCard label="Custo Anual" value={formatBRL(dashboard.annualCost)} />
            <KpiCard label="Lucro Anual" value={formatBRL(dashboard.annualProfit)} />
            <KpiCard label="Margem de Lucro" value={formatPct(dashboard.annualMargin, 1)} />
          </div>

          <div className="card grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-medium text-lg mb-1">Ponto de Equilíbrio</h2>
              <p className="text-sm text-ink-soft mb-4">{dashboard.breakEven.statusMessage}</p>
              <BreakEvenGauge pointerPct={dashboard.breakEven.gaugePointerPct} />
            </div>
            <div className="space-y-3 text-sm">
              <Row label="Custo Fixo" value={formatBRL(dashboard.breakEven.fixedCostTotal)} />
              <Row label="Custo Variável" value={formatBRL(dashboard.breakEven.variableCostTotal)} />
              <Row label="Margem de Contribuição" value={formatPct(dashboard.breakEven.contributionMarginPct, 1)} />
              <Row label="Ponto de Equilíbrio (R$)" value={formatBRL(dashboard.breakEven.breakEvenValue)} />
              <Row label="Receita Realizada" value={formatBRL(dashboard.breakEven.realizedRevenue)} />
              <Row label="% do PE atingido" value={formatPct(dashboard.breakEven.pctOfBreakEvenReached, 0)} bold />
            </div>
          </div>

          <div className="card">
            <h2 className="font-medium text-lg mb-4">Resultado mensal</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dashboard.monthlyResults}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2DDC9" vertical={false} />
                <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(0, 3)} tick={{ fontSize: 12, fill: "#5B6B5E" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#5B6B5E" }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ borderRadius: 8, borderColor: "#E2DDC9" }} />
                <Bar dataKey="revenue" name="Receita" fill="#35603F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cost" name="Custo" fill="#A6432A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {dashboard.productivity.length > 0 && (
            <div className="card">
              <h2 className="font-medium text-lg mb-4">Produtividade x Metas</h2>
              <div className="space-y-3">
                {dashboard.productivity.map((p) => (
                  <div key={p.activityName} className="flex items-center justify-between text-sm">
                    <span>{p.activityName}</span>
                    <span className="font-mono text-ink-soft">
                      {p.achieved} / {p.annualGoal} {p.unit} ({formatPct(p.pctAchieved)})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comparison && comparison.length > 1 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h2 className="font-medium text-lg">Comparativo entre atividades</h2>
                <p className="text-sm text-ink-faint">Qual atividade tem melhor faturamento, custo e resultado.</p>
              </div>
              <table className="w-full text-sm mt-2">
                <thead>
                  <tr className="border-b border-border text-left text-ink-soft">
                    <th className="px-6 py-3 font-medium">Atividade</th>
                    <th className="px-6 py-3 font-medium text-right">Receita</th>
                    <th className="px-6 py-3 font-medium text-right">Custos</th>
                    <th className="px-6 py-3 font-medium text-right">Resultado</th>
                    <th className="px-6 py-3 font-medium text-right">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison
                    .slice()
                    .sort((a, b) => b.result - a.result)
                    .map((row) => (
                      <tr key={row.activityId} className="border-b border-border last:border-0">
                        <td className="px-6 py-3">{row.activityName}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatBRL(row.revenue)}</td>
                        <td className="px-6 py-3 text-right font-mono">{formatBRL(row.cost)}</td>
                        <td className={`px-6 py-3 text-right font-mono font-medium ${row.result >= 0 ? "text-pasto-dark" : "text-terra"}`}>
                          {formatBRL(row.result)}
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-ink-soft">{formatPct(row.margin, 1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0">
      <span className="text-ink-soft">{label}</span>
      <span className={`font-mono ${bold ? "font-semibold text-mata" : ""}`}>{value}</span>
    </div>
  );
}

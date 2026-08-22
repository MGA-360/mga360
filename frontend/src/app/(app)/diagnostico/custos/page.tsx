"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatBRL, formatPct } from "@/lib/format";

interface CostsSummary {
  year: number;
  categories: { category: string; costType: "FIXO" | "VARIAVEL"; totalYear: number; pctOfTotal: number }[];
  totalYear: number;
}

export default function CustosPage() {
  const [summary, setSummary] = useState<CostsSummary | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.get<CostsSummary>(`/costs/summary?year=${year}`).then(setSummary);
  }, [year]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Custos</h1>
        <p className="text-ink-soft mt-1">
          Módulo 4 — calculado automaticamente a partir dos lançamentos de Saídas no Financeiro. Nada é digitado
          aqui.
        </p>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-soft">
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium text-right">Total no ano</th>
              <th className="px-4 py-3 font-medium text-right">% do total</th>
            </tr>
          </thead>
          <tbody>
            {!summary ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-faint">
                  Carregando...
                </td>
              </tr>
            ) : (
              summary.categories.map((c) => (
                <tr key={c.category} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{c.category}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        c.costType === "FIXO" ? "bg-mata/10 text-mata" : "bg-milho/15 text-milho"
                      }`}
                    >
                      {c.costType === "FIXO" ? "Fixo" : "Variável"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(c.totalYear)}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink-soft">{formatPct(c.pctOfTotal, 1)}</td>
                </tr>
              ))
            )}
          </tbody>
          {summary && (
            <tfoot>
              <tr className="border-t border-border bg-palha-alt/50">
                <td colSpan={2} className="px-4 py-3 font-medium">
                  Total
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium">{formatBRL(summary.totalYear)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

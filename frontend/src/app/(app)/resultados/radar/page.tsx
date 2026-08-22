"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RadarChart } from "@/components/RadarChart";
import type { RadarScore } from "@/lib/types";

export default function RadarPage() {
  const [radar, setRadar] = useState<RadarScore | null>(null);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.get<RadarScore>(`/radar/score?year=${year}`).then(setRadar);
  }, [year]);

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Radar MGA 360</h1>
        <p className="text-ink-soft mt-1">O índice geral de saúde da gestão da sua propriedade em {year}.</p>
      </div>

      {!radar ? (
        <p className="text-ink-faint">Calculando índice...</p>
      ) : (
        <>
          <div className="card grid md:grid-cols-2 gap-8 items-center">
            <RadarChart
              axes={[
                { label: "Margem", value: radar.scoreMargin },
                { label: "Ponto de Equilíbrio", value: radar.scoreBreakEven },
                { label: "Metas Produtivas", value: radar.scoreGoals },
                { label: "Estoque", value: radar.scoreInventory },
              ]}
            />
            <div className="text-center md:text-left">
              <p className="text-sm text-ink-soft mb-1">Índice geral</p>
              <p className="font-mono text-5xl font-medium text-mata">{radar.radarIndex.toFixed(0)}</p>
              <p className="text-lg mt-1">{radar.statusLabel}</p>
              <p className="text-sm text-ink-faint mt-2">{radar.trendLabel}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card">
              <h3 className="font-medium mb-2 text-pasto-dark">✅ Pontos fortes</h3>
              <ul className="text-sm text-ink-soft space-y-1">
                {radar.strengths.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-medium mb-2 text-milho">⚠️ Pontos de atenção</h3>
              <ul className="text-sm text-ink-soft space-y-1">
                {radar.attentionPoints.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="card">
              <h3 className="font-medium mb-2 text-mata">🎯 Próximo objetivo</h3>
              <p className="text-sm text-ink-soft">{radar.nextObjective}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

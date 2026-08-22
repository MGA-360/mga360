"use client";

import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { formatPct } from "@/lib/format";
import { ProgressBar } from "@/components/ui";
import type { Activity } from "@/lib/types";

interface Goal {
  id: string;
  activityId: string;
  activity: Activity;
  unit: string;
  annualGoal: number;
  achievedValue: number;
  pctAchieved: number;
}

export default function PlanejamentoPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const year = new Date().getFullYear();

  const [form, setForm] = useState({ activityId: "", unit: "", annualGoal: "", achievedValue: "" });

  async function load() {
    const [g, a] = await Promise.all([
      api.get<Goal[]>(`/planning/goals?year=${year}`),
      api.get<Activity[]>("/activities"),
    ]);
    setGoals(g);
    setActivities(a);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/planning/goals", {
      activityId: form.activityId,
      unit: form.unit,
      annualGoal: Number(form.annualGoal),
      achievedValue: Number(form.achievedValue || 0),
      year,
    });
    setForm({ activityId: "", unit: "", annualGoal: "", achievedValue: "" });
    await load();
    await api.put("/progress", { module: "PLANEJAMENTO", completionPct: 100 });
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Planejamento</h1>
        <p className="text-ink-soft mt-1">Módulo 2 — metas produtivas anuais por atividade.</p>
      </div>

      <form onSubmit={handleSubmit} className="card grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="field-label">Atividade</label>
          <select required className="field-input" value={form.activityId} onChange={(e) => setForm({ ...form, activityId: e.target.value })}>
            <option value="">Selecione</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Unidade</label>
          <input required className="field-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Litros, kg, cabeças..." />
        </div>
        <div>
          <label className="field-label">Meta anual</label>
          <input type="number" step="0.01" required className="field-input" value={form.annualGoal} onChange={(e) => setForm({ ...form, annualGoal: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Realizado até agora</label>
          <input type="number" step="0.01" className="field-input" value={form.achievedValue} onChange={(e) => setForm({ ...form, achievedValue: e.target.value })} />
        </div>
        <div className="sm:col-span-4">
          <button type="submit" className="btn-primary">Salvar meta</button>
        </div>
      </form>

      <div className="space-y-3">
        {loading ? (
          <p className="text-ink-faint">Carregando...</p>
        ) : goals.length === 0 ? (
          <p className="text-ink-faint">Nenhuma meta cadastrada para {year}.</p>
        ) : (
          goals.map((g) => (
            <div key={g.id} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{g.activity.name}</span>
                <span className="font-mono text-sm text-ink-soft">
                  {g.achievedValue} / {g.annualGoal} {g.unit} — {formatPct(g.pctAchieved)}
                </span>
              </div>
              <ProgressBar pct={g.pctAchieved * 100} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

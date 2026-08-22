"use client";

import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import type { Company, Activity } from "@/lib/types";

export default function CadastroPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    Promise.all([api.get<Company>("/companies/me"), api.get<Activity[]>("/activities")])
      .then(([c, a]) => {
        setCompany(c);
        setActivities(a);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    try {
      const updated = await api.patch<Company>("/companies/me", {
        name: company.name,
        ownerName: company.ownerName,
        city: company.city,
        state: company.state,
        totalAreaHa: company.totalAreaHa ? Number(company.totalAreaHa) : undefined,
        productiveAreaHa: company.productiveAreaHa ? Number(company.productiveAreaHa) : undefined,
        activitiesSummary: company.activitiesSummary,
      });
      setCompany(updated);
      await api.put("/progress", { module: "CADASTRO", completionPct: 100 });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  async function addActivity() {
    const seqNumber = (activities.at(-1)?.seqNumber ?? 0) + 1;
    const created = await api.post<Activity>("/activities", { seqNumber, name: "Nova atividade" });
    setActivities((prev) => [...prev, created]);
  }

  async function updateActivity(id: string, patch: Partial<Activity>) {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    await api.patch(`/activities/${id}`, patch);
  }

  async function removeActivity(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    await api.delete(`/activities/${id}`);
  }

  if (loading || !company) return <p className="text-ink-soft">Carregando...</p>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Cadastro da Propriedade</h1>
        <p className="text-ink-soft mt-1">Módulo 1 — dados gerais, atividades e patrimônio.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        <h2 className="font-medium text-lg">1. Dados Gerais</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label">Nome da Propriedade</label>
            <input
              className="field-input"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Proprietário / Gestor</label>
            <input
              className="field-input"
              value={company.ownerName}
              onChange={(e) => setCompany({ ...company, ownerName: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">Cidade</label>
            <input
              className="field-input"
              value={company.city ?? ""}
              onChange={(e) => setCompany({ ...company, city: e.target.value })}
            />
          </div>
          <div>
            <label className="field-label">UF</label>
            <select
              className="field-input"
              value={company.state ?? ""}
              onChange={(e) => setCompany({ ...company, state: e.target.value })}
            >
              <option value="">Selecione</option>
              {["PI", "MA", "CE", "PE", "BA", "GO", "MT", "MS", "MG", "SP", "PR", "RS", "SC"].map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Área Total (ha)</label>
            <input
              type="number"
              step="0.01"
              className="field-input"
              value={company.totalAreaHa ?? ""}
              onChange={(e) => setCompany({ ...company, totalAreaHa: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="field-label">Área Produtiva (ha)</label>
            <input
              type="number"
              step="0.01"
              className="field-input"
              value={company.productiveAreaHa ?? ""}
              onChange={(e) => setCompany({ ...company, productiveAreaHa: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="field-label">Atividades Desenvolvidas (resumo)</label>
          <textarea
            className="field-input min-h-24"
            value={company.activitiesSummary ?? ""}
            onChange={(e) => setCompany({ ...company, activitiesSummary: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? "Salvando..." : "Salvar dados gerais"}
          </button>
          {savedAt && <span className="text-sm text-ink-faint">Salvo às {savedAt.toLocaleTimeString("pt-BR")}</span>}
        </div>
      </form>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-lg">2. Atividades da Propriedade</h2>
            <p className="text-sm text-ink-faint">
              Elas alimentam os menus de Financeiro, Planejamento e Decisão.
            </p>
          </div>
          <button onClick={addActivity} className="btn-secondary text-sm">
            + Adicionar atividade
          </button>
        </div>

        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <span className="w-6 text-sm text-ink-faint font-mono">{a.seqNumber}</span>
              <input
                className="field-input flex-1"
                value={a.name}
                onChange={(e) => updateActivity(a.id, { name: e.target.value })}
                placeholder="Nome da atividade"
              />
              <input
                className="field-input flex-1"
                value={a.description ?? ""}
                onChange={(e) => updateActivity(a.id, { description: e.target.value })}
                placeholder="Descrição"
              />
              <button onClick={() => removeActivity(a.id)} className="text-terra text-sm px-2 hover:underline">
                Remover
              </button>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-sm text-ink-faint">Nenhuma atividade cadastrada ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { formatBRL } from "@/lib/format";
import type { Activity, CostCategory, FinanceEntry } from "@/lib/types";

type Tab = "ENTRADA" | "SAIDA";

export default function FinanceiroPage() {
  const [tab, setTab] = useState<Tab>("ENTRADA");
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [costCategories, setCostCategories] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: "",
    category: "",
    activityId: "",
    value: "",
  });

  const year = new Date().getFullYear();

  async function loadEntries() {
    const data = await api.get<FinanceEntry[]>(`/finance/entries?type=${tab}&year=${year}`);
    setEntries(data);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<Activity[]>("/activities"),
      api.get<CostCategory[]>("/finance/cost-categories"),
    ]).then(([a, c]) => {
      setActivities(a);
      setCostCategories(c);
    });
  }, []);

  useEffect(() => {
    loadEntries().finally(() => setLoading(false));
    setForm((f) => ({ ...f, category: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/finance/entries", {
        type: tab,
        date: form.date,
        description: form.description,
        category: form.category,
        activityId: form.activityId || undefined,
        value: Number(form.value),
      });
      setForm({ date: new Date().toISOString().slice(0, 10), description: "", category: "", activityId: "", value: "" });
      await loadEntries();
      await api.put("/progress", { module: "FINANCEIRO", completionPct: 100 });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível salvar o lançamento.");
    }
  }

  async function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await api.delete(`/finance/entries/${id}`);
  }

  const total = entries.reduce((sum, e) => sum + Number(e.value), 0);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Controle Financeiro</h1>
          <p className="text-ink-soft mt-1">Módulo 3 — o coração do sistema. Lance suas entradas e saídas.</p>
        </div>
        <Link href="/diagnostico/custos" className="btn-secondary text-sm">
          Ver Custos →
        </Link>
      </div>

      <div className="inline-flex rounded-lg border border-border bg-white p-1">
        <button
          onClick={() => setTab("ENTRADA")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "ENTRADA" ? "bg-pasto text-white" : "text-ink-soft"
          }`}
        >
          Entradas (Receitas)
        </button>
        <button
          onClick={() => setTab("SAIDA")}
          className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            tab === "SAIDA" ? "bg-terra text-white" : "text-ink-soft"
          }`}
        >
          Saídas (Despesas)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card grid sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="field-label">Data</label>
          <input
            type="date"
            required
            className="field-input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Descrição</label>
          <input
            required
            className="field-input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={tab === "ENTRADA" ? "Venda de leite..." : "Compra de ração..."}
          />
        </div>
        <div>
          <label className="field-label">Categoria</label>
          {tab === "SAIDA" ? (
            <select
              required
              className="field-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Selecione</option>
              {costCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              required
              className="field-input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Venda de Produto"
            />
          )}
        </div>
        <div>
          <label className="field-label">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            required
            className="field-input"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Atividade</label>
          <select
            className="field-input"
            value={form.activityId}
            onChange={(e) => setForm({ ...form, activityId: e.target.value })}
          >
            <option value="">— não vincular —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3 flex items-center gap-3">
          <button type="submit" className="btn-primary">
            Lançar {tab === "ENTRADA" ? "entrada" : "saída"}
          </button>
          {error && <span className="text-sm text-terra">{error}</span>}
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-soft">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Descrição</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Atividade</th>
              <th className="px-4 py-3 font-medium text-right">Valor</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
                  Carregando...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink-faint">
                  Nenhum lançamento em {year} ainda.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono text-ink-soft">
                    {new Date(e.date).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">{e.description}</td>
                  <td className="px-4 py-3 text-ink-soft">{e.category}</td>
                  <td className="px-4 py-3 text-ink-soft">{e.activity?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(Number(e.value))}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeEntry(e.id)} className="text-terra text-xs hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {entries.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-palha-alt/50">
                <td colSpan={4} className="px-4 py-3 font-medium">
                  Total no ano
                </td>
                <td className="px-4 py-3 text-right font-mono font-medium">{formatBRL(total)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

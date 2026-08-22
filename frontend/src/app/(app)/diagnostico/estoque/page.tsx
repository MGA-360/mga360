"use client";

import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { StatusBadge } from "@/components/ui";

interface InventoryItem {
  id: string;
  product: string;
  category: string;
  unit: string;
  minStock: number;
  entryQty: number;
  exitQty: number;
  balance: number | null;
  status: "OK" | "REPOR_ESTOQUE" | null;
}

export default function EstoquePage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ product: "", category: "", unit: "", minStock: "", entryQty: "", exitQty: "" });

  async function load() {
    const data = await api.get<InventoryItem[]>("/inventory");
    setItems(data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/inventory", {
      product: form.product,
      category: form.category,
      unit: form.unit,
      minStock: Number(form.minStock || 0),
      entryQty: Number(form.entryQty || 0),
      exitQty: Number(form.exitQty || 0),
    });
    setForm({ product: "", category: "", unit: "", minStock: "", entryQty: "", exitQty: "" });
    await load();
    await api.put("/progress", { module: "ESTOQUE", completionPct: 100 });
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await api.delete(`/inventory/${id}`);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Estoque</h1>
        <p className="text-ink-soft mt-1">Módulo 5 — saldo e status calculados automaticamente.</p>
      </div>

      <form onSubmit={handleSubmit} className="card grid sm:grid-cols-6 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="field-label">Produto</label>
          <input required className="field-input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Categoria</label>
          <input required className="field-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Unidade</label>
          <input required className="field-input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="kg, sc, L..." />
        </div>
        <div>
          <label className="field-label">Estoque mín.</label>
          <input type="number" className="field-input" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Entrada</label>
          <input type="number" className="field-input" value={form.entryQty} onChange={(e) => setForm({ ...form, entryQty: e.target.value })} />
        </div>
        <div className="sm:col-span-6 flex items-end gap-3">
          <div className="flex-1">
            <label className="field-label">Saída</label>
            <input type="number" className="field-input" value={form.exitQty} onChange={(e) => setForm({ ...form, exitQty: e.target.value })} />
          </div>
          <button type="submit" className="btn-primary">
            Adicionar item
          </button>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-soft">
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium text-right">Saldo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Carregando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Nenhum item cadastrado.</td></tr>
            ) : (
              items.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{i.product}</td>
                  <td className="px-4 py-3 text-ink-soft">{i.category}</td>
                  <td className="px-4 py-3 text-right font-mono">
                    {i.balance !== null ? `${i.balance} ${i.unit}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {i.status === "OK" && <StatusBadge label="OK" tone="ok" />}
                    {i.status === "REPOR_ESTOQUE" && <StatusBadge label="Repor Estoque" tone="critico" />}
                    {i.status === null && <span className="text-ink-faint text-xs">Sem movimentação</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeItem(i.id)} className="text-terra text-xs hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

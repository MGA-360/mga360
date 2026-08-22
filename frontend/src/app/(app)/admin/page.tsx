"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

interface CompanyRow {
  id: string;
  name: string;
  ownerName: string;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  _count: { users: number; financeEntries: number };
}

export default function AdminPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load(q?: string) {
    const data = await api.get<CompanyRow[]>(`/companies${q ? `?search=${encodeURIComponent(q)}` : ""}`);
    setCompanies(data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Painel Administrativo</h1>
          <p className="text-ink-soft mt-1">Clientes cadastrados no MGA 360.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
          {showForm ? "Cancelar" : "+ Novo cliente"}
        </button>
      </div>

      {showForm && (
        <NewClientForm
          onCreated={() => {
            setShowForm(false);
            load(search);
          }}
        />
      )}

      <input
        className="field-input max-w-sm"
        placeholder="Buscar por propriedade ou proprietário..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          load(e.target.value);
        }}
      />

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-soft">
              <th className="px-4 py-3 font-medium">Propriedade</th>
              <th className="px-4 py-3 font-medium">Proprietário</th>
              <th className="px-4 py-3 font-medium">Local</th>
              <th className="px-4 py-3 font-medium text-right">Lançamentos</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Carregando...</td></tr>
            ) : companies.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Nenhum cliente encontrado.</td></tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{c.ownerName}</td>
                  <td className="px-4 py-3 text-ink-soft">{[c.city, c.state].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono">{c._count.financeEntries}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/resultados/dashboard?companyId=${c.id}`} className="text-pasto text-xs hover:underline">
                      Ver dashboard →
                    </Link>
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

function NewClientForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({
    companyName: "",
    ownerName: "",
    userName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/companies", {
        company: { name: form.companyName, ownerName: form.ownerName },
        user: { name: form.userName, email: form.email, password: form.password },
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o cliente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card grid sm:grid-cols-2 gap-4">
      <div>
        <label className="field-label">Nome da propriedade</label>
        <input required className="field-input" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
      </div>
      <div>
        <label className="field-label">Proprietário</label>
        <input required className="field-input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
      </div>
      <div>
        <label className="field-label">Nome do usuário de acesso</label>
        <input required className="field-input" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })} />
      </div>
      <div>
        <label className="field-label">E-mail de acesso</label>
        <input required type="email" className="field-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="field-label">Senha inicial</label>
        <input required type="password" minLength={8} className="field-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Criando..." : "Criar cliente"}
        </button>
        {error && <span className="text-sm text-terra">{error}</span>}
      </div>
    </form>
  );
}

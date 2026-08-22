"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Company } from "@/lib/types";

interface ActivityDraft {
  seqNumber: number;
  name: string;
}

export default function OnboardingPage() {
  const { user, loading, selectCompany, logout } = useAuth();
  const router = useRouter();

  const [company, setCompany] = useState({ name: "", ownerName: "", city: "", state: "" });
  const [activities, setActivities] = useState<ActivityDraft[]>([{ seqNumber: 1, name: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && !company.ownerName) {
      setCompany((c) => ({ ...c, ownerName: user.name }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function addActivityRow() {
    setActivities((prev) => [...prev, { seqNumber: prev.length + 1, name: "" }]);
  }

  function updateActivityName(index: number, name: string) {
    setActivities((prev) => prev.map((a, i) => (i === index ? { ...a, name } : a)));
  }

  function removeActivityRow(index: number) {
    setActivities((prev) => prev.filter((_, i) => i !== index).map((a, i) => ({ ...a, seqNumber: i + 1 })));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.post<Company>("/companies/mine", company);

      // Troca o token pra essa propriedade recém-criada antes de cadastrar
      // as atividades (elas precisam de um companyId ativo pra serem salvas).
      await selectCompany(created.id);

      const validActivities = activities.filter((a) => a.name.trim().length > 0);
      for (const a of validActivities) {
        await api.post("/activities", { seqNumber: a.seqNumber, name: a.name });
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível concluir o cadastro. Tente novamente.");
      setSubmitting(false);
    }
  }

  if (loading || !user) return null;

  return (
    <main className="min-h-screen bg-palha flex items-center justify-center p-8">
      <div className="w-full max-w-xl">
        <div className="growth-line w-14 mb-4" />
        <h1 className="text-2xl font-semibold">Bem-vindo(a) ao MGA 360, {user.name.split(" ")[0]}.</h1>
        <p className="text-ink-soft mt-1 mb-8">
          Vamos cadastrar sua propriedade e as atividades que você desenvolve — leva menos de dois minutos.
        </p>

        <form onSubmit={handleSubmit} className="card space-y-6">
          <div>
            <h2 className="font-medium text-lg mb-4">1. Sua propriedade</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="field-label">Nome da propriedade</label>
                <input
                  required
                  className="field-input"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  placeholder="Fazenda Boa Vista"
                />
              </div>
              <div>
                <label className="field-label">Proprietário / Gestor</label>
                <input
                  required
                  className="field-input"
                  value={company.ownerName}
                  onChange={(e) => setCompany({ ...company, ownerName: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Cidade</label>
                <input
                  className="field-input"
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">UF</label>
                <select
                  className="field-input"
                  value={company.state}
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
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-lg">2. Atividades da propriedade</h2>
              <button type="button" onClick={addActivityRow} className="btn-secondary text-sm">
                + Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {activities.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 text-sm text-ink-faint font-mono">{a.seqNumber}</span>
                  <input
                    className="field-input flex-1"
                    value={a.name}
                    onChange={(e) => updateActivityName(i, e.target.value)}
                    placeholder="Ex: Bovinocultura de Leite"
                  />
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivityRow(i)}
                      className="text-terra text-sm px-2 hover:underline"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-faint mt-2">
              Pode deixar em branco e cadastrar depois, se preferir — mas recomendamos preencher pelo menos uma.
            </p>
          </div>

          {error && (
            <p role="alert" className="text-sm text-terra bg-terra/10 border border-terra/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Concluindo..." : "Começar a usar o MGA 360"}
            </button>
            <button type="button" onClick={logout} className="text-sm text-ink-soft hover:text-ink">
              Sair
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

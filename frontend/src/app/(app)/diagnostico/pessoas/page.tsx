"use client";

import { useEffect, useState, FormEvent } from "react";
import { api } from "@/lib/api";
import { formatBRL } from "@/lib/format";

interface Employee {
  id: string;
  name: string;
  role: string;
  baseSalary: number;
  chargesPct: number;
  totalCost: number;
}

export default function PessoasPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalMonthly, setTotalMonthly] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", role: "", baseSalary: "", chargesPct: "0.3" });

  async function load() {
    const data = await api.get<{ employees: Employee[]; totalMonthly: number }>("/employees");
    setEmployees(data.employees);
    setTotalMonthly(data.totalMonthly);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await api.post("/employees", {
      name: form.name,
      role: form.role,
      baseSalary: Number(form.baseSalary),
      chargesPct: Number(form.chargesPct),
    });
    setForm({ name: "", role: "", baseSalary: "", chargesPct: "0.3" });
    await load();
    await api.put("/progress", { module: "PESSOAS", completionPct: 100 });
  }

  async function removeEmployee(id: string) {
    setEmployees((prev) => prev.filter((e) => e.id !== id));
    await load();
    await api.delete(`/employees/${id}`);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pessoas</h1>
        <p className="text-ink-soft mt-1">Módulo 6 — custo total por funcionário calculado com encargos.</p>
      </div>

      <form onSubmit={handleSubmit} className="card grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="field-label">Nome</label>
          <input required className="field-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Função</label>
          <input required className="field-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Salário Base (R$)</label>
          <input type="number" step="0.01" required className="field-input" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Encargos (%)</label>
          <input type="number" step="0.01" className="field-input" value={form.chargesPct} onChange={(e) => setForm({ ...form, chargesPct: e.target.value })} />
        </div>
        <div className="sm:col-span-4">
          <button type="submit" className="btn-primary">
            Adicionar funcionário
          </button>
        </div>
      </form>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-ink-soft">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Função</th>
              <th className="px-4 py-3 font-medium text-right">Salário base</th>
              <th className="px-4 py-3 font-medium text-right">Custo total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Carregando...</td></tr>
            ) : employees.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-ink-faint">Nenhum funcionário cadastrado.</td></tr>
            ) : (
              employees.map((emp) => (
                <tr key={emp.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3 text-ink-soft">{emp.role}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatBRL(Number(emp.baseSalary))}</td>
                  <td className="px-4 py-3 text-right font-mono font-medium">{formatBRL(emp.totalCost)}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => removeEmployee(emp.id)} className="text-terra text-xs hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {employees.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-palha-alt/50">
                <td colSpan={3} className="px-4 py-3 font-medium">Total mensal</td>
                <td className="px-4 py-3 text-right font-mono font-medium">{formatBRL(totalMonthly)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

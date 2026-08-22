"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signup(form);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar sua conta. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-mata text-palha p-12 relative overflow-hidden">
        <span className="font-display text-2xl tracking-tight relative z-10">MGA 360</span>
        <div className="relative z-10 max-w-md">
          <div className="growth-line w-16 mb-8" />
          <h1 className="font-display text-4xl leading-[1.15] mb-4">
            Sua propriedade,
            <br />
            <em className="italic text-milho-light">sua gestão.</em>
          </h1>
          <p className="text-palha/70 leading-relaxed">
            Crie sua conta e comece o diagnóstico da sua propriedade em poucos minutos.
          </p>
        </div>
        <p className="relative z-10 text-sm text-palha/50">© {new Date().getFullYear()} MGA 360</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <span className="font-display text-2xl text-mata">MGA 360</span>
          </div>

          <h2 className="text-2xl font-semibold mb-1">Criar conta</h2>
          <p className="text-ink-soft mb-8">Leva menos de um minuto.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="name">
                Nome completo
              </label>
              <input
                id="name"
                required
                className="field-input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                className="field-input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="phone">
                Telefone (opcional)
              </label>
              <input
                id="phone"
                type="tel"
                className="field-input"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                minLength={8}
                className="field-input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <div>
              <label className="field-label" htmlFor="confirmPassword">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="field-input"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-terra bg-terra/10 border border-terra/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? "Criando conta..." : "Criar conta"}
            </button>

            <p className="text-center text-sm text-ink-soft">
              Já tem conta?{" "}
              <Link href="/login" className="text-pasto hover:underline">
                Entrar
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

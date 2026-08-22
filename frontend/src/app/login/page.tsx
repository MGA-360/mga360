"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Coluna de identidade — some em telas pequenas */}
      <div className="hidden lg:flex flex-col justify-between bg-mata text-palha p-12 relative overflow-hidden">
        <div className="relative z-10">
          <span className="font-display text-2xl tracking-tight">MGA 360</span>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="growth-line w-16 mb-8" />
          <h1 className="font-display text-4xl leading-[1.15] mb-4">
            De produtor rural
            <br />
            para <em className="italic text-milho-light">empresário rural.</em>
          </h1>
          <p className="text-palha/70 leading-relaxed">
            O diferencial não é a planilha — é a metodologia de gestão por trás dela. O MGA 360 transforma dados da
            propriedade em decisões claras, mês após mês.
          </p>
        </div>

        <p className="relative z-10 text-sm text-palha/50">© {new Date().getFullYear()} MGA 360</p>

        {/* Textura sutil de fundo, discreta */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(115deg, transparent, transparent 38px, #FAF8F0 38px, #FAF8F0 39px)",
          }}
        />
      </div>

      {/* Coluna do formulário */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <span className="font-display text-2xl text-mata">MGA 360</span>
          </div>

          <h2 className="text-2xl font-semibold mb-1">Entrar</h2>
          <p className="text-ink-soft mb-8">Acesse o diagnóstico da sua propriedade.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@propriedade.com.br"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="field-label mb-0" htmlFor="password">
                  Senha
                </label>
                <Link href="/esqueci-senha" className="text-sm text-pasto hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                className="field-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-terra bg-terra/10 border border-terra/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full mt-2">
              {submitting ? "Entrando..." : "Entrar"}
            </button>

            <p className="text-center text-sm text-ink-soft">
              Ainda não tem conta?{" "}
              <Link href="/signup" className="text-pasto hover:underline">
                Criar conta
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}

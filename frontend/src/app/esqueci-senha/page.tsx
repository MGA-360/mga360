"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/auth/forgot-password", { email });
    } finally {
      setSubmitting(false);
      setSent(true); // resposta é sempre genérica, por segurança
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <span className="font-display text-2xl text-mata block mb-8">MGA 360</span>

        {sent ? (
          <div className="card">
            <h2 className="text-xl font-semibold mb-2">Verifique seu e-mail</h2>
            <p className="text-ink-soft">
              Se <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha em
              instantes.
            </p>
            <Link href="/login" className="btn-secondary w-full mt-6">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-semibold mb-1">Recuperar senha</h2>
            <p className="text-ink-soft mb-8">Informe seu e-mail para receber o link de redefinição.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="field-label" htmlFor="email">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="field-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? "Enviando..." : "Enviar link"}
              </button>
              <Link href="/login" className="block text-center text-sm text-ink-soft hover:text-ink">
                Voltar para o login
              </Link>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

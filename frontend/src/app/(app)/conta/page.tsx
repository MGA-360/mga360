"use client";

import { useAuth } from "@/lib/auth-context";

export default function ContaPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Minha Conta</h1>
      <div className="card space-y-4">
        <div>
          <label className="field-label">Nome</label>
          <input className="field-input" defaultValue={user?.name} disabled />
        </div>
        <div>
          <label className="field-label">E-mail</label>
          <input className="field-input" defaultValue={user?.email} disabled />
        </div>
        <div>
          <label className="field-label">Perfil</label>
          <input className="field-input" defaultValue={user?.role === "ADMIN" ? "Administrador" : "Cliente"} disabled />
        </div>
        <p className="text-xs text-ink-faint">
          Edição de perfil e troca de senha autenticada — plugar em <code>PATCH /users/me</code> quando essa rota
          for adicionada ao backend.
        </p>
      </div>
    </div>
  );
}

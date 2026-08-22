"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

interface NavItem {
  label: string;
  href?: string;
  icon: string;
  children?: { label: string; href: string }[];
}

const NAV: NavItem[] = [
  { label: "Início", href: "/dashboard", icon: "🏠" },
  { label: "Empresa", icon: "🏢", children: [{ label: "Cadastro", href: "/cadastro" }] },
  {
    label: "Diagnóstico",
    icon: "📋",
    children: [
      { label: "Planejamento", href: "/diagnostico/planejamento" },
      { label: "Financeiro", href: "/diagnostico/financeiro" },
      { label: "Custos", href: "/diagnostico/custos" },
      { label: "Estoque", href: "/diagnostico/estoque" },
      { label: "Pessoas", href: "/diagnostico/pessoas" },
    ],
  },
  {
    label: "Resultados",
    icon: "📊",
    children: [
      { label: "Radar MGA 360", href: "/resultados/radar" },
      { label: "Dashboard", href: "/resultados/dashboard" },
      { label: "Decisão", href: "/resultados/decisao" },
    ],
  },
  { label: "Relatórios", href: "/relatorios", icon: "📄" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-mata text-palha flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6">
        <span className="font-display text-xl">MGA 360</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-1">
        {NAV.map((item) =>
          item.children ? (
            <div key={item.label} className="mb-3">
              <p className="px-3 text-xs uppercase tracking-wide text-palha/40 mb-1 flex items-center gap-2">
                <span>{item.icon}</span> {item.label}
              </p>
              {item.children.map((child) => {
                const active = pathname === child.href;
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block rounded-lg px-3 py-2 ml-6 text-sm transition-colors ${
                      active ? "bg-pasto text-white" : "text-palha/70 hover:bg-mata-line hover:text-palha"
                    }`}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname === item.href ? "bg-pasto text-white" : "text-palha/80 hover:bg-mata-line hover:text-palha"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          )
        )}
      </nav>

      <div className="border-t border-palha/10 p-3 space-y-1">
        {user?.role === "CLIENT" && (
          <Link
            href="/selecionar-propriedade"
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              pathname === "/selecionar-propriedade" ? "bg-pasto text-white" : "text-palha/80 hover:bg-mata-line hover:text-palha"
            }`}
          >
            🌾 Minhas Propriedades
          </Link>
        )}
        <Link
          href="/conta"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            pathname === "/conta" ? "bg-pasto text-white" : "text-palha/80 hover:bg-mata-line hover:text-palha"
          }`}
        >
          👤 Minha Conta
        </Link>
        <Link
          href="/configuracoes"
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            pathname === "/configuracoes" ? "bg-pasto text-white" : "text-palha/80 hover:bg-mata-line hover:text-palha"
          }`}
        >
          ⚙ Configurações
        </Link>
        <div className="px-3 pt-2 flex items-center justify-between">
          <span className="text-xs text-palha/50 truncate">{user?.name}</span>
          <button onClick={logout} className="text-xs text-milho-light hover:underline shrink-0 ml-2">
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}

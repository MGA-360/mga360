import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Identidade visual MGA 360
// Paleta inspirada em pastagem/terra/milho — deliberadamente NÃO usa o
// combo bege+terracota (#F4F1EA / #D97757) nem o dark+neon genéricos de IA.
// "Mata" (verde-escuro quase preto) ancora o menu lateral; "Palha" (creme
// esverdeado) é o fundo de conteúdo; "Pasto" é o verde de ação; "Milho"
// (mostarda) é o destaque quente, usado com parcimônia.
// ---------------------------------------------------------------------------

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mata: { DEFAULT: "#16241C", soft: "#233A2B", line: "#2E4A36" },
        palha: { DEFAULT: "#FAF8F0", alt: "#F1ECDC" },
        pasto: { DEFAULT: "#35603F", dark: "#23402A", light: "#4F7D5B" },
        milho: { DEFAULT: "#C08A2E", light: "#E0B563" },
        terra: { DEFAULT: "#A6432A" },
        ink: { DEFAULT: "#1B2A20", soft: "#5B6B5E", faint: "#8B9A8D" },
        border: "#E2DDC9",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(27, 42, 32, 0.06), 0 1px 0 rgba(27, 42, 32, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;

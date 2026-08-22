export function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="w-full h-2 bg-palha-alt rounded-full overflow-hidden">
      <div
        className="h-full bg-pasto rounded-full transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  ok: { bg: "bg-pasto/10", text: "text-pasto-dark" },
  atencao: { bg: "bg-milho/15", text: "text-milho" },
  critico: { bg: "bg-terra/10", text: "text-terra" },
};

export function StatusBadge({ label, tone }: { label: string; tone: "ok" | "atencao" | "critico" }) {
  const style = STATUS_STYLES[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}>
      {label}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-ink-soft mb-1">{label}</p>
      <p className="font-mono text-2xl font-medium text-mata">{value}</p>
      {hint && <p className="text-xs text-ink-faint mt-1">{hint}</p>}
    </div>
  );
}

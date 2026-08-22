"use client";

/** Velocímetro semicircular 0–150% do Ponto de Equilíbrio. */
export function BreakEvenGauge({ pointerPct }: { pointerPct: number }) {
  const size = 220;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = 90;

  const clamped = Math.min(Math.max(pointerPct, 0), 100);
  const angle = Math.PI - (clamped / 100) * Math.PI; // 180deg (esquerda) a 0deg (direita)
  const needleX = cx + Math.cos(angle) * (r - 14);
  const needleY = cy - Math.sin(angle) * (r - 14);

  const arc = (startFrac: number, endFrac: number, color: string) => {
    const a1 = Math.PI - startFrac * Math.PI;
    const a2 = Math.PI - endFrac * Math.PI;
    const p1 = { x: cx + Math.cos(a1) * r, y: cy - Math.sin(a1) * r };
    const p2 = { x: cx + Math.cos(a2) * r, y: cy - Math.sin(a2) * r };
    return (
      <path
        d={`M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`}
        stroke={color}
        strokeWidth={16}
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  return (
    <svg viewBox={`0 0 ${size} ${size / 2 + 30}`} width="100%" height="auto" role="img" aria-label="Ponto de equilíbrio">
      {arc(0, 0.44, "#A6432A")}
      {arc(0.44, 0.62, "#C08A2E")}
      {arc(0.62, 1, "#35603F")}
      <line
        x1={cx}
        y1={cy}
        x2={needleX}
        y2={needleY}
        stroke="#16241C"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={6} fill="#16241C" />
    </svg>
  );
}

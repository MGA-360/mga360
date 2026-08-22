"use client";

interface RadarAxis {
  label: string;
  value: number; // 0-100
}

/**
 * Radar customizado (não usa recharts) para dar acabamento visual próprio —
 * é a peça de destaque do sistema, então vale ter controle total do desenho.
 */
export function RadarChart({ axes, size = 340 }: { axes: RadarAxis[]; size?: number }) {
  const center = size / 2;
  const radius = size / 2 - 56;
  const angleStep = (Math.PI * 2) / axes.length;
  const rings = [0.25, 0.5, 0.75, 1];

  function pointAt(index: number, fraction: number) {
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * radius * fraction,
      y: center + Math.sin(angle) * radius * fraction,
    };
  }

  const dataPoints = axes.map((a, i) => pointAt(i, a.value / 100));
  const dataPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="auto" role="img" aria-label="Radar MGA 360">
      {/* Anéis de referência */}
      {rings.map((r) => {
        const pts = axes.map((_, i) => pointAt(i, r));
        return (
          <polygon
            key={r}
            points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke="#E2DDC9"
            strokeWidth={1}
          />
        );
      })}

      {/* Eixos */}
      {axes.map((_, i) => {
        const p = pointAt(i, 1);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#E2DDC9" strokeWidth={1} />;
      })}

      {/* Área de dados */}
      <polygon points={dataPath} fill="#35603F" fillOpacity={0.18} stroke="#35603F" strokeWidth={2} />
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#35603F" />
      ))}

      {/* Rótulos */}
      {axes.map((a, i) => {
        const labelPoint = pointAt(i, 1.22);
        const anchor = Math.abs(labelPoint.x - center) < 8 ? "middle" : labelPoint.x > center ? "start" : "end";
        return (
          <text
            key={a.label}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={12}
            fill="#5B6B5E"
            fontFamily="var(--font-sans)"
          >
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

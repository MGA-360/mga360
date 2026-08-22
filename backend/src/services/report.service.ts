import puppeteer from "puppeteer";
import fs from "fs/promises";
import path from "path";

/**
 * Geração do PDF do relatório MGA 360.
 *
 * Estratégia: montar um template HTML com a identidade visual do produto
 * (mesmas cores/tipografia do frontend) e renderizar para PDF com Puppeteer.
 * Isso evita depender de uma lib de PDF de baixo nível para algo que é,
 * essencialmente, um documento visual — e o time consegue editar o layout
 * mexendo em HTML/CSS puro.
 *
 * Armazenamento: grava em disco local (`storage/reports/`) e serve via
 * `express.static` (ver app.ts, rota `/files`). Em produção, troque o
 * `fs.writeFile` abaixo por upload a S3/R2/GCS e retorne a URL do bucket.
 */

const STORAGE_DIR = path.join(__dirname, "..", "..", "storage", "reports");

function formatBRL(value: number): string {
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(value: number, digits = 1): string {
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

/** Gera um SVG de radar simples e autocontido (sem dependências) para o PDF. */
function renderRadarSvg(axes: { label: string; value: number }[]): string {
  const size = 320;
  const center = size / 2;
  const radius = size / 2 - 60;
  const angleStep = (Math.PI * 2) / axes.length;

  const pointAt = (index: number, fraction: number) => {
    const angle = angleStep * index - Math.PI / 2;
    return { x: center + Math.cos(angle) * radius * fraction, y: center + Math.sin(angle) * radius * fraction };
  };

  const rings = [0.25, 0.5, 0.75, 1]
    .map((r) => {
      const pts = axes.map((_, i) => pointAt(i, r));
      return `<polygon points="${pts.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="#E2DDC9" stroke-width="1"/>`;
    })
    .join("");

  const axesLines = axes
    .map((_, i) => {
      const p = pointAt(i, 1);
      return `<line x1="${center}" y1="${center}" x2="${p.x}" y2="${p.y}" stroke="#E2DDC9" stroke-width="1"/>`;
    })
    .join("");

  const dataPoints = axes.map((a, i) => pointAt(i, a.value / 100));
  const dataPolygon = `<polygon points="${dataPoints.map((p) => `${p.x},${p.y}`).join(" ")}" fill="#35603F" fill-opacity="0.18" stroke="#35603F" stroke-width="2"/>`;

  const labels = axes
    .map((a, i) => {
      const p = pointAt(i, 1.25);
      const anchor = Math.abs(p.x - center) < 8 ? "middle" : p.x > center ? "start" : "end";
      return `<text x="${p.x}" y="${p.y}" text-anchor="${anchor}" font-size="12" fill="#5B6B5E" font-family="Helvetica, Arial, sans-serif">${a.label}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="320" height="320">${rings}${axesLines}${dataPolygon}${labels}</svg>`;
}

function renderHtml(snapshot: any): string {
  const { company, dashboard, radar, decision, generatedAt } = snapshot;

  const radarSvg = renderRadarSvg([
    { label: "Margem", value: radar.scoreMargin },
    { label: "Ponto de Equilíbrio", value: radar.scoreBreakEven },
    { label: "Metas Produtivas", value: radar.scoreGoals },
    { label: "Estoque", value: radar.scoreInventory },
  ]);

  const costRows = dashboard.costsByCategory
    .filter((c: any) => c.totalYear > 0)
    .map((c: any) => `<tr><td>${c.category}</td><td class="right">${formatBRL(c.totalYear)}</td></tr>`)
    .join("");

  const actionPlanItems = decision.actionPlan.map((step: string) => `<li>${step}</li>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 36px 40px; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #1B2A20; margin: 0; }
  h1, h2 { font-family: Georgia, 'Times New Roman', serif; color: #16241C; margin: 0 0 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #35603F; padding-bottom: 12px; margin-bottom: 24px; }
  .brand { font-size: 20px; font-weight: 700; color: #16241C; }
  .muted { color: #5B6B5E; font-size: 12px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .kpis { display: flex; gap: 12px; }
  .kpi { flex: 1; border: 1px solid #E2DDC9; border-radius: 10px; padding: 12px 14px; }
  .kpi .label { font-size: 11px; color: #5B6B5E; margin-bottom: 4px; }
  .kpi .value { font-size: 18px; font-weight: 700; font-family: 'Courier New', monospace; }
  .radar-row { display: flex; align-items: center; gap: 24px; }
  .radar-score { font-size: 40px; font-weight: 700; font-family: 'Courier New', monospace; color: #16241C; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E2DDC9; }
  td.right, th.right { text-align: right; font-family: 'Courier New', monospace; }
  .callout { border-left: 4px solid #35603F; background: #FAF8F0; padding: 10px 14px; border-radius: 6px; margin-bottom: 10px; }
  .callout.critico { border-left-color: #A6432A; }
  ol { font-size: 12px; padding-left: 18px; }
  .footer { margin-top: 32px; font-size: 10px; color: #8B9A8D; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">MGA 360</div>
      <div class="muted">Relatório de Diagnóstico — ${radar.year}</div>
    </div>
    <div style="text-align:right">
      <div style="font-weight:600">${company?.name ?? "—"}</div>
      <div class="muted">${company?.ownerName ?? ""}</div>
      <div class="muted">Gerado em ${new Date(generatedAt).toLocaleString("pt-BR")}</div>
    </div>
  </div>

  <div class="section">
    <h2>Radar MGA 360</h2>
    <div class="radar-row">
      ${radarSvg}
      <div>
        <div class="radar-score">${radar.radarIndex.toFixed(0)}</div>
        <div>${radar.statusLabel}</div>
        <div class="muted">${radar.trendLabel}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Indicadores Gerais</h2>
    <div class="kpis">
      <div class="kpi"><div class="label">RECEITA ANUAL</div><div class="value">${formatBRL(dashboard.annualRevenue)}</div></div>
      <div class="kpi"><div class="label">CUSTO ANUAL</div><div class="value">${formatBRL(dashboard.annualCost)}</div></div>
      <div class="kpi"><div class="label">LUCRO ANUAL</div><div class="value">${formatBRL(dashboard.annualProfit)}</div></div>
      <div class="kpi"><div class="label">MARGEM</div><div class="value">${formatPct(dashboard.annualMargin)}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Ponto de Equilíbrio</h2>
    <p class="muted">${dashboard.breakEven.statusMessage}</p>
    <table>
      <tr><td>Custo Fixo</td><td class="right">${formatBRL(dashboard.breakEven.fixedCostTotal)}</td></tr>
      <tr><td>Custo Variável</td><td class="right">${formatBRL(dashboard.breakEven.variableCostTotal)}</td></tr>
      <tr><td>Ponto de Equilíbrio (R$)</td><td class="right">${formatBRL(dashboard.breakEven.breakEvenValue)}</td></tr>
      <tr><td>Receita Realizada</td><td class="right">${formatBRL(dashboard.breakEven.realizedRevenue)}</td></tr>
    </table>
  </div>

  ${costRows ? `<div class="section"><h2>Custos por Categoria</h2><table>${costRows}</table></div>` : ""}

  <div class="section">
    <h2>Decisão</h2>
    <div class="callout ${decision.isProfitable ? "" : "critico"}">${decision.profitabilityMessage}</div>
    <div class="callout">${decision.mostProfitableActivityMessage}</div>
    <div class="callout">${decision.biggestCostCategoryMessage}</div>
    <div class="callout">${decision.improvementPriorityMessage}</div>
  </div>

  <div class="section">
    <h2>Plano de Ação</h2>
    <ol>${actionPlanItems}</ol>
  </div>

  <div class="footer">MGA 360 — Método de Gestão Agro 360 · Relatório gerado automaticamente</div>
</body>
</html>`;
}

export async function generateReportPdf(reportId: string, snapshotJson: unknown): Promise<string> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });

  const html = renderHtml(snapshotJson);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // Em Docker usamos o Chromium do sistema (ver Dockerfile) em vez do
    // baixado pelo Puppeteer, para não depender de rede externa no build.
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const filePath = path.join(STORAGE_DIR, `${reportId}.pdf`);
    await page.pdf({ path: filePath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  // Servido por express.static em /files (ver app.ts)
  return `/files/reports/${reportId}.pdf`;
}

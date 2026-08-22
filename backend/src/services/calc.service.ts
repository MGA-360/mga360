import { prisma } from "../lib/prisma";
import { CostType, FinanceEntryType } from "@prisma/client";

/**
 * MOTOR DE CÁLCULO — MGA 360
 * ---------------------------------------------------------------------------
 * Este arquivo é o equivalente às fórmulas de Custos, Dashboard, Radar MGA 360
 * e Decisão da planilha original. Nada aqui é armazenado em tabela — tudo é
 * recalculado a partir de finance_entries, planning_goals e inventory_items.
 *
 * Ordem de dependência (igual à planilha):
 *   FinanceEntries → CostsSummary → DashboardSummary → RadarScore / Decision
 *
 * ⚠️ NOTA DE FIDELIDADE: a aba "Decisão" da planilha original usa
 * Dashboard!A5 (= Receita Anual) tanto para checar "estou tendo lucro?"
 * quanto para checar a prioridade de melhoria — mas A5 é RECEITA, não LUCRO
 * (que seria Dashboard!C5 / Financeiro!D63). Isso parece ser um bug da
 * planilha original (receita bruta quase sempre é > 0, então a mensagem de
 * "prejuízo" praticamente nunca apareceria). Aqui deixamos os dois modos
 * disponíveis: `decisionInsights.isProfitable` usa o LUCRO (comportamento
 * correto/pretendido) e `decisionInsights.raw.usedOriginalSpreadsheetLogic`
 * documenta a diferença. Ajuste `USE_LITERAL_SPREADSHEET_BUG` para `true`
 * se quiser reproduzir o comportamento exato da planilha (não recomendado).
 */
const USE_LITERAL_SPREADSHEET_BUG = false;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function toNumber(d: unknown): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : Number(d);
}

function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}

/** Soma lançamentos financeiros por mês (1-12), opcionalmente filtrando por categoria e/ou atividade. */
async function sumFinanceByMonth(
  companyId: string,
  year: number,
  type: FinanceEntryType,
  category?: string,
  activityId?: string
) {
  const entries = await prisma.financeEntry.findMany({
    where: {
      companyId,
      type,
      date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
      ...(category ? { category } : {}),
      ...(activityId ? { activityId } : {}),
    },
    select: { date: true, value: true },
  });

  const byMonth = Array.from({ length: 12 }, () => 0);
  for (const e of entries) {
    const m = new Date(e.date).getUTCMonth(); // 0-11
    byMonth[m] += toNumber(e.value);
  }
  return byMonth; // índice 0 = Janeiro
}

// ----------------------------------------------------------------------------
// Módulo Custos — 100% derivado de FinanceEntries (type=SAIDA)
// ----------------------------------------------------------------------------

export interface CostCategorySummary {
  category: string;
  costType: CostType;
  byMonth: number[]; // 12 valores, Jan..Dez
  totalYear: number;
  pctOfTotal: number; // 0-1
}

export interface CostsSummary {
  year: number;
  categories: CostCategorySummary[];
  totalByMonth: number[];
  totalYear: number;
}

/** @param activityId Se informado, considera só os lançamentos daquela atividade (visão "por atividade" do Dashboard). */
export async function computeCostsSummary(companyId: string, year: number, activityId?: string): Promise<CostsSummary> {
  const categories = await prisma.costCategory.findMany({ orderBy: { name: "asc" } });

  const perCategory = await Promise.all(
    categories.map(async (cat) => {
      const byMonth = await sumFinanceByMonth(companyId, year, FinanceEntryType.SAIDA, cat.name, activityId);
      const totalYear = byMonth.reduce((a, b) => a + b, 0);
      return { category: cat.name, costType: cat.costType, byMonth, totalYear };
    })
  );

  const grandTotal = perCategory.reduce((a, c) => a + c.totalYear, 0);

  const categoriesWithPct: CostCategorySummary[] = perCategory.map((c) => ({
    ...c,
    pctOfTotal: grandTotal > 0 ? c.totalYear / grandTotal : 0,
  }));

  const totalByMonth = Array.from({ length: 12 }, (_, m) =>
    perCategory.reduce((sum, c) => sum + c.byMonth[m], 0)
  );

  return { year, categories: categoriesWithPct, totalByMonth, totalYear: grandTotal };
}

// ----------------------------------------------------------------------------
// Módulo Dashboard — KPIs anuais + Ponto de Equilíbrio
// ----------------------------------------------------------------------------

export interface DashboardSummary {
  year: number;
  activityId: string | null; // null = visão Geral (todas as atividades)
  activityName: string | null;
  annualRevenue: number; // Financeiro!B63
  annualCost: number; // Financeiro!C63
  annualProfit: number; // Financeiro!D63
  annualMargin: number; // Financeiro!E63 (0-1)
  monthlyResults: { month: string; revenue: number; cost: number; result: number; margin: number }[];
  productivity: { activityName: string; unit: string; annualGoal: number; achieved: number; pctAchieved: number }[];
  costsByCategory: { category: string; totalYear: number }[];
  breakEven: {
    fixedCostTotal: number; // B28
    variableCostTotal: number; // D28
    contributionMarginPct: number; // B29 (0-1)
    breakEvenValue: number; // D29 (R$)
    realizedRevenue: number; // B30
    pctOfBreakEvenReached: number; // D30
    status: "abaixo" | "seguranca" | "lucro_consolidado";
    statusMessage: string;
    gaugePointerPct: number; // 0-100, escala até 150% do PE
  };
}

/**
 * @param activityId Se informado, filtra TODOS os indicadores (receita,
 * custo, produtividade, ponto de equilíbrio) para considerar só os
 * lançamentos vinculados a essa atividade — visão "por atividade" do
 * Dashboard. Se omitido, calcula a visão "Geral" (todas as atividades da
 * propriedade), como sempre funcionou.
 */
export async function computeDashboardSummary(
  companyId: string,
  year: number,
  activityId?: string
): Promise<DashboardSummary> {
  const entradasByMonth = await sumFinanceByMonth(companyId, year, FinanceEntryType.ENTRADA, undefined, activityId);
  const saidasByMonth = await sumFinanceByMonth(companyId, year, FinanceEntryType.SAIDA, undefined, activityId);

  const monthlyResults = MONTHS.map((month, i) => {
    const revenue = entradasByMonth[i];
    const cost = saidasByMonth[i];
    const result = revenue - cost;
    const margin = revenue > 0 ? result / revenue : 0;
    return { month, revenue, cost, result, margin };
  });

  const annualRevenue = entradasByMonth.reduce((a, b) => a + b, 0);
  const annualCost = saidasByMonth.reduce((a, b) => a + b, 0);
  const annualProfit = annualRevenue - annualCost;
  const annualMargin = annualRevenue > 0 ? annualProfit / annualRevenue : 0;

  let activityName: string | null = null;
  if (activityId) {
    const activity = await prisma.activity.findUnique({ where: { id: activityId }, select: { name: true } });
    activityName = activity?.name ?? null;
  }

  // Produtividade: metas x realizado (Planejamento) — filtrado pela mesma atividade, se houver.
  const goals = await prisma.planningGoal.findMany({
    where: { companyId, year, ...(activityId ? { activityId } : {}) },
    include: { activity: true },
  });
  const productivity = goals.map((g) => {
    const annualGoal = toNumber(g.annualGoal);
    const achieved = toNumber(g.achievedValue);
    return {
      activityName: g.activity.name,
      unit: g.unit,
      annualGoal,
      achieved,
      pctAchieved: annualGoal > 0 ? achieved / annualGoal : 0,
    };
  });

  const costs = await computeCostsSummary(companyId, year, activityId);
  const costsByCategory = costs.categories.map((c) => ({ category: c.category, totalYear: c.totalYear }));

  // Ponto de Equilíbrio
  const fixedCostTotal = costs.categories
    .filter((c) => c.costType === CostType.FIXO)
    .reduce((a, c) => a + c.totalYear, 0);
  const variableCostTotal = costs.categories
    .filter((c) => c.costType === CostType.VARIAVEL)
    .reduce((a, c) => a + c.totalYear, 0);

  const contributionMarginPct = annualRevenue > 0 ? (annualRevenue - variableCostTotal) / annualRevenue : 0;
  const realizedRevenue = annualRevenue;

  let breakEvenValue: number;
  let pctOfBreakEvenReached: number;
  let status: DashboardSummary["breakEven"]["status"];
  let statusMessage: string;

  if (contributionMarginPct <= 0) {
    // Margem de contribuição negativa ou zero: o custo variável já consome
    // toda a receita (ou mais). Nesse caso NENHUM volume de vendas com o
    // mix de preço/custo atual cobre os custos fixos — é sempre "abaixo do
    // equilíbrio", mesmo que a receita seja alta. Sem esse caso especial, a
    // fórmula padrão (fixedCostTotal / contributionMarginPct) podia cair
    // para 0 e fazer o sistema mostrar "lucro consolidado" por engano
    // mesmo com prejuízo — bug real encontrado em teste, corrigido aqui.
    breakEvenValue = 0;
    pctOfBreakEvenReached = 0;
    status = "abaixo";
    statusMessage =
      "🔴 Seus custos variáveis já consomem toda a receita (ou mais) — revise custos ou preços antes de calcular o ponto de equilíbrio.";
  } else {
    breakEvenValue = fixedCostTotal / contributionMarginPct;
    // Fórmula original: =IFERROR(B30/D29,1.5) — se não dá para calcular o PE
    // (ex: sem margem de contribuição), assume 150% por padrão (melhor cenário).
    pctOfBreakEvenReached = breakEvenValue > 0 ? realizedRevenue / breakEvenValue : 1.5;

    if (realizedRevenue < breakEvenValue) {
      status = "abaixo";
      const falta = breakEvenValue - realizedRevenue;
      statusMessage = `🔴 Abaixo do Ponto de Equilíbrio — faltam ${formatBRL(falta)} para cobrir os custos fixos.`;
    } else if (realizedRevenue < breakEvenValue * 1.3) {
      status = "seguranca";
      statusMessage = "🟡 Você já está acima do ponto de equilíbrio — faixa de segurança.";
    } else {
      status = "lucro_consolidado";
      statusMessage = "🟢 Lucro consolidado — bem acima do ponto de equilíbrio!";
    }
  }

  // Velocímetro: escala 0-150% do PE mapeada para ponteiro 0-100
  const gaugePointerPct = clamp01(pctOfBreakEvenReached / 1.5) * 100;

  return {
    year,
    activityId: activityId ?? null,
    activityName,
    annualRevenue,
    annualCost,
    annualProfit,
    annualMargin,
    monthlyResults,
    productivity,
    costsByCategory,
    breakEven: {
      fixedCostTotal,
      variableCostTotal,
      contributionMarginPct,
      breakEvenValue,
      realizedRevenue,
      pctOfBreakEvenReached,
      status,
      statusMessage,
      gaugePointerPct,
    },
  };
}

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ----------------------------------------------------------------------------
// Comparativo entre atividades — visão "Comparar Atividades" do Dashboard
// ----------------------------------------------------------------------------

export interface ActivityComparisonRow {
  activityId: string;
  activityName: string;
  revenue: number;
  cost: number;
  result: number;
  margin: number; // 0-1
}

export async function computeActivityComparison(companyId: string, year: number): Promise<ActivityComparisonRow[]> {
  const activities = await prisma.activity.findMany({ where: { companyId }, orderBy: { seqNumber: "asc" } });
  const from = new Date(`${year}-01-01`);
  const to = new Date(`${year + 1}-01-01`);

  const rows = await Promise.all(
    activities.map(async (act) => {
      const [revenueAgg, costAgg] = await Promise.all([
        prisma.financeEntry.aggregate({
          where: { companyId, activityId: act.id, type: FinanceEntryType.ENTRADA, date: { gte: from, lt: to } },
          _sum: { value: true },
        }),
        prisma.financeEntry.aggregate({
          where: { companyId, activityId: act.id, type: FinanceEntryType.SAIDA, date: { gte: from, lt: to } },
          _sum: { value: true },
        }),
      ]);
      const revenue = toNumber(revenueAgg._sum.value);
      const cost = toNumber(costAgg._sum.value);
      const result = revenue - cost;
      return {
        activityId: act.id,
        activityName: act.name,
        revenue,
        cost,
        result,
        margin: revenue > 0 ? result / revenue : 0,
      };
    })
  );

  return rows;
}

// ----------------------------------------------------------------------------
// Radar MGA 360 — índice composto (0-100)
// ----------------------------------------------------------------------------

export interface RadarScore {
  year: number;
  scoreMargin: number; // S5
  scoreBreakEven: number; // S6
  scoreGoals: number; // S7
  scoreInventory: number; // S8
  radarIndex: number; // S9 = 0.35*S5 + 0.25*S6 + 0.20*S7 + 0.20*S8
  status: "critico" | "alerta" | "em_evolucao" | "equilibrado" | "alta_performance";
  statusLabel: string;
  trend: "estavel_poucos_dados" | "crescimento" | "atencao" | "estavel";
  trendLabel: string;
  strengths: string[];
  attentionPoints: string[];
  nextObjective: string;
}

export async function computeRadarScore(companyId: string, year: number): Promise<RadarScore> {
  const dashboard = await computeDashboardSummary(companyId, year);

  // S5: Score Margem = min(max(margem/0.3, 0), 1) * 100
  const scoreMargin = clamp01(dashboard.annualMargin / 0.3) * 100;

  // S6: Score Ponto de Equilíbrio = min(max(%PE/1.5, 0), 1) * 100
  const scoreBreakEven = clamp01(dashboard.breakEven.pctOfBreakEvenReached / 1.5) * 100;

  // S7: Score Metas Produtivas = min(média(% atingido), 1) * 100
  const pctList = dashboard.productivity.map((p) => p.pctAchieved);
  const avgPct = pctList.length > 0 ? pctList.reduce((a, b) => a + b, 0) / pctList.length : 0;
  const scoreGoals = Math.min(avgPct, 1) * 100;

  // S8: Score Estoque = OK / (OK + Repor) * 100
  const inventory = await prisma.inventoryItem.findMany({ where: { companyId } });
  let ok = 0;
  let repor = 0;
  for (const item of inventory) {
    const entry = toNumber(item.entryQty);
    const exit = toNumber(item.exitQty);
    const hasData = entry !== 0 || exit !== 0;
    if (!hasData) continue;
    const balance = entry - exit;
    if (balance <= toNumber(item.minStock)) repor++;
    else ok++;
  }
  const scoreInventory = ok + repor > 0 ? (ok / (ok + repor)) * 100 : 100; // sem dados => trata como OK, igual à fórmula original

  const radarIndex = scoreMargin * 0.35 + scoreBreakEven * 0.25 + scoreGoals * 0.2 + scoreInventory * 0.2;

  let status: RadarScore["status"];
  let statusLabel: string;
  if (radarIndex <= 20) {
    status = "critico";
    statusLabel = "🔴 Crítico";
  } else if (radarIndex <= 40) {
    status = "alerta";
    statusLabel = "🟠 Alerta";
  } else if (radarIndex <= 60) {
    status = "em_evolucao";
    statusLabel = "🟡 Em Evolução";
  } else if (radarIndex <= 80) {
    status = "equilibrado";
    statusLabel = "🟢 Equilibrado";
  } else {
    status = "alta_performance";
    statusLabel = "⭐ Alta Performance";
  }

  // Tendência: compara resultado do último mês com dados vs mês anterior
  const monthsWithData = dashboard.monthlyResults
    .map((m, idx) => ({ ...m, idx }))
    .filter((m) => m.revenue !== 0 || m.cost !== 0);
  let trend: RadarScore["trend"] = "estavel_poucos_dados";
  let trendLabel = "➖ Estável (poucos dados)";
  if (monthsWithData.length >= 2) {
    const last = monthsWithData[monthsWithData.length - 1];
    const prev = monthsWithData[monthsWithData.length - 2];
    if (last.result > prev.result) {
      trend = "crescimento";
      trendLabel = "📈 Crescimento";
    } else if (last.result < prev.result) {
      trend = "atencao";
      trendLabel = "📉 Atenção";
    } else {
      trend = "estavel";
      trendLabel = "➖ Estável";
    }
  }

  const strengths: string[] = [];
  if (scoreMargin >= 60) strengths.push("Boa margem de lucro");
  if (scoreBreakEven >= 60) strengths.push("Acima do ponto de equilíbrio");
  if (scoreGoals >= 60) strengths.push("Metas produtivas em dia");
  if (scoreInventory >= 60) strengths.push("Estoque bem controlado");

  const attentionPoints: string[] = [];
  if (scoreMargin < 60) attentionPoints.push("Melhorar margem de lucro");
  if (scoreBreakEven < 60) attentionPoints.push("Ainda não atingiu o ponto de equilíbrio");
  if (scoreGoals < 60) attentionPoints.push("Metas produtivas abaixo do esperado");
  if (scoreInventory < 60) attentionPoints.push("Estoque precisa de atenção");

  const scores = { scoreMargin, scoreBreakEven, scoreGoals, scoreInventory };
  const minScoreKey = (Object.keys(scores) as (keyof typeof scores)[]).reduce((a, b) =>
    scores[a] <= scores[b] ? a : b
  );
  const nextObjectiveMap: Record<keyof typeof scores, string> = {
    scoreMargin: "Aumentar a margem de lucro: revise despesas variáveis e precificação.",
    scoreBreakEven: "Reduzir custos fixos ou aumentar receita para superar o ponto de equilíbrio.",
    scoreGoals: "Focar em bater as metas produtivas planejadas.",
    scoreInventory: "Organizar o estoque para evitar rupturas e desperdícios.",
  };

  return {
    year,
    scoreMargin,
    scoreBreakEven,
    scoreGoals,
    scoreInventory,
    radarIndex,
    status,
    statusLabel,
    trend,
    trendLabel,
    strengths: strengths.length ? strengths : ["Continue lançando dados para revelarmos seus pontos fortes."],
    attentionPoints: attentionPoints.length ? attentionPoints : ["Nenhum ponto crítico identificado — continue assim!"],
    nextObjective: nextObjectiveMap[minScoreKey],
  };
}

// ----------------------------------------------------------------------------
// Decisão — perguntas-guia
// ----------------------------------------------------------------------------

export interface DecisionInsights {
  year: number;
  isProfitable: boolean;
  profitabilityMessage: string;
  activityProfitability: { activityName: string; revenue: number; cost: number; result: number }[];
  mostProfitableActivityMessage: string;
  biggestCostCategoryMessage: string;
  improvementPriorityMessage: string;
  actionPlan: string[];
}

export async function computeDecisionInsights(companyId: string, year: number): Promise<DecisionInsights> {
  const dashboard = await computeDashboardSummary(companyId, year);
  const costs = await computeCostsSummary(companyId, year);

  const profitReference = USE_LITERAL_SPREADSHEET_BUG ? dashboard.annualRevenue : dashboard.annualProfit;
  const isProfitable = profitReference > 0;
  const profitabilityMessage = isProfitable
    ? `Sim. No ano, sua propriedade teve um resultado positivo de ${formatBRL(dashboard.annualProfit)}.`
    : "Atenção: no ano, suas despesas superaram as receitas. Reveja seus custos.";

  const activities = await prisma.activity.findMany({ where: { companyId }, orderBy: { seqNumber: "asc" } });
  const activityProfitability = await Promise.all(
    activities.map(async (act) => {
      const [revenueEntries, costEntries] = await Promise.all([
        prisma.financeEntry.aggregate({
          where: {
            companyId,
            activityId: act.id,
            type: FinanceEntryType.ENTRADA,
            date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
          },
          _sum: { value: true },
        }),
        prisma.financeEntry.aggregate({
          where: {
            companyId,
            activityId: act.id,
            type: FinanceEntryType.SAIDA,
            date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) },
          },
          _sum: { value: true },
        }),
      ]);
      const revenue = toNumber(revenueEntries._sum.value);
      const cost = toNumber(costEntries._sum.value);
      return { activityName: act.name, revenue, cost, result: revenue - cost };
    })
  );

  let mostProfitableActivityMessage = "Preencha os dados de atividades e financeiro para ver esta resposta.";
  if (activityProfitability.length > 0) {
    const best = activityProfitability.reduce((a, b) => (b.result > a.result ? b : a));
    mostProfitableActivityMessage = `A atividade com melhor resultado é ${best.activityName}, com resultado de ${formatBRL(best.result)}.`;
  }

  let biggestCostCategoryMessage = "Lance suas despesas na aba Financeiro para ver esta resposta.";
  const categoriesWithCost = costs.categories.filter((c) => c.totalYear > 0);
  if (categoriesWithCost.length > 0) {
    const biggest = categoriesWithCost.reduce((a, b) => (b.totalYear > a.totalYear ? b : a));
    biggestCostCategoryMessage = `Sua maior categoria de custo é ${biggest.category}, representando ${(biggest.pctOfTotal * 100).toFixed(1)}% dos seus custos totais.`;
  }

  const improvementConditionValue = USE_LITERAL_SPREADSHEET_BUG ? dashboard.annualRevenue : dashboard.annualProfit;
  let improvementPriorityMessage: string;
  if (improvementConditionValue <= 0) {
    improvementPriorityMessage = "Prioridade máxima: reduzir despesas ou aumentar receitas — a propriedade está no negativo.";
  } else if (dashboard.annualMargin < 0.1) {
    improvementPriorityMessage = "Sua margem está baixa (abaixo de 10%). Revise a categoria de maior custo antes de investir em crescimento.";
  } else if (dashboard.annualMargin < 0.25) {
    improvementPriorityMessage = "Margem razoável. Busque reduzir a categoria de maior custo e aumentar a atividade mais rentável.";
  } else {
    improvementPriorityMessage = "Boa margem! Foque agora em planejamento de crescimento e reinvestimento na atividade mais rentável.";
  }

  const actionPlan = [
    "Concentre investimento na atividade mais rentável (veja acima) antes de expandir para novas.",
    "Negocie ou substitua fornecedores da categoria de maior custo.",
    "Defina metas mensais realistas e acompanhe o % atingido na aba Planejamento.",
    "Revise o Dashboard todo mês — decisão de gestor se toma com dado atualizado, não só por experiência.",
    "Mantenha estoque mínimo controlado para não perder venda nem desperdiçar insumo.",
  ];

  return {
    year,
    isProfitable,
    profitabilityMessage,
    activityProfitability,
    mostProfitableActivityMessage,
    biggestCostCategoryMessage,
    improvementPriorityMessage,
    actionPlan,
  };
}

// ----------------------------------------------------------------------------
// Progresso do diagnóstico (para o Dashboard Inicial)
// ----------------------------------------------------------------------------

export async function computeProgress(companyId: string) {
  const rows = await prisma.diagnosticProgress.findMany({ where: { companyId } });
  const modules = ["CADASTRO", "PLANEJAMENTO", "FINANCEIRO", "CUSTOS", "ESTOQUE", "PESSOAS"] as const;
  const byModule = Object.fromEntries(
    modules.map((m) => [m, toNumber(rows.find((r) => r.module === m)?.completionPct) || 0])
  );
  const overallPct = modules.reduce((sum, m) => sum + byModule[m], 0) / modules.length;
  const completedModules = modules.filter((m) => byModule[m] >= 100).length;

  return { byModule, overallPct, completedModules, totalModules: modules.length };
}

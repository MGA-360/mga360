export type UserRole = "ADMIN" | "CLIENT";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

export interface Company {
  id: string;
  name: string;
  ownerName: string;
  city?: string | null;
  state?: string | null;
  totalAreaHa?: number | null;
  productiveAreaHa?: number | null;
  managementStartDate?: string | null;
  activitiesSummary?: string | null;
}

export interface Activity {
  id: string;
  seqNumber: number;
  name: string;
  description?: string | null;
}

export interface FinanceEntry {
  id: string;
  type: "ENTRADA" | "SAIDA";
  date: string;
  description: string;
  category: string;
  activityId?: string | null;
  activity?: { name: string } | null;
  value: number;
}

export interface CostCategory {
  id: string;
  name: string;
  costType: "FIXO" | "VARIAVEL";
}

export interface ProgressSummary {
  byModule: Record<string, number>;
  overallPct: number;
  completedModules: number;
  totalModules: number;
}

export interface ActivityComparisonRow {
  activityId: string;
  activityName: string;
  revenue: number;
  cost: number;
  result: number;
  margin: number;
}

export interface DashboardSummary {
  year: number;
  activityId: string | null;
  activityName: string | null;
  annualRevenue: number;
  annualCost: number;
  annualProfit: number;
  annualMargin: number;
  monthlyResults: { month: string; revenue: number; cost: number; result: number; margin: number }[];
  productivity: { activityName: string; unit: string; annualGoal: number; achieved: number; pctAchieved: number }[];
  costsByCategory: { category: string; totalYear: number }[];
  breakEven: {
    fixedCostTotal: number;
    variableCostTotal: number;
    contributionMarginPct: number;
    breakEvenValue: number;
    realizedRevenue: number;
    pctOfBreakEvenReached: number;
    status: "abaixo" | "seguranca" | "lucro_consolidado";
    statusMessage: string;
    gaugePointerPct: number;
  };
}

export interface RadarScore {
  year: number;
  scoreMargin: number;
  scoreBreakEven: number;
  scoreGoals: number;
  scoreInventory: number;
  radarIndex: number;
  status: "critico" | "alerta" | "em_evolucao" | "equilibrado" | "alta_performance";
  statusLabel: string;
  trend: string;
  trendLabel: string;
  strengths: string[];
  attentionPoints: string[];
  nextObjective: string;
}

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

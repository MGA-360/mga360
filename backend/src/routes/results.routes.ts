import { Router } from "express";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";
import {
  computeDashboardSummary,
  computeRadarScore,
  computeDecisionInsights,
  computeActivityComparison,
} from "../services/calc.service";

function currentYear(req: any) {
  return req.query.year ? Number(req.query.year) : new Date().getFullYear();
}

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireCompanyContext);

// GET /dashboard/summary?year=2026&activityId=... — sem activityId = visão Geral (todas as atividades)
dashboardRouter.get("/summary", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const activityId = (req.query.activityId as string) || undefined;
  res.json(await computeDashboardSummary(companyId, currentYear(req), activityId));
});

// GET /dashboard/by-activity?year=2026 — tabela comparativa (Receita/Custo/Resultado por atividade)
dashboardRouter.get("/by-activity", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  res.json(await computeActivityComparison(companyId, currentYear(req)));
});

export const radarRouter = Router();
radarRouter.use(requireAuth, requireCompanyContext);
radarRouter.get("/score", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  res.json(await computeRadarScore(companyId, currentYear(req)));
});

export const decisionRouter = Router();
decisionRouter.use(requireAuth, requireCompanyContext);
decisionRouter.get("/insights", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  res.json(await computeDecisionInsights(companyId, currentYear(req)));
});

import { Router } from "express";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";
import { computeCostsSummary } from "../services/calc.service";

export const costsRouter = Router();
costsRouter.use(requireAuth, requireCompanyContext);

// GET /costs/summary?year=2026
// Somente leitura — não há POST/PATCH aqui, pois na planilha original os
// valores desta aba vêm 100% de Financeiro > Saídas ("não digite números aqui").
costsRouter.get("/summary", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const summary = await computeCostsSummary(companyId, year);
  res.json(summary);
});

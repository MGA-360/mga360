import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";
import { computeDashboardSummary, computeRadarScore, computeDecisionInsights } from "../services/calc.service";
import { generateReportPdf } from "../services/report.service";

export const reportsRouter = Router();
reportsRouter.use(requireAuth, requireCompanyContext);

reportsRouter.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const reports = await prisma.report.findMany({ where: { companyId }, orderBy: { generatedAt: "desc" } });
  res.json(reports);
});

reportsRouter.get("/:id/download", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const report = await prisma.report.findUnique({ where: { id: req.params.id, companyId } });
  if (!report) return res.status(404).json({ error: "Relatório não encontrado." });
  if (!report.fileUrl) return res.status(404).json({ error: "Arquivo do relatório indisponível." });
  res.redirect(report.fileUrl);
});

// POST /reports/generate?year=2026
// Congela os números atuais em snapshotJson (para o PDF não mudar
// retroativamente se os dados forem editados depois) e gera o arquivo.
reportsRouter.post("/generate", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

  const [company, dashboard, radar, decision] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    computeDashboardSummary(companyId, year),
    computeRadarScore(companyId, year),
    computeDecisionInsights(companyId, year),
  ]);

 const snapshotJson = JSON.parse(JSON.stringify({ company, dashboard, radar, decision, generatedAt: new Date().toISOString() }));

    data: { companyId, generatedById: req.auth!.sub, snapshotJson },
  });

  const fileUrl = await generateReportPdf(report.id, snapshotJson);
  const updated = await prisma.report.update({ where: { id: report.id }, data: { fileUrl } });

  res.status(201).json(updated);
});

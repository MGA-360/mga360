import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";
import { computeProgress } from "../services/calc.service";

export const progressRouter = Router();
progressRouter.use(requireAuth, requireCompanyContext);

progressRouter.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  res.json(await computeProgress(companyId));
});

const updateSchema = z.object({
  module: z.enum(["CADASTRO", "PLANEJAMENTO", "FINANCEIRO", "CUSTOS", "ESTOQUE", "PESSOAS"]),
  completionPct: z.number().min(0).max(100),
});

// Chamado pelo frontend a cada autosave de um módulo, para atualizar a
// barra de progresso do Dashboard Inicial.
progressRouter.put("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const { module, completionPct } = updateSchema.parse(req.body);
  const record = await prisma.diagnosticProgress.upsert({
    where: { companyId_module: { companyId, module } },
    update: { completionPct },
    create: { companyId, module, completionPct },
  });
  res.json(record);
});

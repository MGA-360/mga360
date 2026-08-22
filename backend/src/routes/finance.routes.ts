import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";

export const financeRouter = Router();
financeRouter.use(requireAuth, requireCompanyContext);

const entrySchema = z.object({
  type: z.enum(["ENTRADA", "SAIDA"]),
  date: z.coerce.date(),
  description: z.string().min(1),
  category: z.string().min(1),
  activityId: z.string().optional(),
  value: z.number().positive(),
});

// GET /finance/entries?type=ENTRADA|SAIDA&year=2026&month=1
financeRouter.get("/entries", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const { type, year, month } = req.query as Record<string, string | undefined>;

  const where: any = { companyId };
  if (type) where.type = type;
  if (year) {
    const y = Number(year);
    const from = month ? new Date(y, Number(month) - 1, 1) : new Date(`${y}-01-01`);
    const to = month ? new Date(y, Number(month), 1) : new Date(`${y + 1}-01-01`);
    where.date = { gte: from, lt: to };
  }

  const entries = await prisma.financeEntry.findMany({
    where,
    orderBy: { date: "desc" },
    include: { activity: { select: { name: true } } },
  });
  res.json(entries);
});

// Categorias válidas para o dropdown de Saídas (deve bater com CostCategory)
financeRouter.get("/cost-categories", async (_req, res) => {
  const categories = await prisma.costCategory.findMany({ orderBy: { name: "asc" } });
  res.json(categories);
});

financeRouter.post("/entries", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = entrySchema.parse(req.body);

  // Se for saída, a categoria precisa existir em CostCategory (é o que alimenta
  // o módulo Custos automaticamente — equivalente à regra da planilha).
  if (data.type === "SAIDA") {
    const validCategory = await prisma.costCategory.findUnique({ where: { name: data.category } });
    if (!validCategory) {
      return res.status(400).json({
        error: `Categoria de saída inválida: "${data.category}". Use uma das categorias de GET /finance/cost-categories.`,
      });
    }
  }

  const entry = await prisma.financeEntry.create({ data: { ...data, companyId } });
  res.status(201).json(entry);
});

financeRouter.patch("/entries/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = entrySchema.partial().parse(req.body);
  const entry = await prisma.financeEntry.update({ where: { id: req.params.id, companyId }, data });
  res.json(entry);
});

financeRouter.delete("/entries/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.financeEntry.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

// GET /finance/monthly-summary?year=2026 — equivalente à aba Financeiro §3
financeRouter.get("/monthly-summary", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

  const entries = await prisma.financeEntry.findMany({
    where: { companyId, date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
  });

  const months = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, revenue: 0, cost: 0 }));
  for (const e of entries) {
    const m = new Date(e.date).getUTCMonth();
    if (e.type === "ENTRADA") months[m].revenue += Number(e.value);
    else months[m].cost += Number(e.value);
  }

  const summary = months.map((m) => ({
    ...m,
    result: m.revenue - m.cost,
    margin: m.revenue > 0 ? (m.revenue - m.cost) / m.revenue : 0,
  }));

  const totals = summary.reduce(
    (acc, m) => ({ revenue: acc.revenue + m.revenue, cost: acc.cost + m.cost, result: acc.result + m.result }),
    { revenue: 0, cost: 0, result: 0 }
  );

  res.json({ year, months: summary, totals: { ...totals, margin: totals.revenue > 0 ? totals.result / totals.revenue : 0 } });
});

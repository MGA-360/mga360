import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";

export const planningRouter = Router();
planningRouter.use(requireAuth, requireCompanyContext);

// ---- Metas produtivas anuais ----
const goalSchema = z.object({
  activityId: z.string(),
  unit: z.string().min(1),
  annualGoal: z.number().nonnegative(),
  achievedValue: z.number().nonnegative().optional(),
  notes: z.string().optional(),
  year: z.number().int(),
});

planningRouter.get("/goals", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const goals = await prisma.planningGoal.findMany({ where: { companyId, year }, include: { activity: true } });
  // % Atingido é sempre calculado na resposta, nunca armazenado
  res.json(
    goals.map((g) => ({
      ...g,
      pctAchieved: Number(g.annualGoal) > 0 ? Number(g.achievedValue) / Number(g.annualGoal) : 0,
    }))
  );
});

planningRouter.post("/goals", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = goalSchema.parse(req.body);
  const goal = await prisma.planningGoal.upsert({
    where: { activityId_year: { activityId: data.activityId, year: data.year } },
    update: data,
    create: { ...data, companyId },
  });
  res.status(201).json(goal);
});

planningRouter.patch("/goals/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = goalSchema.partial().parse(req.body);
  const goal = await prisma.planningGoal.update({ where: { id: req.params.id, companyId }, data });
  res.json(goal);
});

planningRouter.delete("/goals/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.planningGoal.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

// ---- Calendário mensal ----
const calendarSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  activityId: z.string().optional(),
  plannedActivity: z.string().min(1),
  status: z.enum(["PLANEJADO", "EM_ANDAMENTO", "CONCLUIDO", "ATRASADO"]).optional(),
});

planningRouter.get("/calendar", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const items = await prisma.planningCalendarItem.findMany({
    where: { companyId, year },
    orderBy: { month: "asc" },
    include: { activity: true },
  });
  res.json(items);
});

planningRouter.post("/calendar", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = calendarSchema.parse(req.body);
  const item = await prisma.planningCalendarItem.create({ data: { ...data, companyId } });
  res.status(201).json(item);
});

planningRouter.patch("/calendar/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = calendarSchema.partial().parse(req.body);
  const item = await prisma.planningCalendarItem.update({ where: { id: req.params.id, companyId }, data });
  res.json(item);
});

planningRouter.delete("/calendar/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.planningCalendarItem.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

// ---- Ciclos produtivos ----
const cycleSchema = z.object({
  activityId: z.string(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

planningRouter.get("/cycles", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const cycles = await prisma.productionCycle.findMany({ where: { companyId }, include: { activity: true } });
  res.json(
    cycles.map((c) => ({
      ...c,
      durationDays:
        c.startDate && c.endDate
          ? Math.round((c.endDate.getTime() - c.startDate.getTime()) / (1000 * 60 * 60 * 24))
          : null,
    }))
  );
});

planningRouter.post("/cycles", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = cycleSchema.parse(req.body);
  const cycle = await prisma.productionCycle.create({ data: { ...data, companyId } });
  res.status(201).json(cycle);
});

planningRouter.patch("/cycles/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = cycleSchema.partial().parse(req.body);
  const cycle = await prisma.productionCycle.update({ where: { id: req.params.id, companyId }, data });
  res.json(cycle);
});

planningRouter.delete("/cycles/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.productionCycle.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

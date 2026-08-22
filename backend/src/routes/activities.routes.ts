import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";

export const activitiesRouter = Router();
activitiesRouter.use(requireAuth, requireCompanyContext);

const activitySchema = z.object({
  seqNumber: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
});

activitiesRouter.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const activities = await prisma.activity.findMany({ where: { companyId }, orderBy: { seqNumber: "asc" } });
  res.json(activities);
});

activitiesRouter.post("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = activitySchema.parse(req.body);
  const activity = await prisma.activity.create({ data: { ...data, companyId } });
  res.status(201).json(activity);
});

activitiesRouter.patch("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = activitySchema.partial().parse(req.body);
  const activity = await prisma.activity.update({ where: { id: req.params.id, companyId }, data });
  res.json(activity);
});

activitiesRouter.delete("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.activity.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

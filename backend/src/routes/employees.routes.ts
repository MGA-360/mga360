import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";

export const employeesRouter = Router();
employeesRouter.use(requireAuth, requireCompanyContext);

const employeeSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  baseSalary: z.number().nonnegative(),
  chargesPct: z.number().min(0).max(2).optional(), // 0.30 = 30%
  activitiesPerformed: z.string().optional(),
  notes: z.string().optional(),
});

function withComputed(e: any) {
  const total = Number(e.baseSalary) * (1 + Number(e.chargesPct));
  return { ...e, totalCost: total };
}

employeesRouter.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const employees = await prisma.employee.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  const withCosts = employees.map(withComputed);
  const totalMonthly = withCosts.reduce((sum: number, e: { totalCost: number }) => sum + e.totalCost, 0);
  res.json({ employees: withCosts, totalMonthly });
});

employeesRouter.post("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = employeeSchema.parse(req.body);
  const employee = await prisma.employee.create({ data: { ...data, companyId } });
  res.status(201).json(withComputed(employee));
});

employeesRouter.patch("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = employeeSchema.partial().parse(req.body);
  const employee = await prisma.employee.update({ where: { id: req.params.id, companyId }, data });
  res.json(withComputed(employee));
});

employeesRouter.delete("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.employee.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

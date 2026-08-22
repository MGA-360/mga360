import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";

export const inventoryRouter = Router();
inventoryRouter.use(requireAuth, requireCompanyContext);

const itemSchema = z.object({
  product: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  minStock: z.number().nonnegative().optional(),
  expiryDate: z.coerce.date().optional(),
  entryQty: z.number().nonnegative().optional(),
  exitQty: z.number().nonnegative().optional(),
});

function withComputed(item: any) {
  const entry = Number(item.entryQty);
  const exit = Number(item.exitQty);
  const hasData = entry !== 0 || exit !== 0;
  const balance = hasData ? entry - exit : null;
  const status = balance === null ? null : balance <= Number(item.minStock) ? "REPOR_ESTOQUE" : "OK";
  return { ...item, balance, status };
}

inventoryRouter.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const items = await prisma.inventoryItem.findMany({ where: { companyId }, orderBy: { product: "asc" } });
  res.json(items.map(withComputed));
});

inventoryRouter.post("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = itemSchema.parse(req.body);
  const item = await prisma.inventoryItem.create({ data: { ...data, companyId } });
  res.status(201).json(withComputed(item));
});

inventoryRouter.patch("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = itemSchema.partial().parse(req.body);
  const item = await prisma.inventoryItem.update({ where: { id: req.params.id, companyId }, data });
  res.json(withComputed(item));
});

inventoryRouter.delete("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.inventoryItem.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

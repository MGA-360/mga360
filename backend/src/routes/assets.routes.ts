import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCompanyContext, resolveCompanyId } from "../middleware/auth.middleware";

export const assetsRouter = Router();
assetsRouter.use(requireAuth, requireCompanyContext);

const assetSchema = z.object({
  item: z.string().min(1),
  type: z.string().min(1),
  year: z.number().int().optional(),
  acquisitionValue: z.number().nonnegative().optional(),
  condition: z.enum(["OTIMO", "BOM", "REGULAR", "RUIM"]).optional(),
  notes: z.string().optional(),
});

assetsRouter.get("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const assets = await prisma.asset.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  res.json(assets);
});

assetsRouter.post("/", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = assetSchema.parse(req.body);
  const asset = await prisma.asset.create({ data: { ...data, companyId } });
  res.status(201).json(asset);
});

assetsRouter.patch("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  const data = assetSchema.partial().parse(req.body);
  const asset = await prisma.asset.update({ where: { id: req.params.id, companyId }, data });
  res.json(asset);
});

assetsRouter.delete("/:id", async (req, res) => {
  const companyId = resolveCompanyId(req)!;
  await prisma.asset.delete({ where: { id: req.params.id, companyId } });
  res.status(204).send();
});

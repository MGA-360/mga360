import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware";
import { hashPassword } from "../lib/auth";

export const companiesRouter = Router();
companiesRouter.use(requireAuth);

const companyUpsertSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().min(1),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  totalAreaHa: z.number().nonnegative().optional(),
  productiveAreaHa: z.number().nonnegative().optional(),
  managementStartDate: z.coerce.date().optional(),
  activitiesSummary: z.string().optional(),
});

// GET /companies/me — dados da empresa ATIVA do usuário logado
companiesRouter.get("/me", async (req, res) => {
  if (!req.auth?.companyId) return res.status(404).json({ error: "Usuário sem empresa vinculada." });
  const company = await prisma.company.findUnique({ where: { id: req.auth.companyId } });
  if (!company) return res.status(404).json({ error: "Empresa não encontrada." });
  res.json(company);
});

companiesRouter.patch("/me", async (req, res) => {
  if (!req.auth?.companyId) return res.status(404).json({ error: "Usuário sem empresa vinculada." });
  const data = companyUpsertSchema.partial().parse(req.body);
  const company = await prisma.company.update({ where: { id: req.auth.companyId }, data });
  res.json(company);
});

// POST /companies/mine — cliente cadastra uma propriedade PRÓPRIA (fluxo de
// onboarding, ou "+ Nova propriedade" para quem já tem outra(s)). Diferente
// da rota de admin abaixo: aqui não se cria usuário nenhum, só se vincula a
// nova propriedade ao usuário que já está logado.
companiesRouter.post("/mine", async (req, res) => {
  const data = companyUpsertSchema.parse(req.body);

  const company = await prisma.company.create({
    data: {
      ...data,
      memberships: { create: { userId: req.auth!.sub } },
    },
  });

  res.status(201).json(company);
});

// ---- Rotas exclusivas do admin ----

companiesRouter.get("/", requireAdmin, async (req, res) => {
  const search = (req.query.search as string) || undefined;
  const companies = await prisma.company.findMany({
    where: search
      ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { ownerName: { contains: search, mode: "insensitive" } }] }
      : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, financeEntries: true } } },
  });
  res.json(companies);
});

companiesRouter.get("/:id", requireAdmin, async (req, res) => {
  const company = await prisma.company.findUnique({ where: { id: req.params.id } });
  if (!company) return res.status(404).json({ error: "Empresa não encontrada." });
  res.json(company);
});

const createClientSchema = z.object({
  company: companyUpsertSchema,
  user: z.object({ name: z.string().min(1), email: z.string().email(), password: z.string().min(8) }),
});

// POST /companies — admin cria um novo cliente (empresa + usuário inicial)
companiesRouter.post("/", requireAdmin, async (req, res) => {
  const { company, user } = createClientSchema.parse(req.body);
  const passwordHash = await hashPassword(user.password);

  const created = await prisma.company.create({
    data: {
      ...company,
      users: { create: { name: user.name, email: user.email, passwordHash, role: "CLIENT" } },
    },
    include: { users: true },
  });

  // O create acima já vincula o novo usuário via User.companyId, mas
  // precisamos também da linha em company_memberships (fonte da verdade
  // para "quantas propriedades esse usuário tem" no login/onboarding).
  const newUser = created.users[0];
  if (newUser) {
    await prisma.companyMembership.create({ data: { userId: newUser.id, companyId: created.id } });
  }

  res.status(201).json(created);
});

companiesRouter.patch("/:id", requireAdmin, async (req, res) => {
  const data = companyUpsertSchema.partial().parse(req.body);
  const company = await prisma.company.update({ where: { id: req.params.id }, data });
  res.json(company);
});

companiesRouter.delete("/:id", requireAdmin, async (req, res) => {
  await prisma.company.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

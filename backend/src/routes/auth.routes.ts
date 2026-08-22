import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import {
  comparePassword,
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  hashResetToken,
} from "../lib/auth";

export const authRouter = Router();

/**
 * Decide qual companyId vai dentro do token de um CLIENT, olhando os
 * vínculos (company_memberships) dele:
 * - 0 propriedades  -> null (frontend manda pro fluxo de "cadastrar minha primeira propriedade")
 * - 1 propriedade   -> essa mesma, automaticamente (não precisa escolher)
 * - 2+ propriedades -> null também (frontend mostra a tela "Minhas Propriedades" pra escolher)
 */
async function resolveInitialCompanyId(userId: string, role: string): Promise<string | null> {
  if (role === "ADMIN") return null;
  const memberships = await prisma.companyMembership.findMany({ where: { userId } });
  return memberships.length === 1 ? memberships[0].companyId : null;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.status === "DISABLED") {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "E-mail ou senha inválidos." });
  }

  const companyId = await resolveInitialCompanyId(user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date(), companyId } });

  const accessToken = signAccessToken({ sub: user.id, role: user.role, companyId });
  const refreshToken = signRefreshToken({ sub: user.id });

  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId },
  });
});

const signupSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

// POST /auth/signup — cadastro público do produtor (perfil CLIENT). Não cria
// propriedade nenhuma ainda — isso acontece no onboarding (POST /companies/mine).
authRouter.post("/signup", async (req, res) => {
  const { name, email, phone, password } = signupSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Já existe uma conta com este e-mail." });
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, phone, passwordHash, role: "CLIENT" },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role, companyId: null });
  const refreshToken = signRefreshToken({ sub: user.id });

  res.status(201).json({
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, companyId: null },
  });
});

// GET /auth/my-companies — propriedades vinculadas ao usuário logado (para
// a tela "Minhas Propriedades" e para decidir o que mostrar após login/signup).
authRouter.get("/my-companies", requireAuth, async (req, res) => {
  const memberships = await prisma.companyMembership.findMany({
    where: { userId: req.auth!.sub },
    include: { company: true },
    orderBy: { createdAt: "asc" },
  });
  res.json(memberships.map((m) => m.company));
});

const selectCompanySchema = z.object({ companyId: z.string() });

// POST /auth/select-company — troca a propriedade "ativa" do token atual.
// Confere que o usuário realmente tem vínculo com essa propriedade antes de emitir o token.
authRouter.post("/select-company", requireAuth, async (req, res) => {
  const { companyId } = selectCompanySchema.parse(req.body);

  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: req.auth!.sub, companyId } },
  });
  if (!membership) {
    return res.status(403).json({ error: "Você não tem acesso a esta propriedade." });
  }

  await prisma.user.update({ where: { id: req.auth!.sub }, data: { companyId } });
  const accessToken = signAccessToken({ sub: req.auth!.sub, role: req.auth!.role, companyId });
  res.json({ accessToken, companyId });
});

const refreshSchema = z.object({ refreshToken: z.string() });

authRouter.post("/refresh", async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === "DISABLED") {
      return res.status(401).json({ error: "Sessão inválida." });
    }
    const accessToken = signAccessToken({ sub: user.id, role: user.role, companyId: user.companyId });
    res.json({ accessToken });
  } catch {
    return res.status(401).json({ error: "Refresh token inválido ou expirado." });
  }
});

const forgotSchema = z.object({ email: z.string().email() });

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = forgotSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  // Resposta sempre genérica — não revela se o e-mail existe na base.
  if (user) {
    const { raw, hash } = generatePasswordResetToken();
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hash, expiresAt: new Date(Date.now() + 1000 * 60 * 30) },
    });
    // TODO: integrar serviço de e-mail (SES/SendGrid) e enviar link com `raw`.
    console.log(`[dev] Link de redefinição para ${email}: /reset-password?token=${raw}`);
  }

  res.json({ message: "Se o e-mail existir em nossa base, você receberá instruções de recuperação." });
});

const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) });

authRouter.post("/reset-password", async (req, res) => {
  const { token, newPassword } = resetSchema.parse(req.body);
  const tokenHash = hashResetToken(token);

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: "Token inválido ou expirado." });
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: "Senha redefinida com sucesso." });
});

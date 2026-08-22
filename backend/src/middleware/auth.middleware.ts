import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, AccessTokenPayload } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de acesso ausente." });
  }
  const token = header.slice("Bearer ".length);
  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({ error: "Token de acesso inválido ou expirado." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.role !== "ADMIN") {
    return res.status(403).json({ error: "Acesso restrito ao administrador." });
  }
  next();
}

/**
 * Resolve o companyId que a requisição deve usar:
 * - CLIENT: sempre a própria empresa (ignora qualquer companyId da URL/query).
 * - ADMIN: pode passar ?companyId=... para atuar em nome de um cliente.
 */
export function resolveCompanyId(req: Request): string | null {
  if (req.auth?.role === "ADMIN") {
    return (req.query.companyId as string) || (req.body?.companyId as string) || null;
  }
  return req.auth?.companyId ?? null;
}

export function requireCompanyContext(req: Request, res: Response, next: NextFunction) {
  const companyId = resolveCompanyId(req);
  if (!companyId) {
    return res.status(400).json({
      error:
        req.auth?.role === "ADMIN"
          ? "Informe companyId (query ou body) para operar em nome de um cliente."
          : "Usuário não está vinculado a nenhuma empresa.",
    });
  }
  (req as any).companyId = companyId;
  next();
}

import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Dados inválidos.", details: err.flatten() });
  }
  if (err instanceof Error) {
    console.error(err);
    return res.status(500).json({ error: "Erro interno do servidor.", message: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: "Erro interno do servidor." });
}

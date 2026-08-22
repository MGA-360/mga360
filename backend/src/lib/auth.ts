import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface AccessTokenPayload {
  sub: string; // userId
  role: "ADMIN" | "CLIENT";
  companyId: string | null;
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function comparePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signAccessToken(payload: AccessTokenPayload) {
  const options: jwt.SignOptions = { expiresIn: ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function signRefreshToken(payload: { sub: string }) {
  const options: jwt.SignOptions = { expiresIn: REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string };
}

/** Gera um token opaco para recuperação de senha (armazenamos só o hash no banco). */
export function generatePasswordResetToken() {
  const raw = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function hashResetToken(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

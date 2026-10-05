import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sessão mínima para app de usuário único.
 * Token = "<expiraEmMs>.<hmac>" assinado com SESSION_SECRET.
 * Sem dependências externas e funciona no proxy (runtime Node.js).
 */
export const SESSION_COOKIE = "fin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET ausente ou muito curto (mínimo 16 caracteres).");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(): { token: string; maxAge: number } {
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = String(exp);
  return { token: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

export function checkPassword(input: string): boolean {
  const pass = process.env.APP_PASSWORD;
  if (!pass) return false;
  const a = Buffer.from(sign(input));
  const b = Buffer.from(sign(pass));
  return timingSafeEqual(a, b);
}

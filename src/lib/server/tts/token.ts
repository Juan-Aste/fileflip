import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Short-lived signed token (task 13.3b): the reader gets one from
// GET /api/tts when the page loads and sends it with every sentence, so a
// script has to load our endpoint first instead of calling POST directly.
// It only proves "recently asked us"; the real protection is the per-IP,
// per-user and monthly limits.

export const TOKEN_TTL_MS = 30 * 60_000;

// Without AUTH_SECRET (local runs) a random secret per process: tokens then
// stop working after a restart, and the reader just asks for a new one.
let fallbackSecret: Buffer | null = null;
function secret(env: NodeJS.ProcessEnv = process.env): Buffer {
  if (env.AUTH_SECRET) return createHmac("sha256", env.AUTH_SECRET).update("fileflect-tts-token").digest();
  return (fallbackSecret ??= randomBytes(32));
}

const sign = (payload: string, key: Buffer) => createHmac("sha256", key).update(payload).digest("base64url");

export function createTtsToken(now = Date.now(), key = secret()): string {
  const payload = `${now + TOKEN_TTL_MS}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifyTtsToken(token: unknown, now = Date.now(), key = secret()): boolean {
  if (typeof token !== "string" || token.length > 200) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [expiry, nonce, signature] = parts;
  const expected = Buffer.from(sign(`${expiry}.${nonce}`, key));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const exp = Number(expiry);
  return Number.isFinite(exp) && exp > now && exp - now <= TOKEN_TTL_MS;
}

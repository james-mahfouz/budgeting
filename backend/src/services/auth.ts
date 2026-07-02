import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { AuthSession, User } from "../types.js";

const keyLength = 64;
const tokenTtlDays = 365;

export const publicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  username: user.username
});

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, keyLength).toString("hex");
  return `scrypt:${salt}:${key}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [method, salt, key] = storedHash.split(":");
  if (method !== "scrypt" || !salt || !key) {
    return false;
  }

  const expected = Buffer.from(key, "hex");
  const actual = scryptSync(password, salt, keyLength);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const createRawToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const sessionExpiry = (from = new Date()) => {
  const expiresAt = new Date(from);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + tokenTtlDays);
  return expiresAt.toISOString();
};

export const isSessionActive = (session: AuthSession, now = new Date()) => session.expiresAt > now.toISOString();

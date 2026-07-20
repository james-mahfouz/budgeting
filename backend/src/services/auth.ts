import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { User } from "../types.js";

const keyLength = 64;
const persistentSessionExpiry = "9999-12-31T23:59:59.999Z";

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

// Sessions are revoked only by explicit logout. Keep expiresAt in the stored shape
// for backwards compatibility with existing data files.
export const sessionExpiry = () => persistentSessionExpiry;

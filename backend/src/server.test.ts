import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { JsonStore } from "./db.js";
import { buildServer } from "./server.js";

let tempDir: string;

const createApp = async () => {
  tempDir = await mkdtemp(join(tmpdir(), "budgeting-test-"));
  const store = new JsonStore(join(tempDir, "db.json"));
  return buildServer(store);
};

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

describe("auth protected API", () => {
  it("rejects unauthenticated API requests", async () => {
    const app = await createApp();
    const response = await app.inject({ method: "GET", url: "/api/categories" });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it("keeps each user's data isolated", async () => {
    const app = await createApp();
    const registerA = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "James", username: "james", password: "password123" }
    });
    const registerB = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "Other", username: "other", password: "password123" }
    });
    const authA = registerA.json<{ token: string }>();
    const authB = registerB.json<{ token: string }>();

    const created = await app.inject({
      method: "POST",
      url: "/api/categories",
      headers: { authorization: `Bearer ${authA.token}` },
      payload: { name: "Private", kind: "expense", color: "#0E9384", icon: "pricetag" }
    });
    expect(created.statusCode).toBe(201);

    const categoriesA = await app.inject({
      method: "GET",
      url: "/api/categories",
      headers: { authorization: `Bearer ${authA.token}` }
    });
    const categoriesB = await app.inject({
      method: "GET",
      url: "/api/categories",
      headers: { authorization: `Bearer ${authB.token}` }
    });

    expect(categoriesA.json<{ categories: Array<{ name: string }> }>().categories.some((item) => item.name === "Private")).toBe(true);
    expect(categoriesB.json<{ categories: Array<{ name: string }> }>().categories.some((item) => item.name === "Private")).toBe(false);
    await app.close();
  });
});

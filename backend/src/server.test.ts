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

const createAppWithStore = async () => {
  tempDir = await mkdtemp(join(tmpdir(), "budgeting-test-"));
  const store = new JsonStore(join(tempDir, "db.json"));
  const app = await buildServer(store);
  return { app, store };
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
      payload: { name: "James", username: "james@example.com", password: "password123" }
    });
    const registerB = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "Other", username: "other@example.com", password: "password123" }
    });
    expect(registerA.statusCode).toBe(201);
    expect(registerB.statusCode).toBe(201);
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

  it("keeps a session valid until explicit logout", async () => {
    const { app, store } = await createAppWithStore();
    const register = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "James", username: "james-session@example.com", password: "password123" }
    });
    const auth = register.json<{ token: string }>();

    await store.update((data) => {
      data.sessions[0].expiresAt = "2000-01-01T00:00:00.000Z";
    });

    const restored = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(restored.statusCode).toBe(200);

    const refreshed = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json<{ token: string }>().token).toBe(auth.token);

    const logout = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(logout.statusCode).toBe(204);

    const afterLogout = await app.inject({
      method: "GET",
      url: "/api/auth/me",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    expect(afterLogout.statusCode).toBe(401);
    await app.close();
  });

  it("creates, updates, selects, and deletes category-scoped subcategories", async () => {
    const app = await createApp();
    const register = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "James", username: "james-subcategories@example.com", password: "password123" }
    });
    const auth = register.json<{ token: string }>();
    const headers = { authorization: `Bearer ${auth.token}` };

    const categoriesResponse = await app.inject({ method: "GET", url: "/api/categories", headers });
    const expenseCategories = categoriesResponse
      .json<{ categories: Array<{ id: string; kind: string }> }>()
      .categories.filter((item) => item.kind === "expense");
    expect(expenseCategories.length).toBeGreaterThan(1);

    const createdResponse = await app.inject({
      method: "POST",
      url: "/api/subcategories",
      headers,
      payload: { categoryId: expenseCategories[0].id, name: "Weekly shop" }
    });
    expect(createdResponse.statusCode).toBe(201);
    const created = createdResponse.json<{ subcategory: { id: string; categoryId: string; name: string } }>().subcategory;
    expect(created).toMatchObject({ categoryId: expenseCategories[0].id, name: "Weekly shop" });

    const listed = await app.inject({ method: "GET", url: "/api/subcategories", headers });
    expect(listed.json<{ subcategories: Array<{ id: string }> }>().subcategories).toContainEqual(
      expect.objectContaining({ id: created.id })
    );

    const updated = await app.inject({
      method: "PUT",
      url: `/api/subcategories/${created.id}`,
      headers,
      payload: { categoryId: expenseCategories[0].id, name: "Supermarket" }
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json<{ subcategory: { name: string } }>().subcategory.name).toBe("Supermarket");

    const transactionResponse = await app.inject({
      method: "POST",
      url: "/api/transactions",
      headers,
      payload: {
        type: "expense",
        amount: 30,
        categoryId: expenseCategories[0].id,
        subcategoryId: created.id,
        merchant: "Market"
      }
    });
    expect(transactionResponse.statusCode).toBe(201);
    expect(transactionResponse.json<{ transaction: { subcategoryId: string } }>().transaction.subcategoryId).toBe(created.id);

    const mismatchedTransaction = await app.inject({
      method: "POST",
      url: "/api/transactions",
      headers,
      payload: {
        type: "expense",
        amount: 10,
        categoryId: expenseCategories[1].id,
        subcategoryId: created.id,
        merchant: "Wrong category"
      }
    });
    expect(mismatchedTransaction.statusCode).toBe(422);

    const removed = await app.inject({ method: "DELETE", url: `/api/subcategories/${created.id}`, headers });
    expect(removed.statusCode).toBe(204);

    const transactions = await app.inject({ method: "GET", url: "/api/transactions", headers });
    expect(
      transactions.json<{ transactions: Array<{ merchant: string; subcategoryId?: string }> }>().transactions
        .find((transaction) => transaction.merchant === "Market")
    ).not.toHaveProperty("subcategoryId");
    await app.close();
  });

  it("updates a user's transaction", async () => {
    const app = await createApp();
    const register = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: { name: "James", username: "james-edit@example.com", password: "password123" }
    });
    const auth = register.json<{ token: string }>();

    const categories = await app.inject({
      method: "GET",
      url: "/api/categories",
      headers: { authorization: `Bearer ${auth.token}` }
    });
    const category = categories.json<{ categories: Array<{ id: string; kind: string }> }>().categories.find((item) => item.kind === "expense");
    expect(category).toBeTruthy();

    const created = await app.inject({
      method: "POST",
      url: "/api/transactions",
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        type: "expense",
        amount: 12,
        currency: "USD",
        categoryId: category?.id,
        merchant: "Old merchant",
        occurredAt: "2026-07-01T12:00:00.000Z"
      }
    });
    expect(created.statusCode).toBe(201);
    const transaction = created.json<{ transaction: { id: string } }>().transaction;

    const updated = await app.inject({
      method: "PUT",
      url: `/api/transactions/${transaction.id}`,
      headers: { authorization: `Bearer ${auth.token}` },
      payload: {
        type: "expense",
        amount: 20,
        currency: "USD",
        categoryId: category?.id,
        merchant: "Updated merchant",
        note: "Changed",
        occurredAt: "2026-07-01T12:00:00.000Z"
      }
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json<{ transaction: { amount: number; merchant: string; note: string } }>().transaction).toMatchObject({
      amount: 20,
      merchant: "Updated merchant",
      note: "Changed"
    });
    await app.close();
  });
});

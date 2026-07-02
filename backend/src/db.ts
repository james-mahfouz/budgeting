import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { emptyDb } from "./defaults.js";
import type { DbData } from "./types.js";

const cloneDb = (data: DbData): DbData => ({
  users: [...data.users],
  sessions: [...data.sessions],
  categories: [...data.categories],
  transactions: [...data.transactions],
  recurringPayments: [...data.recurringPayments],
  events: [...data.events]
});

export class JsonStore {
  private data: DbData | null = null;
  private writeQueue = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async init() {
    await mkdir(dirname(this.filePath), { recursive: true });

    try {
      const contents = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(contents) as Partial<DbData>;
      this.data = {
        users: parsed.users ?? [],
        sessions: parsed.sessions ?? [],
        categories: parsed.categories?.length ? parsed.categories : emptyDb.categories,
        transactions: parsed.transactions ?? [],
        recurringPayments: parsed.recurringPayments ?? [],
        events: parsed.events ?? []
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        throw error;
      }

      this.data = cloneDb(emptyDb);
      await this.persist();
    }
  }

  get snapshot() {
    if (!this.data) {
      throw new Error("JsonStore has not been initialized");
    }

    return cloneDb(this.data);
  }

  async update(mutator: (data: DbData) => void | Promise<void>) {
    if (!this.data) {
      throw new Error("JsonStore has not been initialized");
    }

    this.writeQueue = this.writeQueue.then(async () => {
      await mutator(this.data as DbData);
      await this.persist();
    });

    await this.writeQueue;
    return this.snapshot;
  }

  private async persist() {
    if (!this.data) {
      throw new Error("JsonStore has not been initialized");
    }

    const tempFile = `${this.filePath}.tmp`;
    await writeFile(tempFile, `${JSON.stringify(this.data, null, 2)}\n`, "utf8");
    await rename(tempFile, this.filePath);
  }
}

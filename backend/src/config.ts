import "dotenv/config";
import { resolve } from "node:path";

const port = Number.parseInt(process.env.PORT ?? "4000", 10);

export const config = {
  port: Number.isFinite(port) ? port : 4000,
  host: process.env.HOST ?? "0.0.0.0",
  dataFile: resolve(process.cwd(), process.env.DATA_FILE ?? "./data/budgeting.json"),
  logLevel: process.env.LOG_LEVEL ?? "info",
  corsOrigin: process.env.CORS_ORIGIN ?? "*"
};


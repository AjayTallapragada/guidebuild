import { app } from "../src/app.js";
import { connectDatabase } from "../src/config/db.js";

let bootstrapPromise: Promise<void> | null = null;

async function ensureBootstrapped() {
  if (!bootstrapPromise) {
    bootstrapPromise = connectDatabase();
  }

  await bootstrapPromise;
}

export default async function handler(req: any, res: any) {
  await ensureBootstrapped();
  return app(req, res);
}
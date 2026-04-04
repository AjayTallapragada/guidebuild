import { connectDatabase } from "../../src/config/db.js";
import { env } from "../../src/config/env.js";
import { runAutomatedTriggerSweep } from "../../src/modules/triggers/trigger.sweep.js";

let bootstrapPromise: Promise<void> | null = null;

async function ensureBootstrapped() {
  if (!bootstrapPromise) {
    bootstrapPromise = connectDatabase();
  }

  await bootstrapPromise;
}

function isAuthorized(req: any) {
  const authHeader = String(req.headers?.authorization ?? "");
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (env.CRON_SECRET) {
    return bearerToken === env.CRON_SECRET;
  }

  return String(req.headers?.["x-vercel-cron"] ?? "") !== "";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ message: "Unauthorized cron request" });
    return;
  }

  await ensureBootstrapped();
  const result = await runAutomatedTriggerSweep();
  res.status(200).json({ status: "ok", ...result });
}

import { RowDataPacket } from "mysql2";
import { getDb } from "../../config/db.js";
import { triggerService } from "./trigger.service.js";

type ActivePolicyOwnerRow = RowDataPacket & {
  user_id: number;
};

export async function runAutomatedTriggerSweep() {
  const db = getDb();
  const [rows] = await db.query<ActivePolicyOwnerRow[]>(
    "SELECT DISTINCT user_id FROM policies WHERE status = 'active'"
  );

  const results: Array<{ userId: string; evaluated: number }> = [];

  for (const row of rows) {
    const userId = String(row.user_id);
    const evaluation = await triggerService.evaluateAutomatedTriggers(userId, userId);
    results.push({ userId, evaluated: evaluation.results.length });
  }

  return {
    usersProcessed: rows.length,
    results
  };
}

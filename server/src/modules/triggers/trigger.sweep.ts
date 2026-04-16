import { RowDataPacket } from "mysql2";
import { getDb } from "../../config/db.js";
import { triggerService } from "./trigger.service.js";

type ActivePolicyOwnerRow = RowDataPacket & {
  user_id: number;
};

type PolicySeedRow = RowDataPacket & {
  id: number;
  region: string;
};

async function seedSampleClaimsIfNeeded(userId: string) {
  const db = getDb();
  const [claimCountRows] = await db.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS count FROM claims WHERE user_id = ?",
    [userId]
  );
  const claimCount = Number(claimCountRows[0]?.count ?? 0);
  if (claimCount > 0) {
    return { seeded: false, created: 0 };
  }

  const [policyRows] = await db.query<PolicySeedRow[]>(
    "SELECT id, region FROM policies WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    [userId]
  );
  const policy = policyRows[0];
  if (!policy) {
    return { seeded: false, created: 0 };
  }

  const sampleSignals = [
    {
      eventKey: `sample-weather-${userId}`,
      triggerType: "weather" as const,
      severity: 0.86,
      weatherRiskIndex: 0.88,
      delayMinutes: 0
    },
    {
      eventKey: `sample-delay-${userId}`,
      triggerType: "delay" as const,
      severity: 0.78,
      weatherRiskIndex: 0,
      delayMinutes: 72
    }
  ];

  let created = 0;
  for (const signal of sampleSignals) {
    const result = await triggerService.ingest(userId, {
      policyId: String(policy.id),
      eventKey: signal.eventKey,
      triggerType: signal.triggerType,
      severity: signal.severity,
      scope: policy.region,
      weatherRiskIndex: signal.weatherRiskIndex,
      delayMinutes: signal.delayMinutes
    });
    if (result.triggered) {
      created += 1;
    }
  }

  return { seeded: true, created };
}

export async function runAutomatedTriggerSweep() {
  const db = getDb();
  const [rows] = await db.query<ActivePolicyOwnerRow[]>(
    "SELECT DISTINCT user_id FROM policies WHERE status = 'active'"
  );

  const results: Array<{ userId: string; evaluated: number; sampleClaimsCreated: number }> = [];

  for (const row of rows) {
    const userId = String(row.user_id);
    const sampleSeed = await seedSampleClaimsIfNeeded(userId);
    const evaluation = await triggerService.evaluateAutomatedTriggers(userId, userId);
    results.push({ userId, evaluated: evaluation.results.length, sampleClaimsCreated: sampleSeed.created });
  }

  return {
    usersProcessed: rows.length,
    results
  };
}

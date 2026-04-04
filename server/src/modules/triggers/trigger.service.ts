import { RowDataPacket, ResultSetHeader } from "mysql2";
import { getDb } from "../../config/db.js";
import { AppError } from "../../utils/appError.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import {
  accidentTelemetryAdapter,
  deliveryDelayAdapter,
  getAccidentSignal,
  getOrderFailureSignal,
  getTrafficDelaySignal,
  getWaterLoggingSignal,
  getWeatherSignal,
  weatherRiskAdapter
} from "./trigger.providers.js";

const thresholds = {
  weather: 0.65,
  delay: 0.6,
  accident: 0.55
} as const;

type PolicyRow = RowDataPacket & {
  id: number;
  coverage_limit: number;
  deductible: number;
};

type ClaimRow = RowDataPacket & {
  id: number;
  user_id: number;
  policy_id: number;
  event_key: string;
  proof_image_url: string | null;
  trigger_type: "weather" | "delay" | "accident";
  trigger_score: number;
  reason: string;
  amount: number;
  status: "triggered" | "under_review" | "approved" | "rejected" | "paid";
  created_at: Date;
  updated_at: Date;
};

function mapClaim(row: ClaimRow) {
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    policyId: String(row.policy_id),
    eventKey: row.event_key,
    proofImageUrl: row.proof_image_url ?? undefined,
    triggerType: row.trigger_type,
    triggerScore: Number(row.trigger_score),
    reason: row.reason,
    amount: Number(row.amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TriggerService {
  async ingest(userId: string, payload: {
    policyId: string;
    eventKey?: string;
    triggerType: "weather" | "delay" | "accident";
    severity: number;
    delayMinutes?: number;
    weatherRiskIndex?: number;
    collisionDetected?: boolean;
    proofImageUrl?: string;
  }) {
    const db = getDb();
    const eventKey = payload.eventKey ?? `trigger-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const [policyRows] = await db.query<PolicyRow[]>(
      "SELECT id, coverage_limit, deductible FROM policies WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1",
      [payload.policyId, userId]
    );
    const policy = policyRows[0];
    if (!policy) {
      throw new AppError("Active policy not found", 404);
    }

    const [existingClaims] = await db.query<ClaimRow[]>("SELECT * FROM claims WHERE event_key = ? LIMIT 1", [eventKey]);
    if (existingClaims.length > 0) {
      return { triggered: false, claim: mapClaim(existingClaims[0]), reason: "duplicate_event" };
    }

    const score = this.computeScore(payload);
    const threshold = thresholds[payload.triggerType];

    if (score < threshold) {
      return { triggered: false, score, threshold };
    }

    const amount = this.computePayoutAmount(Number(policy.coverage_limit), score, Number(policy.deductible));

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO claims (user_id, policy_id, event_key, trigger_type, trigger_score, reason, amount, proof_image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'under_review')`,
      [
        userId,
        payload.policyId,
        eventKey,
        payload.triggerType,
        score,
        `${payload.triggerType} parameter crossed threshold`,
        amount,
        payload.proofImageUrl ?? null
      ]
    );

    const [claimRows] = await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? LIMIT 1", [result.insertId]);
    const claim = mapClaim(claimRows[0]);

    await writeAuditEvent({
      userId,
      action: "claim.auto_triggered",
      resourceType: "claim",
      resourceId: claim._id,
      metadata: { score, threshold, triggerType: payload.triggerType, eventKey }
    });

    return { triggered: true, score, threshold, claim };
  }

  async evaluateAutomatedTriggers(userId: string, scope: string) {
    const signals = [
      getWeatherSignal(scope),
      getWaterLoggingSignal(scope),
      getTrafficDelaySignal(scope),
      getAccidentSignal(scope),
      getOrderFailureSignal(scope)
    ];

    const results = [] as Array<{ source: string; triggered: boolean; reason?: string; claimId?: string }>;
    for (const signal of signals) {
      const result = await this.ingest(userId, {
        policyId: await this.findLatestActivePolicyId(userId),
        eventKey: signal.eventKey,
        triggerType: signal.triggerType,
        severity: signal.severity,
        delayMinutes: signal.delayMinutes,
        weatherRiskIndex: signal.weatherRiskIndex,
        collisionDetected: signal.collisionDetected
      });

      results.push({
        source: signal.source,
        triggered: result.triggered,
        reason: result.reason,
        claimId: result.triggered && result.claim ? result.claim._id : undefined
      });
    }

    await writeAuditEvent({
      userId,
      action: "trigger.automated.evaluate",
      resourceType: "trigger",
      resourceId: scope,
      metadata: { evaluated: results.length }
    });

    return { scope, results };
  }

  private async findLatestActivePolicyId(userId: string) {
    const db = getDb();
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM policies WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );
    const policyId = rows[0]?.id;
    if (!policyId) {
      throw new AppError("No active policy found for automated trigger evaluation", 400);
    }
    return String(policyId);
  }

  private computeScore(payload: {
    triggerType: "weather" | "delay" | "accident";
    severity: number;
    delayMinutes?: number;
    weatherRiskIndex?: number;
    collisionDetected?: boolean;
  }) {
    if (payload.triggerType === "weather") {
      return weatherRiskAdapter({ weatherRiskIndex: payload.weatherRiskIndex, severity: payload.severity });
    }

    if (payload.triggerType === "delay") {
      return deliveryDelayAdapter({ delayMinutes: payload.delayMinutes, severity: payload.severity });
    }

    return accidentTelemetryAdapter({ collisionDetected: payload.collisionDetected, severity: payload.severity });
  }

  private computePayoutAmount(coverageLimit: number, triggerScore: number, deductible: number) {
    const gross = coverageLimit * triggerScore * 0.35;
    return Number(Math.max(10, gross - deductible).toFixed(2));
  }
}

export const triggerService = new TriggerService();

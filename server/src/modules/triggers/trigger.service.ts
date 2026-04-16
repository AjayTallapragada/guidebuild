import { RowDataPacket, ResultSetHeader } from "mysql2";
import { getDb } from "../../config/db.js";
import { AppError } from "../../utils/appError.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { payoutService } from "../payouts/payout.service.js";
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
  vehicle_type: "bike" | "scooter" | "car";
  region: string;
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
  fraud_score: number;
  fraud_flags: string | null;
  ai_recommendation: "approve_fast" | "review" | "reject";
  status: "triggered" | "under_review" | "approved" | "rejected" | "paid";
  created_at: Date;
  updated_at: Date;
};

function parseFraudFlags(value: unknown) {
  if (!value) {
    return [] as string[];
  }
  if (Array.isArray(value)) {
    return value as string[];
  }
  if (typeof value === "string") {
    return JSON.parse(value) as string[];
  }
  return [] as string[];
}

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
    fraudScore: Number(row.fraud_score ?? 0),
    fraudFlags: parseFraudFlags(row.fraud_flags),
    aiRecommendation: row.ai_recommendation ?? "review",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

type FraudReview = {
  fraudScore: number;
  fraudFlags: string[];
  aiRecommendation: "approve_fast" | "review" | "reject";
  reasoning: string;
  historicalWeatherIndex?: number;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export class TriggerService {
  async ingest(userId: string, payload: {
    policyId: string;
    eventKey?: string;
    triggerType: "weather" | "delay" | "accident";
    severity: number;
    scope?: string;
    delayMinutes?: number;
    weatherRiskIndex?: number;
    collisionDetected?: boolean;
    gpsDriftMeters?: number;
    travelSpeedKph?: number;
    proofImageUrl?: string;
  }) {
    const db = getDb();
    const eventKey = payload.eventKey ?? `trigger-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const [policyRows] = await db.query<PolicyRow[]>(
      "SELECT id, coverage_limit, deductible, vehicle_type, region FROM policies WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1",
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
    const fraudReview = this.evaluateFraud({
      triggerType: payload.triggerType,
      scope: payload.scope ?? policy.region,
      weatherRiskIndex: payload.weatherRiskIndex,
      gpsDriftMeters: payload.gpsDriftMeters,
      travelSpeedKph: payload.travelSpeedKph,
      severity: payload.severity,
      proofImageUrl: payload.proofImageUrl,
      vehicleType: policy.vehicle_type
    });

    if (score < threshold) {
      return { triggered: false, score, threshold, fraudReview };
    }

    const amount = this.computePayoutAmount(Number(policy.coverage_limit), score, Number(policy.deductible));
    const status =
      fraudReview.aiRecommendation === "approve_fast"
        ? "approved"
        : fraudReview.aiRecommendation === "reject"
          ? "rejected"
          : "under_review";
    const reason = this.composeReason(payload.triggerType, score, fraudReview);

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO claims (user_id, policy_id, event_key, trigger_type, trigger_score, reason, amount, proof_image_url, fraud_score, fraud_flags, ai_recommendation, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        payload.policyId,
        eventKey,
        payload.triggerType,
        score,
        reason,
        amount,
        payload.proofImageUrl ?? null,
        fraudReview.fraudScore,
        JSON.stringify(fraudReview.fraudFlags),
        fraudReview.aiRecommendation,
        status
      ]
    );

    const [claimRows] = await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? LIMIT 1", [result.insertId]);
    const claim = mapClaim(claimRows[0]);

    if (status === "approved") {
      await payoutService.queuePayout({
        userId,
        claimId: claim._id,
        amount: claim.amount
      });
    }

    await writeAuditEvent({
      userId,
      action: "claim.auto_triggered",
      resourceType: "claim",
      resourceId: claim._id,
      metadata: {
        score,
        threshold,
        triggerType: payload.triggerType,
        eventKey,
        fraudScore: fraudReview.fraudScore,
        fraudFlags: fraudReview.fraudFlags,
        aiRecommendation: fraudReview.aiRecommendation
      }
    });

    return { triggered: true, score, threshold, claim, fraudReview };
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

  private composeReason(
    triggerType: "weather" | "delay" | "accident",
    score: number,
    fraudReview: FraudReview
  ) {
    const baseReason = `${triggerType} disruption crossed automated threshold with score ${score.toFixed(2)}.`;
    if (fraudReview.aiRecommendation === "approve_fast") {
      return `${baseReason} AI approved for instant payout.`;
    }
    if (fraudReview.aiRecommendation === "reject") {
      return `${baseReason} Auto-rejected after fraud review: ${fraudReview.fraudFlags.join(", ")}.`;
    }
    return `${baseReason} Routed for human review due to ${fraudReview.fraudFlags.join(", ") || "moderate fraud exposure"}.`;
  }

  private evaluateFraud(input: {
    triggerType: "weather" | "delay" | "accident";
    scope: string;
    weatherRiskIndex?: number;
    gpsDriftMeters?: number;
    travelSpeedKph?: number;
    severity: number;
    proofImageUrl?: string;
    vehicleType: "bike" | "scooter" | "car";
  }): FraudReview {
    const flags: string[] = [];
    let fraudScore = 0.08;
    const historicalWeatherIndex =
      input.triggerType === "weather" ? this.getHistoricalWeatherIndex(input.scope) : undefined;

    if (
      input.triggerType === "weather" &&
      historicalWeatherIndex !== undefined &&
      input.weatherRiskIndex !== undefined &&
      input.weatherRiskIndex - historicalWeatherIndex > 0.28
    ) {
      fraudScore += 0.42;
      flags.push("weather_claim_mismatch_with_historical_baseline");
    }

    if ((input.gpsDriftMeters ?? 0) >= 250) {
      fraudScore += 0.34;
      flags.push("gps_spoofing_suspected");
    }

    const vehicleSpeedLimit = input.vehicleType === "car" ? 120 : 85;
    if ((input.travelSpeedKph ?? 0) > vehicleSpeedLimit) {
      fraudScore += 0.22;
      flags.push("route_speed_outlier");
    }

    if (!input.proofImageUrl && input.severity >= 0.9) {
      fraudScore += 0.14;
      flags.push("missing_supporting_proof");
    }

    const aiRecommendation =
      fraudScore >= 0.75 ? "reject" : fraudScore >= 0.4 ? "review" : "approve_fast";

    return {
      fraudScore: Number(clamp(fraudScore).toFixed(2)),
      fraudFlags: flags,
      aiRecommendation,
      reasoning:
        aiRecommendation === "approve_fast"
          ? "Low fraud exposure, eligible for instant payout."
          : aiRecommendation === "reject"
            ? "High-confidence fraud pattern detected."
            : "Needs human review before payout.",
      historicalWeatherIndex
    };
  }

  private getHistoricalWeatherIndex(scope: string) {
    const normalized = scope.toLowerCase().trim();
    let seed = 0;
    for (let index = 0; index < normalized.length; index += 1) {
      seed = (seed * 33 + normalized.charCodeAt(index)) % 1000;
    }
    return Number((0.18 + seed / 2000).toFixed(2));
  }
}

export const triggerService = new TriggerService();

import { AppError } from "../../utils/appError.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../../config/db.js";
import { AiRecommendation, ClaimStatus } from "./claim.model.js";
import { writeAuditEvent } from "../audit/audit.service.js";
import { payoutService } from "../payouts/payout.service.js";

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
  ai_recommendation: AiRecommendation;
  status: ClaimStatus;
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

export function mapClaim(row: ClaimRow) {
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

export class ClaimService {
  async list(userId: string, role: "worker" | "admin") {
    const db = getDb();
    const [rows] =
      role === "admin"
        ? await db.query<ClaimRow[]>("SELECT * FROM claims ORDER BY created_at DESC")
        : await db.query<ClaimRow[]>("SELECT * FROM claims WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    return rows.map(mapClaim);
  }

  async getById(userId: string, role: "worker" | "admin", claimId: string) {
    const db = getDb();
    const [rows] =
      role === "admin"
        ? await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? LIMIT 1", [claimId])
        : await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? AND user_id = ? LIMIT 1", [claimId, userId]);
    if (rows.length === 0) {
      throw new AppError("Claim not found", 404);
    }
    return mapClaim(rows[0]);
  }

  async createByUser(userId: string, payload: {
    policyId: string;
    triggerType: "weather" | "delay" | "accident";
    reason: string;
    amount: number;
    eventKey?: string;
    proofImageUrl?: string;
    fraudScore?: number;
    fraudFlags?: string[];
    aiRecommendation?: AiRecommendation;
  }) {
    const db = getDb();
    const [subscriptionRows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM policies WHERE id = ? AND user_id = ? AND status = 'active' LIMIT 1",
      [payload.policyId, userId]
    );
    if (subscriptionRows.length === 0) {
      throw new AppError("No active subscription for this policy", 400);
    }

    const eventKey = payload.eventKey ?? `manual-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO claims (user_id, policy_id, event_key, trigger_type, trigger_score, reason, amount, proof_image_url, fraud_score, fraud_flags, ai_recommendation, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'under_review')`,
      [
        userId,
        payload.policyId,
        eventKey,
        payload.triggerType,
        0.5,
        payload.reason,
        payload.amount,
        payload.proofImageUrl ?? null,
        payload.fraudScore ?? 0.2,
        JSON.stringify(payload.fraudFlags ?? []),
        payload.aiRecommendation ?? "review"
      ]
    );

    const claim = await this.getById(userId, "worker", String(result.insertId));

    await writeAuditEvent({
      userId,
      action: "claim.created",
      resourceType: "claim",
      resourceId: claim._id,
      metadata: { triggerType: payload.triggerType, aiRecommendation: payload.aiRecommendation ?? "review" }
    });

    return claim;
  }

  async getSubscriptionStatus(userId: string) {
    const db = getDb();
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS activeCount FROM policies WHERE user_id = ? AND status = 'active'",
      [userId]
    );
    const activeCount = Number(rows[0]?.activeCount ?? 0);
    return {
      hasActiveSubscription: activeCount > 0,
      activeCount
    };
  }

  async requestPaycheck(userId: string, claimId: string) {
    const claim = await this.getById(userId, "worker", claimId);
    if (claim.status !== "approved" && claim.status !== "paid") {
      throw new AppError("Claim is not approved for payout", 400);
    }

    const payout = await payoutService.queuePayout({
      userId,
      claimId: claim._id,
      amount: claim.amount
    });

    await writeAuditEvent({
      userId,
      action: "claim.paycheck.requested",
      resourceType: "claim",
      resourceId: claim._id,
      metadata: { payoutId: payout._id }
    });

    return {
      claim,
      payout
    };
  }

  async adminDecision(adminUserId: string, claimId: string, status: "approved" | "rejected") {
    const db = getDb();
    const [existingRows] = await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? LIMIT 1", [claimId]);
    if (existingRows.length === 0) {
      throw new AppError("Claim not found", 404);
    }

    const existingClaim = mapClaim(existingRows[0]);
    if (existingClaim.status !== "under_review" && existingClaim.status !== "triggered") {
      throw new AppError("Claim decision already finalized", 400);
    }

    await db.execute<ResultSetHeader>("UPDATE claims SET status = ? WHERE id = ?", [status, claimId]);

    const [rows] = await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? LIMIT 1", [claimId]);
    const claim = mapClaim(rows[0]);

    if (status === "approved") {
      await payoutService.queuePayout({
        userId: claim.userId,
        claimId: claim._id,
        amount: claim.amount
      });
    }

    await writeAuditEvent({
      userId: adminUserId,
      action: "claim.admin.decision",
      resourceType: "claim",
      resourceId: claim._id,
      metadata: { status }
    });

    return claim;
  }

  async clearByAdmin(adminUserId: string, claimId: string) {
    const db = getDb();
    const [rows] = await db.query<ClaimRow[]>("SELECT * FROM claims WHERE id = ? LIMIT 1", [claimId]);
    if (rows.length === 0) {
      throw new AppError("Claim not found", 404);
    }

    await db.execute<ResultSetHeader>("DELETE FROM claims WHERE id = ?", [claimId]);

    await writeAuditEvent({
      userId: adminUserId,
      action: "claim.admin.cleared",
      resourceType: "claim",
      resourceId: claimId,
      metadata: { previousStatus: rows[0].status }
    });

    return { success: true };
  }
}

export const claimService = new ClaimService();

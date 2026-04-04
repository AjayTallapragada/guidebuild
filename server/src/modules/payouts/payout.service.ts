import { AppError } from "../../utils/appError.js";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getDb } from "../../config/db.js";
import { writeAuditEvent } from "../audit/audit.service.js";

type PayoutRow = RowDataPacket & {
  id: number;
  user_id: number;
  claim_id: number;
  amount: number;
  status: "queued" | "processed";
  payment_mode: "upi" | "bank_account" | "online_wallet" | null;
  payment_handle: string | null;
  created_at: Date;
  updated_at: Date;
};

function mapPayout(row: PayoutRow) {
  return {
    _id: String(row.id),
    userId: String(row.user_id),
    claimId: String(row.claim_id),
    amount: Number(row.amount),
    status: row.status,
    paymentMode: row.payment_mode ?? undefined,
    paymentHandle: row.payment_handle ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class PayoutService {
  async queuePayout(input: { userId: string; claimId: string; amount: number }) {
    const db = getDb();
    const [existingRows] = await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE claim_id = ? LIMIT 1", [
      input.claimId
    ]);
    if (existingRows.length > 0) {
      return mapPayout(existingRows[0]);
    }

    const [result] = await db.execute<ResultSetHeader>(
      "INSERT INTO payouts (user_id, claim_id, amount, status) VALUES (?, ?, ?, 'queued')",
      [input.userId, input.claimId, input.amount]
    );
    const [rows] = await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE id = ? LIMIT 1", [result.insertId]);
    const payout = mapPayout(rows[0]);

    await writeAuditEvent({
      userId: input.userId,
      action: "payout.queued",
      resourceType: "payout",
      resourceId: payout._id,
      metadata: { claimId: input.claimId, amount: input.amount }
    });

    return payout;
  }

  async processQueuedPayouts() {
    const db = getDb();
    const [queued] = await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE status = 'queued'");

    for (const payout of queued) {
      await db.execute("UPDATE payouts SET status = 'processed' WHERE id = ?", [payout.id]);
      await db.execute("UPDATE claims SET status = 'paid' WHERE id = ?", [payout.claim_id]);

      await writeAuditEvent({
        userId: String(payout.user_id),
        action: "payout.processed",
        resourceType: "payout",
        resourceId: String(payout.id),
        metadata: { amount: Number(payout.amount) }
      });
    }

    return { processedCount: queued.length };
  }

  async list(userId: string, role: "worker" | "admin") {
    const db = getDb();
    const [rows] =
      role === "admin"
        ? await db.query<PayoutRow[]>("SELECT * FROM payouts ORDER BY created_at DESC")
        : await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    return rows.map(mapPayout);
  }

  async payByMode(
    userId: string,
    payoutId: string,
    input: { paymentMode: "upi" | "bank_account" | "online_wallet"; paymentHandle?: string }
  ) {
    const db = getDb();
    const [rows] = await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE id = ? AND user_id = ? LIMIT 1", [
      payoutId,
      userId
    ]);
    if (rows.length === 0) {
      throw new AppError("Payout not found", 404);
    }

    const payout = mapPayout(rows[0]);
    if (payout.status === "processed") {
      return payout;
    }

    await db.execute<ResultSetHeader>(
      "UPDATE payouts SET status = 'processed', payment_mode = ?, payment_handle = ? WHERE id = ? AND user_id = ?",
      [input.paymentMode, input.paymentHandle ?? null, payoutId, userId]
    );
    await db.execute<ResultSetHeader>("UPDATE claims SET status = 'paid' WHERE id = ?", [payout.claimId]);

    const [updatedRows] = await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE id = ? AND user_id = ? LIMIT 1", [
      payoutId,
      userId
    ]);
    const updatedPayout = mapPayout(updatedRows[0]);

    await writeAuditEvent({
      userId,
      action: "payout.paid.by_mode",
      resourceType: "payout",
      resourceId: updatedPayout._id,
      metadata: { paymentMode: input.paymentMode }
    });

    return updatedPayout;
  }

  async getById(userId: string, payoutId: string) {
    const db = getDb();
    const [rows] = await db.query<PayoutRow[]>("SELECT * FROM payouts WHERE id = ? AND user_id = ? LIMIT 1", [
      payoutId,
      userId
    ]);
    if (rows.length === 0) {
      throw new AppError("Payout not found", 404);
    }
    return mapPayout(rows[0]);
  }
}

export const payoutService = new PayoutService();

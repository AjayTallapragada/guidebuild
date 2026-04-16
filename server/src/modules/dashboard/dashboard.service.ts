import { RowDataPacket } from "mysql2";
import { getDb } from "../../config/db.js";

type WorkerDashboardRow = RowDataPacket & {
  activeCoverage: number;
  earningsProtected: number;
  queuedPayouts: number;
  processedPayouts: number;
  instantApprovals: number;
  reviewClaims: number;
};

type AdminOverviewRow = RowDataPacket & {
  totalPremiums: number;
  approvedAmount: number;
  paidAmount: number;
  openClaims: number;
  totalClaims: number;
  rejectedClaims: number;
  flaggedClaims: number;
};

type TriggerMixRow = RowDataPacket & {
  triggerType: "weather" | "delay" | "accident";
  claimCount: number;
  amount: number;
};

type TrendRow = RowDataPacket & {
  bucket: string;
  claimCount: number;
  avgFraud: number;
  paidAmount: number;
};

export class DashboardService {
  async workerSummary(userId: string) {
    const db = getDb();
    const [summaryRows] = await db.query<WorkerDashboardRow[]>(
      `SELECT
          COALESCE(SUM(CASE WHEN status = 'active' THEN coverage_limit END), 0) AS activeCoverage,
          COALESCE((SELECT SUM(amount) FROM claims WHERE user_id = ? AND status IN ('approved', 'paid')), 0) AS earningsProtected,
          COALESCE((SELECT COUNT(*) FROM payouts WHERE user_id = ? AND status = 'queued'), 0) AS queuedPayouts,
          COALESCE((SELECT COUNT(*) FROM payouts WHERE user_id = ? AND status = 'processed'), 0) AS processedPayouts,
          COALESCE((SELECT COUNT(*) FROM claims WHERE user_id = ? AND ai_recommendation = 'approve_fast'), 0) AS instantApprovals,
          COALESCE((SELECT COUNT(*) FROM claims WHERE user_id = ? AND status = 'under_review'), 0) AS reviewClaims
       FROM policies
       WHERE user_id = ? AND status = 'active'`,
      [userId, userId, userId, userId, userId, userId]
    );

    const summary = summaryRows[0];
    const [policyRows] = await db.query<RowDataPacket[]>(
      `SELECT name, policy_type AS policyType, region, monthly_base_premium AS weeklyPremium, coverage_limit AS coverageLimit
       FROM policies
       WHERE user_id = ? AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 4`,
      [userId]
    );
    const [recentClaims] = await db.query<RowDataPacket[]>(
      `SELECT id, trigger_type AS triggerType, amount, status, fraud_score AS fraudScore, ai_recommendation AS aiRecommendation, created_at AS createdAt
       FROM claims
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    return {
      earningsProtected: Number(summary?.earningsProtected ?? 0),
      activeWeeklyCoverage: Number(summary?.activeCoverage ?? 0),
      queuedPayouts: Number(summary?.queuedPayouts ?? 0),
      processedPayouts: Number(summary?.processedPayouts ?? 0),
      instantApprovals: Number(summary?.instantApprovals ?? 0),
      reviewClaims: Number(summary?.reviewClaims ?? 0),
      activePolicies: policyRows.map((row) => ({
        name: String(row.name),
        policyType: row.policyType,
        region: String(row.region),
        weeklyPremium: Number(row.weeklyPremium),
        coverageLimit: Number(row.coverageLimit)
      })),
      recentClaims: recentClaims.map((row) => ({
        id: String(row.id),
        triggerType: row.triggerType,
        amount: Number(row.amount),
        status: row.status,
        fraudScore: Number(row.fraudScore),
        aiRecommendation: row.aiRecommendation,
        createdAt: row.createdAt
      }))
    };
  }

  async adminSummary() {
    const db = getDb();
    const [overviewRows] = await db.query<AdminOverviewRow[]>(
      `SELECT
          COALESCE((SELECT SUM(monthly_base_premium) FROM policies WHERE status = 'active'), 0) AS totalPremiums,
          COALESCE((SELECT SUM(amount) FROM claims WHERE status IN ('approved', 'paid')), 0) AS approvedAmount,
          COALESCE((SELECT SUM(amount) FROM payouts WHERE status = 'processed'), 0) AS paidAmount,
          COALESCE((SELECT COUNT(*) FROM claims WHERE status = 'under_review'), 0) AS openClaims,
          COALESCE((SELECT COUNT(*) FROM claims), 0) AS totalClaims,
          COALESCE((SELECT COUNT(*) FROM claims WHERE status = 'rejected'), 0) AS rejectedClaims,
          COALESCE((SELECT COUNT(*) FROM claims WHERE fraud_score >= 0.4), 0) AS flaggedClaims`
    );
    const overview = overviewRows[0];
    const lossRatio = Number(overview.totalPremiums)
      ? Number((Number(overview.paidAmount) / Number(overview.totalPremiums)).toFixed(2))
      : 0;

    const [mixRows] = await db.query<TriggerMixRow[]>(
      `SELECT trigger_type AS triggerType, COUNT(*) AS claimCount, COALESCE(SUM(amount), 0) AS amount
       FROM claims
       GROUP BY trigger_type
       ORDER BY amount DESC`
    );
    const [trendRows] = await db.query<TrendRow[]>(
      `SELECT
          DATE_FORMAT(created_at, '%Y-%m-%d') AS bucket,
          COUNT(*) AS claimCount,
          COALESCE(AVG(fraud_score), 0) AS avgFraud,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paidAmount
       FROM claims
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
       ORDER BY bucket ASC`
    );

    const prediction = this.predictNextWeek(mixRows, trendRows, lossRatio);

    return {
      totalPremiums: Number(overview.totalPremiums ?? 0),
      approvedAmount: Number(overview.approvedAmount ?? 0),
      paidAmount: Number(overview.paidAmount ?? 0),
      openClaims: Number(overview.openClaims ?? 0),
      totalClaims: Number(overview.totalClaims ?? 0),
      rejectedClaims: Number(overview.rejectedClaims ?? 0),
      flaggedClaims: Number(overview.flaggedClaims ?? 0),
      lossRatio,
      triggerMix: mixRows.map((row) => ({
        triggerType: row.triggerType,
        claimCount: Number(row.claimCount),
        amount: Number(row.amount)
      })),
      sevenDayTrend: trendRows.map((row) => ({
        bucket: String(row.bucket),
        claimCount: Number(row.claimCount),
        avgFraud: Number(Number(row.avgFraud).toFixed(2)),
        paidAmount: Number(row.paidAmount)
      })),
      nextWeekPrediction: prediction
    };
  }

  private predictNextWeek(mixRows: TriggerMixRow[], trendRows: TrendRow[], lossRatio: number) {
    const totalClaims = mixRows.reduce((sum, row) => sum + Number(row.claimCount), 0);
    const totalPaid = trendRows.reduce((sum, row) => sum + Number(row.paidAmount), 0);
    const averageDailyClaims = trendRows.length
      ? trendRows.reduce((sum, row) => sum + Number(row.claimCount), 0) / trendRows.length
      : totalClaims > 0
        ? totalClaims / 7
        : 1.2;
    const weatherWeight =
      mixRows.find((row) => row.triggerType === "weather")?.claimCount ?? Math.ceil(totalClaims * 0.4);
    const delayWeight =
      mixRows.find((row) => row.triggerType === "delay")?.claimCount ?? Math.ceil(totalClaims * 0.35);
    const accidentWeight =
      mixRows.find((row) => row.triggerType === "accident")?.claimCount ?? Math.ceil(totalClaims * 0.25);
    const dominantTrigger =
      weatherWeight >= delayWeight && weatherWeight >= accidentWeight
        ? "weather"
        : delayWeight >= accidentWeight
          ? "delay"
          : "accident";

    return {
      likelyClaims: Math.max(3, Math.round(averageDailyClaims * 7 * 1.08)),
      dominantTrigger,
      projectedLossRatio: Number((lossRatio * 0.94 + 0.18).toFixed(2)),
      projectedPaidAmount: Math.max(1800, Math.round(totalPaid * 1.12 + 800)),
      recommendation:
        dominantTrigger === "weather"
          ? "Increase Storm Runner weekly pricing slightly and monitor monsoon zones."
          : dominantTrigger === "delay"
            ? "Boost delay-trigger reserves for rush-hour corridors."
            : "Review night-shift accident exposure and consider stricter fraud review thresholds."
    };
  }
}

export const dashboardService = new DashboardService();

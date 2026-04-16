import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { AdminDashboardSummary, DashboardSummary, WorkerDashboardSummary } from "../../types";
import { useAuth } from "../../context/AuthContext";

function currency(value: number) {
  return `INR ${value.toFixed(0)}`;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      setLoading(true);
      try {
        const response = await apiClient.get<DashboardSummary>("/dashboard/summary");
        setSummary(response.data);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  if (loading) {
    return (
      <section className="page">
        <div className="card">
          <h1>Loading dashboard...</h1>
        </div>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="page">
        <div className="card">
          <h1>Dashboard unavailable</h1>
        </div>
      </section>
    );
  }

  return summary.role === "admin"
    ? <AdminDashboard userName={user?.fullName ?? "Admin"} summary={summary} />
    : <WorkerDashboard userName={user?.fullName ?? "Worker"} summary={summary} />;
}

function WorkerDashboard({ userName, summary }: { userName: string; summary: WorkerDashboardSummary }) {
  return (
    <section className="page">
      <div className="hero-panel worker">
        <div>
          <p className="eyebrow">Perfect for your worker</p>
          <h1>{userName}, your weekly earnings shield is live.</h1>
          <p>
            ParcelShield keeps weather, delay, and accident coverage running in the background so a bad shift
            does not wipe out the week.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{currency(summary.earningsProtected)}</strong>
            <span>Earnings protected</span>
          </div>
          <div>
            <strong>{currency(summary.activeWeeklyCoverage)}</strong>
            <span>Active weekly coverage</span>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="metric-card">
          <span>Instant approvals</span>
          <strong>{summary.instantApprovals}</strong>
          <p>Low-risk claims auto-approved by the fraud engine.</p>
        </article>
        <article className="metric-card">
          <span>Queued payouts</span>
          <strong>{summary.queuedPayouts}</strong>
          <p>Ready to move through the payout gateway simulator.</p>
        </article>
        <article className="metric-card">
          <span>Processed payouts</span>
          <strong>{summary.processedPayouts}</strong>
          <p>Already transferred through test payout rails.</p>
        </article>
        <article className="metric-card">
          <span>Review claims</span>
          <strong>{summary.reviewClaims}</strong>
          <p>Claims that need a human check before release.</p>
        </article>
      </div>

      <div className="cards-grid dashboard-grid">
        <article className="card">
          <h2>Active Weekly Cover</h2>
          <div className="list-stack">
            {summary.activePolicies.map((policy) => (
              <div className="list-item compact" key={`${policy.name}-${policy.region}`}>
                <div>
                  <h3>{policy.name}</h3>
                  <p>{policy.policyType} | {policy.region}</p>
                </div>
                <div className="metric-chip">
                  <strong>{currency(policy.coverageLimit)}</strong>
                  <span>{currency(policy.weeklyPremium)}/week</span>
                </div>
              </div>
            ))}
            {summary.activePolicies.length === 0 && <p>No active protection yet. Buy a prepaid policy to activate coverage.</p>}
          </div>
        </article>

        <article className="card accent">
          <h2>Recent AI Decisions</h2>
          <div className="list-stack">
            {summary.recentClaims.map((claim) => (
              <div className="list-item compact dark" key={claim.id}>
                <div>
                  <h3>{claim.triggerType.toUpperCase()} claim</h3>
                  <p>{new Date(claim.createdAt).toLocaleString()}</p>
                </div>
                <div className="metric-chip dark">
                  <strong>{currency(claim.amount)}</strong>
                  <span>{claim.aiRecommendation} | fraud {claim.fraudScore.toFixed(2)}</span>
                </div>
              </div>
            ))}
            {summary.recentClaims.length === 0 && <p>No claims created yet. Simulate a disruption from the Claims page.</p>}
          </div>
        </article>
      </div>
    </section>
  );
}

function AdminDashboard({ userName, summary }: { userName: string; summary: AdminDashboardSummary }) {
  return (
    <section className="page">
      <div className="hero-panel admin">
        <div>
          <p className="eyebrow">Insurer command center</p>
          <h1>{userName}, your predictive claims desk is ready.</h1>
          <p>
            Track portfolio loss ratio, monitor fraud pressure, and spot which disruption type is most likely to
            drive next week&apos;s claim volume.
          </p>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{summary.lossRatio.toFixed(2)}</strong>
            <span>Loss ratio</span>
          </div>
          <div>
            <strong>{summary.nextWeekPrediction.likelyClaims}</strong>
            <span>Predicted next week claims</span>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <article className="metric-card">
          <span>Collected premiums</span>
          <strong>{currency(summary.totalPremiums)}</strong>
          <p>Active weekly pricing currently on-book.</p>
        </article>
        <article className="metric-card">
          <span>Approved exposure</span>
          <strong>{currency(summary.approvedAmount)}</strong>
          <p>Total claims approved or already paid.</p>
        </article>
        <article className="metric-card">
          <span>Flagged claims</span>
          <strong>{summary.flaggedClaims}</strong>
          <p>Fraud score at or above manual-review threshold.</p>
        </article>
        <article className="metric-card">
          <span>Open review queue</span>
          <strong>{summary.openClaims}</strong>
          <p>Claims still waiting on human intervention.</p>
        </article>
      </div>

      <div className="cards-grid dashboard-grid">
        <article className="card">
          <h2>Trigger Mix</h2>
          <div className="list-stack">
            {summary.triggerMix.map((item) => (
              <div className="list-item compact" key={item.triggerType}>
                <div>
                  <h3>{item.triggerType.toUpperCase()}</h3>
                  <p>{item.claimCount} claims</p>
                </div>
                <div className="metric-chip">
                  <strong>{currency(item.amount)}</strong>
                  <span>total exposure</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Seven Day Fraud Trend</h2>
          <div className="list-stack">
            {summary.sevenDayTrend.map((day) => (
              <div className="list-item compact" key={day.bucket}>
                <div>
                  <h3>{day.bucket}</h3>
                  <p>{day.claimCount} claims processed</p>
                </div>
                <div className="metric-chip">
                  <strong>{day.avgFraud.toFixed(2)}</strong>
                  <span>avg fraud | {currency(day.paidAmount)}</span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card accent">
          <h2>Next Week Prediction</h2>
          <p>Dominant trigger expected: {summary.nextWeekPrediction.dominantTrigger.toUpperCase()}</p>
          <p>Projected paid amount: {currency(summary.nextWeekPrediction.projectedPaidAmount)}</p>
          <p>Projected loss ratio: {summary.nextWeekPrediction.projectedLossRatio.toFixed(2)}</p>
          <p>{summary.nextWeekPrediction.recommendation}</p>
        </article>
      </div>
    </section>
  );
}

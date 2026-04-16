import { useEffect, useState } from "react";
import axios from "axios";
import { apiClient } from "../../services/apiClient";
import { Claim, Policy } from "../../types";
import { useAuth } from "../../context/AuthContext";

type AdminDecisionStatus = "approved" | "rejected";

type TriggerForm = {
  policyId: string;
  triggerType: "weather" | "delay" | "accident";
  severity: number;
  scope: string;
  delayMinutes: number;
  weatherRiskIndex: number;
  collisionDetected: boolean;
  gpsDriftMeters: number;
  travelSpeedKph: number;
  proofImageUrl: string;
};

const initialTriggerForm: TriggerForm = {
  policyId: "",
  triggerType: "weather",
  severity: 0.82,
  scope: "Bengaluru Central",
  delayMinutes: 45,
  weatherRiskIndex: 0.78,
  collisionDetected: false,
  gpsDriftMeters: 32,
  travelSpeedKph: 38,
  proofImageUrl: ""
};

export function ClaimsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");
  const [decisionLoadingClaimId, setDecisionLoadingClaimId] = useState<string>("");
  const [triggerForm, setTriggerForm] = useState<TriggerForm>(initialTriggerForm);
  const [simulateLoading, setSimulateLoading] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);

  async function load() {
    const claimResponse = await apiClient.get<Claim[]>("/claims");
    setClaims(claimResponse.data);

    if (!isAdmin) {
      const policyResponse = await apiClient.get<Policy[]>("/policies/mine");
      const activePolicies = policyResponse.data.filter((policy) => policy.status === "active");
      setPolicies(activePolicies);
      setTriggerForm((current) => ({
        ...current,
        policyId: current.policyId || activePolicies[0]?._id || ""
      }));
    }
  }

  useEffect(() => {
    void load();
    // `isAdmin` controls whether worker-only policy data is fetched.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function adminDecision(claimId: string, status: AdminDecisionStatus) {
    setDecisionLoadingClaimId(claimId);
    setDecisionFeedback("");
    try {
      await apiClient.patch(`/claims/${claimId}/status`, { status });
      setDecisionFeedback(`Claim ${status} successfully.`);
      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setDecisionFeedback(error.response?.data?.message ?? "Unable to update claim status.");
      } else {
        setDecisionFeedback("Unable to update claim status.");
      }
    } finally {
      setDecisionLoadingClaimId("");
    }
  }

  async function clearClaim(claimId: string) {
    setDecisionLoadingClaimId(claimId);
    setDecisionFeedback("");
    try {
      await apiClient.delete(`/claims/${claimId}`);
      setDecisionFeedback("Claim cleared successfully.");
      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setDecisionFeedback(error.response?.data?.message ?? "Unable to clear claim.");
      } else {
        setDecisionFeedback("Unable to clear claim.");
      }
    } finally {
      setDecisionLoadingClaimId("");
    }
  }

  async function simulateClaim() {
    setSimulateLoading(true);
    setDecisionFeedback("");
    try {
      const response = await apiClient.post("/triggers/ingest", {
        policyId: triggerForm.policyId,
        triggerType: triggerForm.triggerType,
        severity: Number(triggerForm.severity),
        scope: triggerForm.scope,
        delayMinutes: Number(triggerForm.delayMinutes),
        weatherRiskIndex: Number(triggerForm.weatherRiskIndex),
        collisionDetected: triggerForm.collisionDetected,
        gpsDriftMeters: Number(triggerForm.gpsDriftMeters),
        travelSpeedKph: Number(triggerForm.travelSpeedKph),
        proofImageUrl: triggerForm.proofImageUrl.trim() || undefined
      });
      if (response.data.triggered) {
        setDecisionFeedback(
          `AI created a ${response.data.claim.status} claim with ${response.data.fraudReview.aiRecommendation} recommendation.`
        );
      } else {
        setDecisionFeedback("Signal stayed below payout threshold. Try increasing severity or delay.");
      }
      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setDecisionFeedback(error.response?.data?.message ?? "Unable to simulate claim.");
      } else {
        setDecisionFeedback("Unable to simulate claim.");
      }
    } finally {
      setSimulateLoading(false);
    }
  }

  async function runAutomatedSweep() {
    setSweepLoading(true);
    setDecisionFeedback("");
    try {
      const response = await apiClient.post("/triggers/evaluate", { scope: triggerForm.scope });
      const triggeredCount = response.data.results.filter((result: { triggered: boolean }) => result.triggered).length;
      setDecisionFeedback(`Automated sweep completed. ${triggeredCount} trigger(s) crossed threshold.`);
      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setDecisionFeedback(error.response?.data?.message ?? "Unable to run automated sweep.");
      } else {
        setDecisionFeedback("Unable to run automated sweep.");
      }
    } finally {
      setSweepLoading(false);
    }
  }

  function getStatusLabel(status: Claim["status"]) {
    if (status === "under_review" || status === "triggered") {
      return "pending";
    }
    return status;
  }

  return (
    <section className={`page ${isAdmin ? "" : "two-col"}`}>
      {!isAdmin && (
        <div className="card">
          <h1>Simulate a disruption</h1>
          <p>
            Trigger a fake rainstorm, delay spike, or accident event to test AI approval, fraud checks,
            and payout readiness.
          </p>
          <div className="stack-form">
            <label>Active Policy
              <select
                value={triggerForm.policyId}
                onChange={(event) => setTriggerForm((current) => ({ ...current, policyId: event.target.value }))}
              >
                {policies.map((policy) => (
                  <option key={policy._id} value={policy._id}>
                    {policy.name}
                  </option>
                ))}
              </select>
            </label>
            <label>Scenario scope
              <input
                value={triggerForm.scope}
                onChange={(event) => setTriggerForm((current) => ({ ...current, scope: event.target.value }))}
                placeholder="e.g. Bengaluru Central"
              />
            </label>
            <label>Trigger Type
              <select
                value={triggerForm.triggerType}
                onChange={(event) =>
                  setTriggerForm((current) => ({
                    ...current,
                    triggerType: event.target.value as TriggerForm["triggerType"]
                  }))}
              >
                <option value="weather">Weather</option>
                <option value="delay">Delay</option>
                <option value="accident">Accident</option>
              </select>
            </label>
            <label>Severity (0-1)
              <input
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={triggerForm.severity}
                onChange={(event) => setTriggerForm((current) => ({ ...current, severity: Number(event.target.value) }))}
              />
            </label>
            <label>Weather index (0-1)
              <input
                type="number"
                min={0}
                max={1}
                step="0.01"
                value={triggerForm.weatherRiskIndex}
                onChange={(event) => setTriggerForm((current) => ({ ...current, weatherRiskIndex: Number(event.target.value) }))}
              />
            </label>
            <label>Delay minutes
              <input
                type="number"
                min={0}
                value={triggerForm.delayMinutes}
                onChange={(event) => setTriggerForm((current) => ({ ...current, delayMinutes: Number(event.target.value) }))}
              />
            </label>
            <label>GPS drift meters
              <input
                type="number"
                min={0}
                value={triggerForm.gpsDriftMeters}
                onChange={(event) => setTriggerForm((current) => ({ ...current, gpsDriftMeters: Number(event.target.value) }))}
              />
            </label>
            <label>Travel speed KPH
              <input
                type="number"
                min={0}
                value={triggerForm.travelSpeedKph}
                onChange={(event) => setTriggerForm((current) => ({ ...current, travelSpeedKph: Number(event.target.value) }))}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={triggerForm.collisionDetected}
                onChange={(event) => setTriggerForm((current) => ({ ...current, collisionDetected: event.target.checked }))}
              />
              Accident telemetry detected
            </label>
            <label>Proof image URL (optional)
              <input
                value={triggerForm.proofImageUrl}
                onChange={(event) => setTriggerForm((current) => ({ ...current, proofImageUrl: event.target.value }))}
                placeholder="https://..."
              />
            </label>
            <div className="inline-actions">
              <button type="button" onClick={simulateClaim} disabled={simulateLoading || !triggerForm.policyId}>
                {simulateLoading ? "Running AI..." : "Simulate AI claim"}
              </button>
              <button type="button" onClick={runAutomatedSweep} disabled={sweepLoading || !triggerForm.policyId}>
                {sweepLoading ? "Sweeping..." : "Run automated sweep"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {isAdmin ? (
          <>
            <h1>Claim Review (Admin)</h1>
            <p>Review pending claims, inspect AI fraud flags, and decide whether to approve or reject.</p>
            {decisionFeedback && <p>{decisionFeedback}</p>}
          </>
        ) : (
          <>
            <h1>My Claims</h1>
            <p>AI decisions, fraud scoring, and instant-approval status all show up here.</p>
            {decisionFeedback && <p>{decisionFeedback}</p>}
          </>
        )}

        <div className="list-stack">
          {claims.map((claim) => (
            <article className="list-item claims-item" key={claim._id}>
              <div>
                <h3>{claim.triggerType.toUpperCase()} trigger</h3>
                <p>{claim.reason}</p>
                <p>Score {claim.triggerScore.toFixed(2)} | Amount INR {claim.amount.toFixed(2)}</p>
                <p>Fraud score {claim.fraudScore.toFixed(2)} | AI {claim.aiRecommendation}</p>
                {claim.fraudFlags.length > 0 && <p>Flags: {claim.fraudFlags.join(", ")}</p>}
                {claim.proofImageUrl && (
                  <p>
                    <a href={claim.proofImageUrl} target="_blank" rel="noreferrer">View proof image</a>
                  </p>
                )}
                <span className={`status ${claim.status}`}>{getStatusLabel(claim.status)}</span>
              </div>
              {isAdmin && (
                <div className="inline-actions">
                  {(claim.status === "under_review" || claim.status === "triggered") && (
                    <>
                      <button type="button" onClick={() => adminDecision(claim._id, "approved")} disabled={decisionLoadingClaimId === claim._id}>
                        {decisionLoadingClaimId === claim._id ? "Saving..." : "Approve"}
                      </button>
                      <button type="button" onClick={() => adminDecision(claim._id, "rejected")} disabled={decisionLoadingClaimId === claim._id}>
                        {decisionLoadingClaimId === claim._id ? "Saving..." : "Reject"}
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => clearClaim(claim._id)} disabled={decisionLoadingClaimId === claim._id}>
                    {decisionLoadingClaimId === claim._id ? "Saving..." : "Clear Claim"}
                  </button>
                </div>
              )}
            </article>
          ))}
          {claims.length === 0 && <p>No claims yet.</p>}
        </div>
      </div>
    </section>
  );
}

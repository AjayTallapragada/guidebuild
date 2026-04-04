import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Claim, Policy } from "../../types";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

const riskLevels = ["Low", "Medium", "High"] as const;
const riskScoreMap = [0.3, 0.6, 0.9] as const;

type TriggerIngestResponse = {
  triggered: boolean;
  reason?: string;
  score?: number;
  threshold?: number;
};

type AdminDecisionStatus = "approved" | "rejected";

export function ClaimsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [triggerFeedback, setTriggerFeedback] = useState<string>("");
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");
  const [decisionLoadingClaimId, setDecisionLoadingClaimId] = useState<string>("");
  const [form, setForm] = useState({
    policyId: "",
    eventKey: "",
    proofImageUrl: "",
    triggerType: "weather",
    severity: 0.8,
    delayMinutes: 45,
    weatherRiskIndex: 0.7,
    collisionDetected: false
  });

  function toLevelIndex(value: number) {
    const nearest = riskScoreMap.reduce((bestIndex, score, index) => {
      return Math.abs(score - value) < Math.abs(riskScoreMap[bestIndex] - value) ? index : bestIndex;
    }, 0);
    return nearest;
  }

  function getPolicyTypeById(policyId: string, sourcePolicies: Policy[]) {
    return sourcePolicies.find((policy) => policy._id === policyId)?.policyType;
  }

  async function load() {
    if (isAdmin) {
      const claimResponse = await apiClient.get<Claim[]>("/claims");
      setClaims(claimResponse.data);
      setPolicies([]);
      return;
    }

    const [claimResponse, policyResponse] = await Promise.all([
      apiClient.get<Claim[]>("/claims"),
      apiClient.get<Policy[]>("/policies/mine")
    ]);

    const activePolicies = policyResponse.data.filter((policy) => policy.status === "active");
    setClaims(claimResponse.data);
    setPolicies(activePolicies);
    setForm((prev) => {
      const selectedPolicyId = activePolicies.some((p) => p._id === prev.policyId)
        ? prev.policyId
        : (activePolicies[0]?._id ?? "");
      const selectedPolicyType = getPolicyTypeById(selectedPolicyId, activePolicies) ?? prev.triggerType;

      return {
        ...prev,
        policyId: selectedPolicyId,
        triggerType: selectedPolicyType
      };
    });
  }

  function handlePolicyChange(policyId: string) {
    const policyType = getPolicyTypeById(policyId, policies);
    setForm((prev) => ({
      ...prev,
      policyId,
      triggerType: policyType ?? prev.triggerType
    }));
  }

  useEffect(() => {
    load();
    // load uses current user role context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function ingestTrigger(event: FormEvent) {
    event.preventDefault();
    const eventKey = form.eventKey.trim();
    const proofImageUrl = form.proofImageUrl.trim();
    try {
      const response = await apiClient.post<TriggerIngestResponse>("/triggers/ingest", {
        ...form,
        eventKey: eventKey.length > 0 ? eventKey : undefined,
        proofImageUrl: proofImageUrl.length > 0 ? proofImageUrl : undefined,
        delayMinutes: Number(form.delayMinutes),
        weatherRiskIndex: Number(form.weatherRiskIndex),
        severity: Number(form.severity)
      });

      if (response.data.triggered) {
        setTriggerFeedback("Trigger accepted and claim created.");
      } else if (response.data.reason === "duplicate_event") {
        setTriggerFeedback("Duplicate event key detected. Existing claim was reused.");
      } else {
        setTriggerFeedback(
          `Trigger did not meet threshold (${(response.data.score ?? 0).toFixed(2)} < ${(response.data.threshold ?? 0).toFixed(2)}).`
        );
      }

      await load();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setTriggerFeedback(error.response?.data?.message ?? "Unable to generate claim from trigger.");
      } else {
        setTriggerFeedback("Unable to generate claim from trigger.");
      }
    }
  }

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

  function getStatusLabel(status: Claim["status"]) {
    if (status === "under_review" || status === "triggered") {
      return "pending";
    }
    return status;
  }

  return (
    <section className="page two-col">
      <div className="card">
        {isAdmin ? (
          <>
            <h1>Claim Review (Admin)</h1>
            <p>Review pending claims and decide whether to approve or reject.</p>
            {decisionFeedback && <p>{decisionFeedback}</p>}
          </>
        ) : (
          <>
            <h1>Automated Claim Triggers</h1>
            <p>Simulate a verified event to create a pending claim for admin review.</p>
            {triggerFeedback && <p>{triggerFeedback}</p>}
            <form className="stack-form" onSubmit={ingestTrigger}>
              <label>Policy
                <select value={form.policyId} onChange={(e) => handlePolicyChange(e.target.value)} required>
                  <option value="">Select active policy</option>
                  {policies.map((policy) => (
                    <option value={policy._id} key={policy._id}>{policy.name}</option>
                  ))}
                </select>
              </label>
              <label>Event Key (optional)<input value={form.eventKey} onChange={(e) => setForm((prev) => ({ ...prev, eventKey: e.target.value }))} placeholder="Leave empty to auto-generate" /></label>
              <label>Proof Image URL (optional)<input type="url" value={form.proofImageUrl} onChange={(e) => setForm((prev) => ({ ...prev, proofImageUrl: e.target.value }))} placeholder="https://example.com/proof.jpg" /></label>
              <label>Trigger Type
                <select value={form.triggerType} onChange={(e) => setForm((prev) => ({ ...prev, triggerType: e.target.value }))}>
                  <option value="weather">Weather</option>
                  <option value="delay">Delay</option>
                  <option value="accident">Accident</option>
                </select>
              </label>
              <label>
                Severity: {riskLevels[toLevelIndex(form.severity)]}
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={toLevelIndex(form.severity)}
                  onChange={(e) => setForm((prev) => ({ ...prev, severity: riskScoreMap[Number(e.target.value)] }))}
                />
              </label>
              <label>Delay Minutes<input type="number" min={0} value={form.delayMinutes} onChange={(e) => setForm((prev) => ({ ...prev, delayMinutes: Number(e.target.value) }))} /></label>
              <label>
                Weather Risk: {riskLevels[toLevelIndex(form.weatherRiskIndex)]}
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={toLevelIndex(form.weatherRiskIndex)}
                  onChange={(e) => setForm((prev) => ({ ...prev, weatherRiskIndex: riskScoreMap[Number(e.target.value)] }))}
                />
              </label>
              <label className="checkbox"><input type="checkbox" checked={form.collisionDetected} onChange={(e) => setForm((prev) => ({ ...prev, collisionDetected: e.target.checked }))} /> Collision Detected</label>
              <button type="submit">Trigger Event</button>
            </form>
          </>
        )}
      </div>

      <div className="card">
        <h2>Claims</h2>
        <div className="list-stack">
          {claims.map((claim) => (
            <article className="list-item" key={claim._id}>
              <div>
                <h3>{claim.triggerType.toUpperCase()} trigger</h3>
                <p>{claim.reason}</p>
                <p>Score {claim.triggerScore.toFixed(2)} · Amount INR {claim.amount}</p>
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

import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Claim } from "../../types";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";

type AdminDecisionStatus = "approved" | "rejected";

export function ClaimsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [claims, setClaims] = useState<Claim[]>([]);
  const [decisionFeedback, setDecisionFeedback] = useState<string>("");
  const [decisionLoadingClaimId, setDecisionLoadingClaimId] = useState<string>("");

  async function load() {
    const claimResponse = await apiClient.get<Claim[]>('/claims');
    setClaims(claimResponse.data);
  }

  useEffect(() => {
    load();
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
            <h1>My Claims</h1>
            <p>Claims are generated automatically in the background when disruptions are detected.</p>
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

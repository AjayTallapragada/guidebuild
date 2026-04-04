import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Payout } from "../../types";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

type PaymentMode = "upi" | "bank_account" | "online_wallet";

export function PayoutsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [paymentModeByPayout, setPaymentModeByPayout] = useState<Record<string, PaymentMode>>({});
  const [paymentHandleByPayout, setPaymentHandleByPayout] = useState<Record<string, string>>({});
  const [loadingPayoutId, setLoadingPayoutId] = useState("");
  const [feedback, setFeedback] = useState("");

  async function loadPayouts() {
    const response = await apiClient.get<Payout[]>("/payouts");
    setPayouts(response.data);
  }

  useEffect(() => {
    loadPayouts();
  }, []);

  async function payPayout(payoutId: string) {
    const selectedMode = paymentModeByPayout[payoutId] ?? "upi";
    const paymentHandle = (paymentHandleByPayout[payoutId] ?? "").trim();

    setLoadingPayoutId(payoutId);
    setFeedback("");
    try {
      await apiClient.post(`/payouts/${payoutId}/pay`, {
        paymentMode: selectedMode,
        paymentHandle: paymentHandle.length > 0 ? paymentHandle : undefined
      });
      setFeedback("Payment completed successfully.");
      await loadPayouts();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFeedback(error.response?.data?.message ?? "Unable to complete payout payment.");
      } else {
        setFeedback("Unable to complete payout payment.");
      }
    } finally {
      setLoadingPayoutId("");
    }
  }

  function paymentModeLabel(mode: PaymentMode) {
    if (mode === "upi") return "UPI";
    if (mode === "bank_account") return "Bank Account";
    return "Online Wallet";
  }

  return (
    <section className="page">
      <div className="card">
        <div className="inline-actions">
          <h1>{isAdmin ? "All Payouts" : "Payout Ledger"}</h1>
        </div>
        {feedback && <p>{feedback}</p>}
        <div className="list-stack">
          {payouts.map((payout) => (
            <article className="list-item" key={payout._id}>
              <div>
                <h3>Payout INR {payout.amount.toFixed(2)}</h3>
                <p>Claim ID: {payout.claimId}</p>
                {isAdmin && payout.userId && <p>Worker ID: {payout.userId}</p>}
                <span className={`status ${payout.status}`}>{payout.status}</span>
                {payout.status === "processed" && payout.paymentMode && (
                  <p>Paid via {paymentModeLabel(payout.paymentMode)}</p>
                )}
              </div>
              {payout.status === "queued" && (
                <div className="stack-form" style={{ minWidth: "280px" }}>
                  <label>Payment Mode
                    <select
                      value={paymentModeByPayout[payout._id] ?? "upi"}
                      onChange={(e) => setPaymentModeByPayout((prev) => ({ ...prev, [payout._id]: e.target.value as PaymentMode }))}
                    >
                      <option value="upi">UPI</option>
                      <option value="bank_account">Bank Account</option>
                      <option value="online_wallet">Online Wallet</option>
                    </select>
                  </label>
                  <label>Payment Details (optional)
                    <input
                      value={paymentHandleByPayout[payout._id] ?? ""}
                      onChange={(e) => setPaymentHandleByPayout((prev) => ({ ...prev, [payout._id]: e.target.value }))}
                      placeholder="UPI ID / Account Ref / Wallet ID"
                    />
                  </label>
                  <button type="button" onClick={() => payPayout(payout._id)} disabled={loadingPayoutId === payout._id}>
                    {loadingPayoutId === payout._id ? "Processing..." : "Proceed to Payment"}
                  </button>
                </div>
              )}
            </article>
          ))}
          {payouts.length === 0 && <p>No payouts yet.</p>}
        </div>
      </div>
    </section>
  );
}

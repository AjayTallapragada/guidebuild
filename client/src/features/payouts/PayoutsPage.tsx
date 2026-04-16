import { useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Payout } from "../../types";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

type PaymentMode = "upi" | "bank_account" | "online_wallet";
type Gateway = "razorpay_test" | "stripe_sandbox" | "upi_simulator";

export function PayoutsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [paymentModeByPayout, setPaymentModeByPayout] = useState<Record<string, PaymentMode>>({});
  const [paymentHandleByPayout, setPaymentHandleByPayout] = useState<Record<string, string>>({});
  const [gatewayByPayout, setGatewayByPayout] = useState<Record<string, Gateway>>({});
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
    const gateway = gatewayByPayout[payoutId] ?? "upi_simulator";

    setLoadingPayoutId(payoutId);
    setFeedback("");
    try {
      await apiClient.post(`/payouts/${payoutId}/pay`, {
        paymentMode: selectedMode,
        paymentHandle: paymentHandle.length > 0 ? paymentHandle : undefined,
        gateway
      });
      setFeedback("Payout processed through simulator successfully.");
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

  function gatewayLabel(gateway: Gateway) {
    if (gateway === "razorpay_test") return "Razorpay Test";
    if (gateway === "stripe_sandbox") return "Stripe Sandbox";
    return "UPI Simulator";
  }

  return (
    <section className="page">
      <div className="card">
        <div className="inline-actions">
          <h1>{isAdmin ? "All Payouts" : "Instant Payout Rail"}</h1>
        </div>
        <p>
          Approved wages move into a queued state first, then the worker can simulate a transfer through
          Razorpay test mode, Stripe sandbox, or a UPI rail.
        </p>
        {feedback && <p>{feedback}</p>}
        <div className="list-stack">
          {payouts.map((payout) => (
            <article className="list-item payouts-item" key={payout._id}>
              <div>
                <h3>Payout INR {payout.amount.toFixed(2)}</h3>
                <p>Claim ID: {payout.claimId}</p>
                {isAdmin && payout.userId && <p>Worker ID: {payout.userId}</p>}
                {payout.status === "queued" && <p>Expected release in {payout.etaMinutes ?? 5} minute(s)</p>}
                <span className={`status ${payout.status}`}>{payout.status}</span>
                {payout.status === "processed" && payout.paymentMode && (
                  <p>
                    Paid via {paymentModeLabel(payout.paymentMode)}
                    {payout.gateway ? ` on ${gatewayLabel(payout.gateway)}` : ""}
                  </p>
                )}
                {payout.gatewayReference && <p>Transfer ref: {payout.gatewayReference}</p>}
              </div>
              {payout.status === "queued" && (
                <div className="stack-form payout-form">
                  <label>Payment Mode
                    <select
                      value={paymentModeByPayout[payout._id] ?? "upi"}
                      onChange={(event) =>
                        setPaymentModeByPayout((prev) => ({ ...prev, [payout._id]: event.target.value as PaymentMode }))}
                    >
                      <option value="upi">UPI</option>
                      <option value="bank_account">Bank Account</option>
                      <option value="online_wallet">Online Wallet</option>
                    </select>
                  </label>
                  <label>Gateway
                    <select
                      value={gatewayByPayout[payout._id] ?? "upi_simulator"}
                      onChange={(event) =>
                        setGatewayByPayout((prev) => ({ ...prev, [payout._id]: event.target.value as Gateway }))}
                    >
                      <option value="upi_simulator">UPI Simulator</option>
                      <option value="razorpay_test">Razorpay Test</option>
                      <option value="stripe_sandbox">Stripe Sandbox</option>
                    </select>
                  </label>
                  <label>Payment Details (optional)
                    <input
                      value={paymentHandleByPayout[payout._id] ?? ""}
                      onChange={(event) => setPaymentHandleByPayout((prev) => ({ ...prev, [payout._id]: event.target.value }))}
                      placeholder="UPI ID / Account Ref / Wallet ID"
                    />
                  </label>
                  <button type="button" onClick={() => payPayout(payout._id)} disabled={loadingPayoutId === payout._id}>
                    {loadingPayoutId === payout._id ? "Processing..." : "Release payout now"}
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

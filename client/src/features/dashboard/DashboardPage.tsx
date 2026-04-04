import { useAuth } from "../../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section className="page">
      <h1>Welcome, {user?.fullName}</h1>
      <p>This platform automates parametric protection for delivery workers.</p>
      <div className="cards-grid">
        <article className="card accent">
          <h2>Smart Premiums</h2>
          <p>Premiums adapt to your route risk, weather exposure, and activity profile.</p>
        </article>
        <article className="card">
          <h2>Auto Triggers</h2>
          <p>Claims are automatically created when trigger thresholds are crossed.</p>
        </article>
        <article className="card">
          <h2>Rapid Payouts</h2>
          <p>Approved claims are moved to payout queue without manual paperwork.</p>
        </article>
      </div>
    </section>
  );
}

import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const isWorker = user?.role === "worker";
  const [automationFeedback] = useState<string>("Automated background checks run on the server and create claims without manual action.");

  return (
    <section className="page">
      <h1>Welcome, {user?.fullName}</h1>
      <p>This platform automates parametric protection for delivery workers.</p>
      {isWorker && (
        <div className="card">
          <h2>Zero-Touch Claim Automation</h2>
          <p>Claims are created automatically in the background when disruption thresholds are met.</p>
          {automationFeedback && <p>{automationFeedback}</p>}
        </div>
      )}
      <div className="cards-grid">
        <article className="card accent">
          <h2>Smart Premiums</h2>
          <p>Weekly premiums adapt to zone safety, weather forecasts, and activity profile.</p>
        </article>
        <article className="card">
          <h2>Auto Triggers</h2>
          <p>Mock/public signals are evaluated automatically to create pending claims.</p>
        </article>
        <article className="card">
          <h2>Rapid Payouts</h2>
          <p>Approved claims are moved to payout queue without manual paperwork.</p>
        </article>
      </div>
    </section>
  );
}

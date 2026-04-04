import { FormEvent, useState } from "react";
import { apiClient } from "../../services/apiClient";

type QuoteResponse = {
  premium: number;
  breakdown: Record<string, number>;
};

export function PremiumPage() {
  const [form, setForm] = useState({
    policyType: "weather",
    regionRiskIndex: 0.4,
    weatherRiskIndex: 0.5,
    claimHistoryRate: 0.2,
    weeklyHours: 35,
    coverageLimit: 1500,
    deductible: 120
  });
  const [quote, setQuote] = useState<QuoteResponse | null>(null);

  async function calculate(event: FormEvent) {
    event.preventDefault();
    const response = await apiClient.post<QuoteResponse>("/premium/quote", form);
    setQuote(response.data);
  }

  return (
    <section className="page two-col">
      <div className="card">
        <h1>Dynamic Premium Calculator</h1>
        <form className="stack-form" onSubmit={calculate}>
          <label>Policy Type
            <select value={form.policyType} onChange={(e) => setForm((prev) => ({ ...prev, policyType: e.target.value }))}>
              <option value="weather">Weather</option>
              <option value="delay">Delay</option>
              <option value="accident">Accident</option>
            </select>
          </label>
          <label>Region Risk Index (0-1)<input type="number" step="0.01" min={0} max={1} value={form.regionRiskIndex} onChange={(e) => setForm((prev) => ({ ...prev, regionRiskIndex: Number(e.target.value) }))} /></label>
          <label>Weather Risk Index (0-1)<input type="number" step="0.01" min={0} max={1} value={form.weatherRiskIndex} onChange={(e) => setForm((prev) => ({ ...prev, weatherRiskIndex: Number(e.target.value) }))} /></label>
          <label>Claim History Rate (0-1)<input type="number" step="0.01" min={0} max={1} value={form.claimHistoryRate} onChange={(e) => setForm((prev) => ({ ...prev, claimHistoryRate: Number(e.target.value) }))} /></label>
          <label>Weekly Hours<input type="number" min={1} max={80} value={form.weeklyHours} onChange={(e) => setForm((prev) => ({ ...prev, weeklyHours: Number(e.target.value) }))} /></label>
          <label>Coverage Limit<input type="number" min={100} value={form.coverageLimit} onChange={(e) => setForm((prev) => ({ ...prev, coverageLimit: Number(e.target.value) }))} /></label>
          <label>Deductible<input type="number" min={0} max={1000} value={form.deductible} onChange={(e) => setForm((prev) => ({ ...prev, deductible: Number(e.target.value) }))} /></label>
          <button type="submit">Calculate Premium</button>
        </form>
      </div>

      <div className="card">
        <h2>Premium Explainability</h2>
        {!quote && <p>Run a calculation to inspect the premium breakdown.</p>}
        {quote && (
          <>
            <p className="headline">Monthly Premium: INR {quote.premium}</p>
            <ul className="metric-list">
              {Object.entries(quote.breakdown).map(([key, value]) => (
                <li key={key}><span>{key}</span><strong>{Number(value).toFixed(3)}</strong></li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

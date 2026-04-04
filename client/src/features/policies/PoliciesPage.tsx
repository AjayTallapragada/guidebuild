import { FormEvent, useEffect, useState } from "react";
import { apiClient } from "../../services/apiClient";
import { Policy } from "../../types";
import { useAuth } from "../../context/AuthContext";

type CatalogPolicy = {
  code: string;
  name: string;
  occasion: string;
  description: string;
  policyType: "weather" | "delay" | "accident";
  coverageLimit: number;
  deductible: number;
  monthlyBasePremium: number;
};

const initialForm = {
  name: "",
  policyType: "weather",
  region: "",
  vehicleType: "bike",
  coverageLimit: 1000,
  deductible: 100,
  monthlyBasePremium: 20
};

export function PoliciesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [catalog, setCatalog] = useState<CatalogPolicy[]>([]);
  const [buyRegion, setBuyRegion] = useState("Downtown");
  const [buyVehicleType, setBuyVehicleType] = useState<Policy["vehicleType"]>("bike");
  const [form, setForm] = useState(initialForm);

  async function loadPolicies() {
    const endpoint = isAdmin ? "/policies" : "/policies/mine";
    const response = await apiClient.get<Policy[]>(endpoint);
    setPolicies(isAdmin ? response.data : response.data.filter((policy) => policy.status === "active"));
  }

  async function loadCatalog() {
    const response = await apiClient.get<CatalogPolicy[]>("/policies/catalog");
    setCatalog(response.data);
  }

  useEffect(() => {
    const load = async () => {
      await loadPolicies();
      await loadCatalog();
    };
    load();
    // loadPolicies and loadCatalog rely on current role context only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  async function createPolicy(event: FormEvent) {
    event.preventDefault();
    await apiClient.post("/policies", {
      ...form,
      coverageLimit: Number(form.coverageLimit),
      deductible: Number(form.deductible),
      monthlyBasePremium: Number(form.monthlyBasePremium)
    });
    setForm(initialForm);
    await loadPolicies();
  }

  async function buyPolicy(policyCode: string) {
    await apiClient.post(`/policies/catalog/${policyCode}/buy`, {
      region: buyRegion,
      vehicleType: buyVehicleType
    });
    await loadPolicies();
  }

  async function cancelPolicy(policyId: string) {
    await apiClient.post(`/policies/${policyId}/cancel`);
    await loadPolicies();
  }

  return (
    <section className="page two-col">
      <div className="card">
        {isAdmin ? (
          <>
            <h1>Policy Management (Admin)</h1>
            <form onSubmit={createPolicy} className="stack-form">
              <label>Name<input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required /></label>
              <label>Policy Type
                <select value={form.policyType} onChange={(e) => setForm((prev) => ({ ...prev, policyType: e.target.value as Policy["policyType"] }))}>
                  <option value="weather">Weather</option>
                  <option value="delay">Delay</option>
                  <option value="accident">Accident</option>
                </select>
              </label>
              <label>Region<input value={form.region} onChange={(e) => setForm((prev) => ({ ...prev, region: e.target.value }))} required /></label>
              <label>Vehicle
                <select value={form.vehicleType} onChange={(e) => setForm((prev) => ({ ...prev, vehicleType: e.target.value as Policy["vehicleType"] }))}>
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                  <option value="car">Car</option>
                </select>
              </label>
              <label>Coverage Limit<input type="number" value={form.coverageLimit} onChange={(e) => setForm((prev) => ({ ...prev, coverageLimit: Number(e.target.value) }))} min={100} /></label>
              <label>Deductible<input type="number" value={form.deductible} onChange={(e) => setForm((prev) => ({ ...prev, deductible: Number(e.target.value) }))} min={0} max={1000} /></label>
              <label>Monthly Base Premium<input type="number" value={form.monthlyBasePremium} onChange={(e) => setForm((prev) => ({ ...prev, monthlyBasePremium: Number(e.target.value) }))} min={1} /></label>
              <button type="submit">Create Policy</button>
            </form>
          </>
        ) : (
          <>
            <h1>Prepaid Policies</h1>
            <p>Choose a prepaid policy pack for your delivery occasion.</p>
            <div className="stack-form">
              <label>Region<input value={buyRegion} onChange={(e) => setBuyRegion(e.target.value)} required /></label>
              <label>Vehicle
                <select value={buyVehicleType} onChange={(e) => setBuyVehicleType(e.target.value as Policy["vehicleType"])}>
                  <option value="bike">Bike</option>
                  <option value="scooter">Scooter</option>
                  <option value="car">Car</option>
                </select>
              </label>
            </div>
            <div className="list-stack" style={{ marginTop: "1rem" }}>
              {catalog.map((item) => (
                <article key={item.code} className="list-item">
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.occasion}</p>
                    <p>{item.description}</p>
                    <p>Coverage INR {item.coverageLimit} · Premium INR {item.monthlyBasePremium}/mo</p>
                  </div>
                  <button onClick={() => buyPolicy(item.code)}>Buy</button>
                </article>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h2>{isAdmin ? "Managed Policies" : "My Policies"}</h2>
        <div className="list-stack">
          {policies.map((policy) => (
            <article key={policy._id} className="list-item">
              <div>
                <h3>{policy.name}</h3>
                <p>{policy.policyType} · {policy.region} · {policy.vehicleType}</p>
                <p>Coverage INR {policy.coverageLimit} · Premium INR {policy.monthlyBasePremium}/mo</p>
                <span className={`status ${policy.status}`}>{policy.status}</span>
              </div>
              {policy.status === "active" && (
                <button onClick={() => cancelPolicy(policy._id)}>Cancel</button>
              )}
            </article>
          ))}
          {policies.length === 0 && <p>No policies yet.</p>}
        </div>
      </div>
    </section>
  );
}

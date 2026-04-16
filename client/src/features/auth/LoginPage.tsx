import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message ?? "Login failed. Please try again.");
      } else {
        setError("Login failed. Please try again.");
      }
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>ParcelShield Login</h1>
        <p>Sign in as a worker or admin to manage policies, claims, dashboards, and payouts.</p>
        <form onSubmit={onSubmit}>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit">Sign In</button>
        </form>
        <div style={{ marginTop: "1.5rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "0.5rem" }}>
          <p style={{ marginTop: 0, fontWeight: "bold" }}>Demo Credentials (Testing Only)</p>
          <p style={{ marginBottom: "0.5rem" }}>
            <strong>Admin:</strong><br />
            Email: <code>admin@parcelshield.demo</code><br />
            Password: <code>AdminPass123</code>
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>Worker:</strong><br />
            Email: <code>worker@parcelshield.demo</code><br />
            Password: <code>WorkerPass123</code>
          </p>
        </div>
        <p>New here? <Link to="/register">Create account</Link></p>
      </div>
    </section>
  );
}

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
        <h1>ParcelShield Demo Login</h1>
        <p>Sign in as a worker or admin to manage policies, claims, dashboards, and payouts.</p>
        <form onSubmit={onSubmit}>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit">Sign In</button>
        </form>
        <div className="demo-credentials">
          <div className="demo-credentials__header">
            <span>Testing Only</span>
            <strong>Demo Credentials</strong>
          </div>
          <div className="demo-credentials__grid">
            <div className="demo-credentials__card">
              <strong>Admin</strong>
              <span>Email</span>
              <code>admin@parcelshield.demo</code>
              <span>Password</span>
              <code>AdminPass123</code>
            </div>
            <div className="demo-credentials__card">
              <strong>Worker</strong>
              <span>Email</span>
              <code>worker@parcelshield.demo</code>
              <span>Password</span>
              <code>WorkerPass123</code>
            </div>
          </div>
        </div>
        <p>New here? <Link to="/register">Create account</Link></p>
      </div>
    </section>
  );
}

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copyToClipboard(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((currentKey) => (currentKey === key ? null : currentKey));
    }, 1500);
  }

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
              <div className="demo-credentials__row">
                <div>
                  <span>Email</span>
                  <code>admin@parcelshield.demo</code>
                </div>
                <button type="button" className="demo-credentials__copy" onClick={() => copyToClipboard("admin@parcelshield.demo", "admin-email")}>Copy</button>
              </div>
              <div className="demo-credentials__row">
                <div>
                  <span>Password</span>
                  <code>AdminPass123</code>
                </div>
                <button type="button" className="demo-credentials__copy" onClick={() => copyToClipboard("AdminPass123", "admin-password")}>Copy</button>
              </div>
            </div>
            <div className="demo-credentials__card">
              <strong>Worker</strong>
              <div className="demo-credentials__row">
                <div>
                  <span>Email</span>
                  <code>worker@parcelshield.demo</code>
                </div>
                <button type="button" className="demo-credentials__copy" onClick={() => copyToClipboard("worker@parcelshield.demo", "worker-email")}>Copy</button>
              </div>
              <div className="demo-credentials__row">
                <div>
                  <span>Password</span>
                  <code>WorkerPass123</code>
                </div>
                <button type="button" className="demo-credentials__copy" onClick={() => copyToClipboard("WorkerPass123", "worker-password")}>Copy</button>
              </div>
            </div>
          </div>
          <p className="demo-credentials__status" aria-live="polite">
            {copiedKey ? "Copied to clipboard." : "Click Copy to paste a value into your login form."}
          </p>
        </div>
        <p>New here? <Link to="/register">Create account</Link></p>
      </div>
    </section>
  );
}

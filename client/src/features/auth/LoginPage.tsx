import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
    } catch {
      setError("Login failed. Check your credentials.");
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Delivery Worker Login</h1>
        <p>Sign in to manage your parametric insurance policies and claims.</p>
        <form onSubmit={onSubmit}>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit">Sign In</button>
        </form>
        <p>New here? <Link to="/register">Create account</Link></p>
      </div>
    </section>
  );
}

import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await register({ fullName, email, password });
      navigate("/dashboard");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setError(error.response?.data?.message ?? "Registration failed. Try another email.");
      } else {
        setError("Registration failed. Try another email.");
      }
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <h1>Create Worker Account</h1>
        <p>Get weekly income-loss protection for weather and disruption delays.</p>
        <form onSubmit={onSubmit}>
          <label>Full Name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
          <label>Email<input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required /></label>
          <label>Password<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" minLength={8} required /></label>
          {error && <p className="error">{error}</p>}
          <button type="submit">Create Account</button>
        </form>
        <p>Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </section>
  );
}

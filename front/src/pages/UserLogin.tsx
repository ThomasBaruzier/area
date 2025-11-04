import "./Auth.css";

import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import apiFetch from "../utils/fetchApi";

export default function UserLoginPage(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { error?: string } | null;
    if (state?.error) {
      setError(state.error);
    }
  }, [location]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch<{ access_token: string }>("/api/user/login", {
        method: "POST",
        body: { email, password },
      });
      login(data.access_token);
      void navigate("/workflow/list");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to log in. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h1>Login</h1>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="auth-form"
        >
          <label>
            Email
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
              }}
              required
              data-testid="email-input"
            />
          </label>
          <label>
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
              required
              data-testid="password-input"
            />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button
            className="wf-btn auth-submit"
            type="submit"
            disabled={loading}
            data-testid="submit-button"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}

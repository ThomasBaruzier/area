import "./Auth.css";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import apiFetch from "../utils/fetchApi";

export default function UserRegisterPage(): JSX.Element {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      await apiFetch("/api/user/register", {
        method: "POST",
        body: { username, email, password },
      });
      const data = await apiFetch<{ access_token: string }>("/api/user/login", {
        method: "POST",
        body: { email, password },
      });
      login(data.access_token);
      void navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card auth-card">
        <h1>Register</h1>
        <form
          onSubmit={(e) => {
            void handleSubmit(e);
          }}
          className="auth-form"
        >
          <label>
            Username
            <input
              className="input"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
              required
              data-testid="username-input"
            />
          </label>
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
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
}

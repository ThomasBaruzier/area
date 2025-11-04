import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

export default function AuthCallback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      login(token);
    } else {
      void navigate("/login", {
        replace: true,
        state: { error: "Authentication failed. Please try again." },
      });
    }
  }, [searchParams, login, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      void navigate("/services", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <div style={{ textAlign: "center", paddingTop: "4rem" }}>
      <h2>Authenticating...</h2>
    </div>
  );
}

import "./HomePage.css";

import React from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../auth/useAuth";

export default function HomePage(): JSX.Element {
  const { isAuthenticated } = useAuth();
  return (
    <div className="home-page">
      <h1 className="home-title">Welcome to AREA</h1>
      <p className="home-subtitle">
        Let's automate your favorite apps and services.
      </p>
      <div className="home-cta-container">
        {isAuthenticated ? (
          <Link to="/workflow/list" className="home-cta-button">
            View my Workflows
          </Link>
        ) : (
          <>
            <Link to="/login" className="home-cta-button">
              Login
            </Link>
            <Link to="/register" className="home-cta-button secondary">
              Register
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

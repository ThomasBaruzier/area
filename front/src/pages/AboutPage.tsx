import "./AboutPage.css";

import React, { useEffect, useState } from "react";

import apiFetch from "../utils/fetchApi";

type AboutData = {
  client: { host: string };
  server: {
    current_time: number;
    services: {
      name: string;
      actions: { name: string; description: string }[];
      reactions: { name: string; description: string }[];
    }[];
  };
};

export default function AboutPage(): JSX.Element {
  const [aboutData, setAboutData] = useState<AboutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<AboutData>("/about.json")
      .then((data) => {
        setAboutData(data);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Failed to load about data.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-box">{error}</div>;
  if (!aboutData) return <div>No data available.</div>;

  return (
    <div className="about-page">
      <h1>About This AREA Instance</h1>
      <div className="card about-card">
        <h2>Client</h2>
        <p>
          <strong>Host:</strong> {aboutData.client.host}
        </p>
      </div>
      <div className="card about-card">
        <h2>Server</h2>
        <p>
          <strong>Current Time:</strong>{" "}
          {new Date(aboutData.server.current_time * 1000).toLocaleString()}
        </p>
        <h3>Services ({aboutData.server.services.length})</h3>
        {aboutData.server.services.map((service) => (
          <div key={service.name} className="service-details card">
            <h4>{service.name}</h4>
            <h5>Actions ({service.actions.length})</h5>
            <ul>
              {service.actions.map((action) => (
                <li key={action.name}>
                  <strong>{action.name}:</strong> {action.description}
                </li>
              ))}
            </ul>
            <h5>Reactions ({service.reactions.length})</h5>
            <ul>
              {service.reactions.map((reaction) => (
                <li key={reaction.name}>
                  <strong>{reaction.name}:</strong> {reaction.description}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

import "./ServiceList.css";

import React, { useState } from "react";

import { useAuth } from "../../auth/useAuth";
import { useConnections } from "../../auth/useConnections";
import { useMetadata } from "../../context/useMetadata";
import type { ActionOrReaction, Service } from "../../types/workflow";
import Modal from "../common/Modal";

export default function ServiceList(): JSX.Element {
  const { services, loading, error, getActions, getReactions } = useMetadata();
  const { isConnected } = useConnections();
  const { token } = useAuth();

  const [modalService, setModalService] = useState<Service | null>(null);
  const [modalActions, setModalActions] = useState<ActionOrReaction[]>([]);
  const [modalReactions, setModalReactions] = useState<ActionOrReaction[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  function constructAuthUrl(service: Service): string {
    const params = new URLSearchParams({ origin: "web" });
    if (token) {
      params.set("token", token);
    }
    const connectUrl = service.connectUrl || "";
    return `${connectUrl}?${params.toString()}`;
  }

  async function handleOpenModal(service: Service): Promise<void> {
    setModalService(service);
    setModalLoading(true);
    try {
      const [actionsRes, reactionsRes] = await Promise.all([
        getActions(service.id),
        getReactions(service.id),
      ]);
      setModalActions(actionsRes);
      setModalReactions(reactionsRes);
    } catch (e: unknown) {
      console.error("Failed to fetch service details", e);
    } finally {
      setModalLoading(false);
    }
  }

  function handleCloseModal(): void {
    setModalService(null);
    setModalActions([]);
    setModalReactions([]);
  }

  return (
    <section className="services-page">
      <div className="services-header">
        <h1>Services</h1>
        {!loading && (
          <span className="services-count">
            {services.length} service{services.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {loading && (
        <div className="services-grid" role="status" aria-live="polite">
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}

      {!loading && !error && (
        <div className="services-grid">
          {services.map((s) => (
            <div
              key={String(s.id)}
              className="card service-card"
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              data-testid={`service-card-${s.name}`}
              onClick={() => {
                void handleOpenModal(s);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void handleOpenModal(s);
                }
              }}
            >
              <div className="service-card-header">
                <h3 className="service-name">{s.name}</h3>
                <ConnectionStatusBadge connected={isConnected(s.name)} />
              </div>

              <p className="service-desc">
                {s.description?.trim() || "No description provided."}
              </p>
              <div className="service-card-actions">
                <a
                  href={constructAuthUrl(s)}
                  className="wf-btn"
                  data-testid={`connect-btn-${s.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {isConnected(s.name) ? "Reconnect" : "Connect"}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalService && (
        <Modal onClose={handleCloseModal} data-testid="service-details-modal">
          <div className="service-modal">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h2 className="service-modal-title">{modalService.name}</h2>
              <ConnectionStatusBadge
                connected={isConnected(modalService.name)}
              />
            </div>
            <p className="service-modal-desc">{modalService.description}</p>
            {modalLoading ? (
              <div className="service-details-loading">Loading…</div>
            ) : (
              <div className="service-modal-details">
                <SectionTitle>Actions :</SectionTitle>
                <DetailsList items={modalActions} />
                <Divider />
                <SectionTitle>Reactions :</SectionTitle>
                <DetailsList items={modalReactions} />
              </div>
            )}
          </div>
        </Modal>
      )}
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}

function ConnectionStatusBadge({
  connected,
}: {
  connected: boolean;
}): JSX.Element {
  return (
    <span
      className={`connection-badge ${connected ? "connected" : "disconnected"}`}
    >
      {connected ? "Connected" : "Disconnected"}
    </span>
  );
}

function DetailsList({
  items,
}: {
  items?: ActionOrReaction[];
}): React.ReactElement | null {
  if (!items) return null;
  if (items.length === 0)
    return (
      <div className="service-sublist">
        <i>No action or reaction</i>
      </div>
    );
  return (
    <div className="details-list">
      {items.map((el) => (
        <div key={el.id} className="details-list-item">
          <span className="details-list-item-name">{el.name}</span>
          <div className="fields-list-title">Fields you'll need to fill:</div>
          <div className="fields-list-dotted-rect">
            {Object.keys(el.jsonFormat || {}).map((field) => (
              <div key={field} className="field-row">
                <span className="field-name field-dotted">{field} :</span>
              </div>
            ))}
            {Object.keys(el.jsonFormat || {}).length === 0 && (
              <span>No fields</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return <div className="section-title">{children}</div>;
}
function Divider(): JSX.Element {
  return <div className="divider" />;
}

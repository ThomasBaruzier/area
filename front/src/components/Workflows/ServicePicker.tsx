import "./WorkflowMindmap.css";

import React, { useMemo, useState } from "react";

import { useAuth } from "../../auth/useAuth";
import { useConnections } from "../../auth/useConnections";
import { useMetadata } from "../../context/useMetadata";
import type { ActionOrReaction, Service } from "../../types/workflow";
import Modal from "../common/Modal";

type Mode = "action" | "reaction";

export default function ServicePicker({
  mode,
  onClose,
  onConfirm,
}: {
  mode: Mode;
  onClose: () => void;
  onConfirm: (service: Service, selected: ActionOrReaction) => void;
}): JSX.Element {
  const {
    services,
    loading: servicesLoading,
    getActions,
    getReactions,
  } = useMetadata();
  const [serviceId, setServiceId] = useState<number | "">("");
  const [items, setItems] = useState<ActionOrReaction[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useConnections();
  const { token } = useAuth();

  const selectedService = useMemo(
    () =>
      serviceId ? (services.find((s) => s.id === serviceId) ?? null) : null,
    [serviceId, services],
  );

  const handleServiceChange = async (
    newServiceId: number | "",
  ): Promise<void> => {
    setServiceId(newServiceId);
    setSelectedItemId("");
    setItems([]);
    setError(null);
    if (!newServiceId) return;

    setItemsLoading(true);
    try {
      const data =
        mode === "action"
          ? await getActions(newServiceId)
          : await getReactions(newServiceId);
      setItems(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch items.");
    } finally {
      setItemsLoading(false);
    }
  };

  const connectService = (): void => {
    if (!selectedService) return;
    const params = new URLSearchParams({ origin: "web" });
    if (token) {
      params.set("token", token);
    }
    const authUrl = `${selectedService.connectUrl}?${params.toString()}`;
    window.location.assign(authUrl);
  };

  const confirm = (): void => {
    if (!selectedService) return;
    const it = items.find((i) => i.id === selectedItemId);
    if (it) onConfirm(selectedService, it);
  };

  const serviceIsConnected = selectedService
    ? isConnected(selectedService.name)
    : false;

  return (
    <Modal
      onClose={onClose}
      className="picker workflow-modal"
      data-testid="service-picker-modal"
    >
      <div className="wf-modal-content">
        <h2>{mode === "action" ? "Add Action" : "Add Reaction"}</h2>

        <div
          style={{
            display: "grid",
            gap: "var(--space-3)",
            marginTop: "var(--space-3)",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            Service
            <select
              data-testid="service-select"
              className="input"
              value={serviceId}
              onChange={(e) =>
                void handleServiceChange(
                  e.target.value ? Number(e.target.value) : "",
                )
              }
              disabled={servicesLoading}
            >
              <option value="">
                {servicesLoading ? "Loading…" : "Select a service…"}
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          {selectedService && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ fontSize: "0.9rem", color: "var(--color-text-muted)" }}
              >
                Status:
              </span>
              <span
                className={`connection-badge ${
                  serviceIsConnected ? "connected" : "disconnected"
                }`}
              >
                {serviceIsConnected ? "Connected" : "Not connected"}
              </span>
              {!serviceIsConnected && (
                <button
                  className="wf-btn"
                  type="button"
                  onClick={connectService}
                >
                  {`Connect to ${selectedService.name}`}
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {mode === "action" ? "Action" : "Reaction"}
            <select
              data-testid="item-select"
              className="input"
              value={selectedItemId}
              onChange={(e) => {
                setSelectedItemId(e.target.value ? Number(e.target.value) : "");
              }}
              disabled={!serviceId || itemsLoading || !serviceIsConnected}
            >
              <option value="">
                {itemsLoading
                  ? "Loading…"
                  : items.length
                    ? "Select…"
                    : "No items"}
              </option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.description || it.name}
                </option>
              ))}
            </select>
          </label>

          <div className="wf-modal-actions">
            <button
              className="wf-btn"
              onClick={onClose}
              type="button"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              className="wf-btn"
              onClick={confirm}
              type="button"
              data-testid="add-button"
              disabled={!serviceId || !selectedItemId || !serviceIsConnected}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

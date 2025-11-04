import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/AuthContext";
import { ConnectionsContext } from "../../auth/ConnectionsContext";
import { MetadataContext } from "../../context/MetadataContext";
import type { ActionOrReaction, Service } from "../../types/workflow";
import ServicePicker from "./ServicePicker";

vi.mock("../utils/fetchApi");

const mockServices: Service[] = [
  {
    id: 1,
    name: "ServiceA",
    description: "desc A",
    connectUrl: "http://localhost/auth/servicea",
  },
  {
    id: 2,
    name: "ServiceB",
    description: "desc B",
    connectUrl: "http://localhost/auth/serviceb",
  },
];
const mockActions: ActionOrReaction[] = [
  { id: 10, name: "Do Something", type: "action", description: "" },
];

const mockGetActions = vi.fn().mockResolvedValue(mockActions);
const mockGetReactions = vi.fn();
const mockIsConnected = vi.fn(
  (serviceName: string) => serviceName === "ServiceA",
);

const renderComponent = (
  mode: "action" | "reaction",
  onClose = vi.fn(),
  onConfirm = vi.fn(),
): void => {
  render(
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        user: null,
        token: "test-token",
        login: vi.fn(),
        logout: vi.fn(),
        isAdmin: false,
        role: "USER",
      }}
    >
      <MetadataContext.Provider
        value={{
          services: mockServices,
          loading: false,
          error: null,
          getActions: mockGetActions,
          getReactions: mockGetReactions,
          getService: vi.fn(),
          getActionName: vi.fn(),
          getReactionName: vi.fn(),
        }}
      >
        <ConnectionsContext.Provider
          value={{
            connections: ["servicea"],
            isConnected: mockIsConnected,
            fetchConnections: vi.fn(),
          }}
        >
          <ServicePicker mode={mode} onClose={onClose} onConfirm={onConfirm} />
        </ConnectionsContext.Provider>
      </MetadataContext.Provider>
    </AuthContext.Provider>,
  );
};

describe("ServicePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { assign: vi.fn() },
      writable: true,
    });
  });

  it("should render correct title for action mode", () => {
    renderComponent("action");
    expect(
      screen.getByRole("heading", { name: /add action/i }),
    ).toBeInTheDocument();
  });

  it("should render correct title for reaction mode", () => {
    renderComponent("reaction");
    expect(
      screen.getByRole("heading", { name: /add reaction/i }),
    ).toBeInTheDocument();
  });

  it("should fetch and display items for connected service", async () => {
    const user = userEvent.setup();
    renderComponent("action");

    const serviceSelect = screen.getByRole("combobox", { name: /service/i });
    await user.selectOptions(serviceSelect, "ServiceA");

    expect(mockGetActions).toHaveBeenCalledWith(1);
    const actionSelect = screen.getByRole("combobox", { name: /action/i });
    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /do something/i }),
      ).toBeInTheDocument();
    });
    expect(actionSelect).not.toBeDisabled();
  });

  it("should disable selection for disconnected service and offer to connect", async () => {
    const user = userEvent.setup();
    renderComponent("action");

    await user.selectOptions(
      screen.getByRole("combobox", { name: /service/i }),
      "ServiceB",
    );

    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    const connectButton = screen.getByRole("button", {
      name: /connect to serviceb/i,
    });
    expect(connectButton).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /action/i })).toBeDisabled();

    await user.click(connectButton);
    expect(window.location.assign).toHaveBeenCalledWith(
      "http://localhost/auth/serviceb?origin=web&token=test-token",
    );
  });

  it("should show an error if fetching items fails", async () => {
    const user = userEvent.setup();
    mockGetActions.mockRejectedValueOnce(new Error("API Failed"));
    renderComponent("action");

    await user.selectOptions(
      screen.getByRole("combobox", { name: /service/i }),
      "ServiceA",
    );
    expect(await screen.findByText("API Failed")).toBeInTheDocument();
  });

  it("should show 'no items' if the API returns an empty array", async () => {
    const user = userEvent.setup();
    mockGetActions.mockResolvedValueOnce([]);
    renderComponent("action");

    await user.selectOptions(
      screen.getByRole("combobox", { name: /service/i }),
      "ServiceA",
    );
    const actionSelect = screen.getByRole("combobox", { name: /action/i });
    await waitFor(() => {
      expect(actionSelect).not.toBeDisabled();
    });
    expect(
      screen.getByRole("option", { name: /no items/i }),
    ).toBeInTheDocument();
  });

  it("should confirm selection", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderComponent("action", vi.fn(), onConfirm);

    await user.selectOptions(
      screen.getByRole("combobox", { name: /service/i }),
      "ServiceA",
    );
    await waitFor(() => {
      expect(mockGetActions).toHaveBeenCalled();
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /action/i }),
      "Do Something",
    );

    const addButton = screen.getByRole("button", { name: /add/i });
    expect(addButton).not.toBeDisabled();
    await user.click(addButton);

    expect(onConfirm).toHaveBeenCalledWith(mockServices[0], mockActions[0]);
  });

  it("should close on cancel", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderComponent("action", onClose, vi.fn());

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});

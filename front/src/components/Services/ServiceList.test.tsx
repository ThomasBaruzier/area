import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthContext } from "../../auth/AuthContext";
import { ConnectionsContext } from "../../auth/ConnectionsContext";
import { MetadataContext } from "../../context/MetadataContext";
import type { ActionOrReaction, Service } from "../../types/workflow";
import ServiceList from "./ServiceList";

vi.mock("../utils/fetchApi");

const mockServices: Service[] = [
  {
    id: 1,
    name: "GitHub",
    description: "Code hosting platform",
    connectUrl: "http://localhost:8080/auth/github",
  },
  {
    id: 2,
    name: "Discord",
    description: "Chat platform",
    connectUrl: "http://localhost:8080/auth/discord",
  },
];
const mockActions: ActionOrReaction[] = [
  { id: 10, name: "New Commit", type: "action", description: "" },
];

const mockGetActions = vi.fn().mockResolvedValue(mockActions);
const mockGetReactions = vi.fn().mockResolvedValue([]);
const mockIsConnected = (serviceName: string): boolean =>
  serviceName.toLowerCase() === "github";

const renderComponent = (): void => {
  render(
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        user: { id: "1", username: "test", email: "test@test.com" },
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
            connections: ["github"],
            isConnected: mockIsConnected,
            fetchConnections: vi.fn().mockResolvedValue(undefined),
          }}
        >
          <ServiceList />
        </ConnectionsContext.Provider>
      </MetadataContext.Provider>
    </AuthContext.Provider>,
  );
};

describe("ServiceList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: { assign: vi.fn() },
      writable: true,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("should render services and connection status", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: "GitHub" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Discord" }),
    ).toBeInTheDocument();

    const githubCard = screen.getByRole("button", { name: /github/i });
    expect(within(githubCard).getByText("Connected")).toBeInTheDocument();
    expect(within(githubCard).getByText("Reconnect")).toBeInTheDocument();

    const discordCard = screen.getByRole("button", { name: /discord/i });
    expect(within(discordCard).getByText("Disconnected")).toBeInTheDocument();
    expect(within(discordCard).getByText("Connect")).toBeInTheDocument();
  });

  it("should show loading skeletons", () => {
    render(
      <AuthContext.Provider
        value={{
          isAuthenticated: true,
          user: { id: "1", username: "test", email: "test@test.com" },
          token: "test-token",
          login: vi.fn(),
          logout: vi.fn(),
          isAdmin: false,
          role: "USER",
        }}
      >
        <MetadataContext.Provider
          value={{
            services: [],
            loading: true,
            error: null,
            getActions: vi.fn(),
            getReactions: vi.fn(),
            getService: vi.fn(),
            getActionName: vi.fn(),
            getReactionName: vi.fn(),
          }}
        >
          <ConnectionsContext.Provider
            value={{
              connections: [],
              isConnected: () => false,
              fetchConnections: vi.fn(),
            }}
          >
            <ServiceList />
          </ConnectionsContext.Provider>
        </MetadataContext.Provider>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(
      screen.getByRole("status").querySelectorAll(".skeleton").length,
    ).toBeGreaterThan(0);
  });

  it("should have correct href for connect click", () => {
    renderComponent();

    const connectButton = within(
      screen.getByRole("button", { name: /discord/i }),
    ).getByRole("link", { name: "Connect" });

    expect(connectButton).toHaveAttribute(
      "href",
      "http://localhost:8080/auth/discord?origin=web&token=test-token",
    );
  });

  it("should open modal on card click", async () => {
    const user = userEvent.setup();
    renderComponent();

    const githubCard = screen.getByRole("button", { name: /github/i });
    await user.click(githubCard);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "GitHub" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetActions).toHaveBeenCalledWith(1);
      expect(mockGetReactions).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByText("New Commit")).toBeInTheDocument();
  });

  it("should close modal on close click", async () => {
    const user = userEvent.setup();
    renderComponent();

    const githubCard = screen.getByRole("button", { name: /github/i });
    await user.click(githubCard);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "Close" });
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("should handle error when fetching service details", async () => {
    const user = userEvent.setup();
    mockGetActions.mockRejectedValue(new Error("Network error"));
    mockGetReactions.mockRejectedValue(new Error("Network error"));

    renderComponent();

    const githubCard = screen.getByRole("button", { name: /github/i });
    await user.click(githubCard);

    await screen.findByRole("dialog");

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith(
        "Failed to fetch service details",
        expect.any(Error),
      );
    });
  });

  it("should handle onKeyDown enter event to open modal", async () => {
    mockGetActions.mockResolvedValue(mockActions);
    mockGetReactions.mockResolvedValue([]);
    const user = userEvent.setup();
    renderComponent();

    const githubCard = screen.getByRole("button", { name: /github/i });
    githubCard.focus();
    expect(githubCard).toHaveFocus();

    await user.keyboard("{Enter}");

    await screen.findByRole("dialog");
  });

  it("should handle onKeyDown space event to open modal", async () => {
    mockGetActions.mockResolvedValue(mockActions);
    mockGetReactions.mockResolvedValue([]);
    const user = userEvent.setup();
    renderComponent();

    const githubCard = screen.getByRole("button", { name: /github/i });
    githubCard.focus();
    expect(githubCard).toHaveFocus();

    await user.keyboard(" ");

    await screen.findByRole("dialog");
  });

  it("should show 'No fields' when jsonFormat is empty", async () => {
    const user = userEvent.setup();

    mockGetActions.mockResolvedValueOnce([
      {
        id: 10,
        name: "New Commit",
        type: "action",
        description: "",
        jsonFormat: {},
      },
    ]);
    mockGetReactions.mockResolvedValueOnce([]);

    renderComponent();

    const githubCard = screen.getByRole("button", { name: /github/i });
    await user.click(githubCard);

    await screen.findByRole("dialog");

    await waitFor(() => {
      expect(screen.getByText("New Commit")).toBeInTheDocument();
    });

    expect(await screen.findByText("No fields")).toBeInTheDocument();
  });
});

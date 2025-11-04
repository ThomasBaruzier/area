import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import apiFetch from "../utils/fetchApi";
import { AuthContext } from "./AuthContext";
import { ConnectionsContext } from "./ConnectionsContext";
import { ConnectionsProvider } from "./ConnectionsProvider";

vi.mock("../utils/fetchApi");
const mockedApiFetch = vi.mocked(apiFetch);

const TestConsumer = (): ReactElement | null => {
  const context = useContext(ConnectionsContext);
  if (!context) return null;
  return (
    <div>
      <span>Connections: {context.connections.join(", ")}</span>
      <span>Is GitHub connected: {String(context.isConnected("GitHub"))}</span>
    </div>
  );
};

const renderWithAuth = (isAuthenticated: boolean): void => {
  render(
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user: null,
        token: null,
        role: null,
        isAdmin: false,
        login: vi.fn(),
        logout: vi.fn(),
      }}
    >
      <ConnectionsProvider>
        <TestConsumer />
      </ConnectionsProvider>
    </AuthContext.Provider>,
  );
};

describe("ConnectionsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.mocked(console.error).mockRestore();
  });

  it("should not fetch when unauthenticated", () => {
    renderWithAuth(false);
    expect(mockedApiFetch).not.toHaveBeenCalled();
    expect(screen.getByText("Connections:")).toBeInTheDocument();
  });

  it("should fetch when authenticated", async () => {
    mockedApiFetch.mockResolvedValue(["github", "google"]);
    renderWithAuth(true);
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/user/connections");
    expect(
      await screen.findByText("Connections: github, google"),
    ).toBeInTheDocument();
  });

  it("should handle fetch errors", async () => {
    mockedApiFetch.mockRejectedValue(new Error("API Error"));
    renderWithAuth(true);
    expect(await screen.findByText("Connections:")).toBeInTheDocument();
    expect(console.error).toHaveBeenCalled();
  });

  it("should clear connections on logout", async () => {
    mockedApiFetch.mockResolvedValue(["github"]);
    const { rerender } = render(
      <AuthContext.Provider
        value={{
          isAuthenticated: true,
          user: null,
          token: null,
          role: null,
          isAdmin: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <ConnectionsProvider>
          <TestConsumer />
        </ConnectionsProvider>
      </AuthContext.Provider>,
    );

    expect(await screen.findByText("Connections: github")).toBeInTheDocument();

    rerender(
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          user: null,
          token: null,
          role: null,
          isAdmin: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <ConnectionsProvider>
          <TestConsumer />
        </ConnectionsProvider>
      </AuthContext.Provider>,
    );

    expect(screen.getByText("Connections:")).toBeInTheDocument();
  });

  it("should provide a working isConnected function", async () => {
    mockedApiFetch.mockResolvedValue(["github", "discord"]);
    renderWithAuth(true);
    expect(
      await screen.findByText("Is GitHub connected: true"),
    ).toBeInTheDocument();
  });

  it("should be case-insensitive", async () => {
    mockedApiFetch.mockResolvedValue(["github"]);
    let isConnectedFunc: (serviceName: string) => boolean = () => false;

    render(
      <AuthContext.Provider
        value={{
          isAuthenticated: true,
          user: null,
          token: null,
          role: null,
          isAdmin: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <ConnectionsProvider>
          <ConnectionsContext.Consumer>
            {(value): null => {
              if (value) isConnectedFunc = value.isConnected;
              return null;
            }}
          </ConnectionsContext.Consumer>
        </ConnectionsProvider>
      </AuthContext.Provider>,
    );

    await vi.waitFor(() => {
      expect(isConnectedFunc("github")).toBe(true);
    });

    expect(isConnectedFunc("GITHUB")).toBe(true);
    expect(isConnectedFunc("gItHuB")).toBe(true);
    expect(isConnectedFunc("google")).toBe(false);
  });
});

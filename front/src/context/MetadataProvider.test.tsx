import { act, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { useContext } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import apiFetch from "../utils/fetchApi";
import { MetadataContext, type MetadataContextType } from "./MetadataContext";
import { MetadataProvider } from "./MetadataProvider";

vi.mock("../utils/fetchApi");
const mockedApiFetch = vi.mocked(apiFetch);

const mockServices = [
  { id: 1, name: "ServiceA" },
  { id: 2, name: "ServiceB" },
];
const mockActions = [{ id: 101, name: "ActionA", type: "action" }];
const mockReactions = [{ id: 201, name: "ReactionB", type: "reaction" }];

const TestConsumer = (): ReactElement | null => {
  const context = useContext(MetadataContext);
  if (!context) return null;
  return (
    <div>
      <span>Loading: {String(context.loading)}</span>
      <span>Error: {context.error ?? "null"}</span>
      <span>Services: {context.services.map((s) => s.name).join(", ")}</span>
      <span>Service 1: {context.getService(1)?.name ?? "not found"}</span>
      <span>Action Name: {context.getActionName(1, 101)}</span>
    </div>
  );
};

describe("MetadataProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiFetch.mockReset();
  });

  it("should initialize and fetch all metadata", async () => {
    mockedApiFetch
      .mockResolvedValueOnce(mockServices)
      .mockResolvedValueOnce(mockActions)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(mockReactions);

    render(
      <MetadataProvider>
        <TestConsumer />
      </MetadataProvider>,
    );

    expect(await screen.findByText("Loading: false")).toBeInTheDocument();
    expect(
      screen.getByText("Services: ServiceA, ServiceB"),
    ).toBeInTheDocument();
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/services");
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/actions/1");
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/reactions/1");
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/actions/2");
    expect(mockedApiFetch).toHaveBeenCalledWith("/api/reactions/2");
  });

  it("should handle API errors", async () => {
    mockedApiFetch.mockRejectedValue(new Error("Network Error"));
    render(
      <MetadataProvider>
        <TestConsumer />
      </MetadataProvider>,
    );
    expect(await screen.findByText("Error: Network Error")).toBeInTheDocument();
    expect(screen.getByText("Loading: false")).toBeInTheDocument();
  });

  it("should provide working helper functions", async () => {
    mockedApiFetch
      .mockResolvedValueOnce(mockServices)
      .mockResolvedValueOnce(mockActions)
      .mockResolvedValue([]);

    render(
      <MetadataProvider>
        <TestConsumer />
      </MetadataProvider>,
    );

    expect(await screen.findByText("Service 1: ServiceA")).toBeInTheDocument();
    expect(screen.getByText("Action Name: ActionA")).toBeInTheDocument();
  });

  it("should cache actions and reactions", async () => {
    mockedApiFetch.mockImplementation((path) => {
      if (path === "/api/services") return Promise.resolve(mockServices);
      if (path === "/api/actions/1") return Promise.resolve(mockActions);
      if (path === "/api/reactions/1") return Promise.resolve([]);
      if (path === "/api/actions/2") return Promise.resolve([]);
      if (path === "/api/reactions/2") return Promise.resolve([]);
      return Promise.resolve([]);
    });

    let contextValue: MetadataContextType | undefined;
    render(
      <MetadataProvider>
        <MetadataContext.Consumer>
          {(value): null => {
            contextValue = value;
            return null;
          }}
        </MetadataContext.Consumer>
      </MetadataProvider>,
    );

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockedApiFetch).toHaveBeenCalledTimes(5);
    mockedApiFetch.mockClear();

    if (contextValue) {
      const actions = await contextValue.getActions(1);
      expect(actions).toEqual(mockActions);
    }

    expect(mockedApiFetch).not.toHaveBeenCalled();
  });
});

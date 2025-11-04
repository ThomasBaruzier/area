import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../utils/fetchApi");

import apiFetch from "../utils/fetchApi";
import AboutPage from "./AboutPage";

const mockedApiFetch = vi.mocked(apiFetch);

const mockAboutData = {
  client: { host: "localhost:5173" },
  server: {
    current_time: 1672531200,
    services: [
      {
        name: "GitHub",
        actions: [
          { name: "New Commit", description: "Triggers on new commit" },
        ],
        reactions: [
          { name: "Create Issue", description: "Creates a new issue" },
        ],
      },
    ],
  },
};

describe("AboutPage", () => {
  it("should show loading state", () => {
    mockedApiFetch.mockImplementation(() => new Promise(() => {}));
    render(<AboutPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show error on fetch fail", async () => {
    mockedApiFetch.mockRejectedValue(new Error("API is down"));
    render(<AboutPage />);
    expect(await screen.findByText("API is down")).toBeInTheDocument();
  });

  it("should render data on success", async () => {
    mockedApiFetch.mockResolvedValue(mockAboutData);
    render(<AboutPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /about this area instance/i }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Host:")).toBeInTheDocument();
    expect(screen.getByText("localhost:5173")).toBeInTheDocument();

    expect(screen.getByText("Current Time:")).toBeInTheDocument();
    expect(
      screen.getByText(new Date(1672531200 * 1000).toLocaleString()),
    ).toBeInTheDocument();

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("New Commit:")).toBeInTheDocument();
    expect(screen.getByText("Triggers on new commit")).toBeInTheDocument();
    expect(screen.getByText("Create Issue:")).toBeInTheDocument();
    expect(screen.getByText("Creates a new issue")).toBeInTheDocument();
  });
});

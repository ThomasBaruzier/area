import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ServicesPage from "./ServiceList";

vi.mock("../components/Services/ServiceList", () => ({
  default: (): JSX.Element => <div data-testid="service-list-component" />,
}));

describe("ServicesPage", (): void => {
  it("renders the ServiceList component", (): void => {
    render(<ServicesPage />);
    expect(screen.getByTestId("service-list-component")).toBeInTheDocument();
  });
});

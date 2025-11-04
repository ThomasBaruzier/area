import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { PillNavItem } from "./PillNav";
import PillNav from "./PillNav";

const mockItems: PillNavItem[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

describe("PillNav", () => {
  it("renders navigation items correctly", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PillNav items={mockItems} />
      </MemoryRouter>,
    );

    const desktopNav = screen.getByRole("navigation", { name: "Primary" });
    const desktopList = within(desktopNav).getByRole("menubar");

    expect(
      within(desktopList).getByRole("menuitem", { name: "Home" }),
    ).toBeInTheDocument();
    expect(
      within(desktopList).getByRole("menuitem", { name: "About" }),
    ).toBeInTheDocument();
    expect(
      within(desktopList).getByRole("menuitem", { name: "Contact" }),
    ).toBeInTheDocument();
  });

  it("highlights the active link", () => {
    render(
      <MemoryRouter initialEntries={["/about"]}>
        <PillNav items={mockItems} />
      </MemoryRouter>,
    );

    const aboutLink = screen.getByRole("menuitem", { name: "About" });
    expect(aboutLink).toHaveClass("is-active");

    const desktopNav = screen.getByRole("navigation", { name: "Primary" });
    const desktopList = within(desktopNav).getByRole("menubar");
    const homeLink = within(desktopList).getByRole("menuitem", {
      name: "Home",
    });
    expect(homeLink).not.toHaveClass("is-active");
  });

  it("renders the logo", () => {
    render(
      <MemoryRouter>
        <PillNav items={mockItems} logoAlt="Test Logo" />
      </MemoryRouter>,
    );
    const homeElements = screen.getAllByRole("menuitem", { name: "Home" });
    expect(homeElements).toHaveLength(2);
    expect(homeElements[0]).toHaveClass("pill-logo");
  });

  it("toggles mobile menu on button click", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <PillNav items={mockItems} />
      </MemoryRouter>,
    );

    const mobileMenuButton = screen.getByRole("button", {
      name: "Toggle menu",
    });

    const popover =
      mobileMenuButton.parentElement?.parentElement?.nextElementSibling;
    expect(popover).toHaveStyle({ visibility: "hidden" });

    await user.click(mobileMenuButton);

    expect(popover).toHaveStyle({ visibility: "visible" });

    await user.click(mobileMenuButton);

    await vi.waitFor(() => {
      expect(popover).toHaveStyle({ visibility: "hidden" });
    });
  });
});

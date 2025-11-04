import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ThemeButton from "./ThemeButton";

describe("ThemeButton", () => {
  const originalLocalStorage = window.localStorage;
  let mockStorage: Record<string, string>;
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    mockStorage = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
    });
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  it("should change theme when system preference changes and no localStorage theme is set", async () => {
    let changeListeners: Array<(e: MediaQueryListEvent) => void> = [];

    const mockMediaQueryList = {
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(
        (event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            changeListeners.push(handler);
          }
        },
      ),
      removeEventListener: vi.fn(
        (event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            changeListeners = changeListeners.filter(
              (listener) => listener !== handler,
            );
          }
        },
      ),
      dispatchEvent: vi.fn(),
    };

    window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);

    document.documentElement.dataset.theme = "";
    mockStorage = {};

    render(<ThemeButton />);

    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => {
      mockMediaQueryList.matches = true;
      changeListeners.forEach((listener) => {
        listener({ matches: true } as unknown as MediaQueryListEvent);
      });
    });

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });

  it("should not change theme when system preference changes if localStorage theme is set", () => {
    let changeListeners: Array<(e: MediaQueryListEvent) => void> = [];

    const mockMediaQueryList = {
      matches: false,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(
        (event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            changeListeners.push(handler);
          }
        },
      ),
      removeEventListener: vi.fn(
        (event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            changeListeners = changeListeners.filter(
              (listener) => listener !== handler,
            );
          }
        },
      ),
      dispatchEvent: vi.fn(),
    };

    window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);

    mockStorage["theme"] = "light";
    document.documentElement.dataset.theme = "";

    render(<ThemeButton />);

    expect(document.documentElement.dataset.theme).toBe("light");

    changeListeners.forEach((listener) => {
      listener({ matches: true } as unknown as MediaQueryListEvent);
    });

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  describe("Initialization", () => {
    it("should initialize from localStorage if theme is set to dark", () => {
      mockStorage["theme"] = "dark";
      render(<ThemeButton />);
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(window.localStorage.getItem).toHaveBeenCalledWith("theme");
    });

    it("should use prefers-color-scheme: dark if no localStorage", () => {
      const mockMediaQueryList = {
        matches: true,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);

      render(<ThemeButton />);
      expect(document.documentElement.dataset.theme).toBe("dark");
    });

    it("should use prefers-color-scheme: light if no localStorage and media query does not match dark", () => {
      const mockMediaQueryList = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mockMediaQueryList);

      render(<ThemeButton />);
      expect(document.documentElement.dataset.theme).toBe("light");
    });
  });

  it("should toggle theme on click", async () => {
    const user = userEvent.setup();
    render(<ThemeButton />);

    expect(document.documentElement.dataset.theme).toBe("light");

    const button = screen.getByRole("button");
    await user.click(button);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "dark");

    await user.click(button);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.setItem).toHaveBeenCalledWith("theme", "light");
  });

  it("should have correct aria-label", async () => {
    const user = userEvent.setup();
    render(<ThemeButton />);

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Switch to dark theme");

    await user.click(button);
    expect(button).toHaveAttribute("aria-label", "Switch to light theme");
  });
});

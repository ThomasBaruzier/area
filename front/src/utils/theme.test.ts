import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyTheme, getInitialTheme } from "./theme";

describe("theme utils", () => {
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
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    Object.defineProperty(window, "localStorage", {
      value: originalLocalStorage,
    });
    window.matchMedia = originalMatchMedia;
    vi.clearAllMocks();
  });

  describe("getInitialTheme", () => {
    it("should return theme from localStorage if set", () => {
      mockStorage["theme"] = "dark";
      expect(getInitialTheme()).toBe("dark");
    });

    it('should return "dark" if prefers-color-scheme is dark and no localStorage', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-color-scheme: dark)",
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));
      expect(getInitialTheme()).toBe("dark");
    });

    it('should return "light" if prefers-color-scheme is not dark and no localStorage', () => {
      window.matchMedia = vi.fn().mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
      }));
      expect(getInitialTheme()).toBe("light");
    });

    it('should default to "dark" if localStorage access fails', () => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem: () => {
            throw new Error("Security error");
          },
        },
        writable: true,
      });
      expect(getInitialTheme()).toBe("dark");
    });
  });

  describe("applyTheme", () => {
    it("should set the data-theme attribute on the document element", () => {
      applyTheme("dark");
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
  });
});

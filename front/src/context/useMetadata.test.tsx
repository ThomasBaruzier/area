import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { MetadataContext } from "./MetadataContext";
import { useMetadata } from "./useMetadata";

describe("useMetadata", () => {
  it("should throw an error if used outside of MetadataProvider", () => {
    const originalError = console.error;
    console.error = vi.fn();
    expect(() => renderHook(() => useMetadata())).toThrow(
      "useMetadata must be used within a MetadataProvider",
    );
    console.error = originalError;
  });

  it("should return context value when used within provider", () => {
    const mockValue = {
      services: [],
      loading: false,
      error: null,
      getService: vi.fn(),
      getActions: vi.fn(),
      getReactions: vi.fn(),
      getActionName: vi.fn(),
      getReactionName: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <MetadataContext.Provider value={mockValue}>
        {children}
      </MetadataContext.Provider>
    );

    const { result } = renderHook(() => useMetadata(), { wrapper });
    expect(result.current).toBe(mockValue);
  });
});

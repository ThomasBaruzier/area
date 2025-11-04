import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useWorkflows } from "./useWorkflows";
import { WorkflowsContext } from "./WorkflowsContext";

describe("useWorkflows", () => {
  it("should throw an error if used outside of WorkflowsProvider", () => {
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => renderHook(() => useWorkflows())).toThrow(
      "useWorkflows must be used within a WorkflowsProvider",
    );

    console.error = originalError;
  });

  it("should return context value when used within provider", () => {
    const mockValue = {
      workflows: [],
      loading: false,
      error: null,
      createWorkflow: vi.fn(),
      updateWorkflow: vi.fn(),
      deleteWorkflow: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
      <WorkflowsContext.Provider value={mockValue}>
        {children}
      </WorkflowsContext.Provider>
    );

    const { result } = renderHook(() => useWorkflows(), { wrapper });
    expect(result.current).toBe(mockValue);
  });
});

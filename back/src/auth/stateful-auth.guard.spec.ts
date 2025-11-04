import type { ExecutionContext } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import type { CustomLogger } from "../logger/logger.service";
import { StatefulAuthGuard } from "./stateful-auth.guard";

const mockExecutionContext = (request: Partial<Request>) => {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request as Request),
      getResponse: jest.fn().mockReturnValue({} as Response),
      getNext: jest.fn().mockReturnValue({} as NextFunction),
    }),
    getClass: jest.fn().mockReturnValue({}),
    getHandler: jest.fn().mockReturnValue({}),
    getArgs: jest.fn().mockReturnValue([]),
    getArgByIndex: jest.fn().mockReturnValue(undefined),
    getType: jest.fn().mockReturnValue("http"),
    switchToRpc: jest.fn().mockReturnValue({}),
    switchToWs: jest.fn().mockReturnValue({}),
  } as unknown as ExecutionContext;
};

interface StatefulAuthGuardInstance {
  getAuthenticateOptions(context: ExecutionContext): object;
  canActivate?: (...args: unknown[]) => unknown;
}

describe("StatefulAuthGuard", () => {
  const Guard = StatefulAuthGuard("test");
  let guard: InstanceType<typeof Guard> & StatefulAuthGuardInstance;
  const mockLogger = { setContext: jest.fn(), debug: jest.fn() };

  beforeEach(() => {
    guard = new Guard(mockLogger as unknown as CustomLogger) as InstanceType<
      typeof Guard
    > &
      StatefulAuthGuardInstance;
  });

  it("should be an instance of AuthGuard", () => {
    expect(guard.canActivate).toBeDefined();
  });

  describe("getAuthenticateOptions", () => {
    it("should use existing state if provided", () => {
      const context = mockExecutionContext({
        query: { state: "existing-state" },
      });
      const options = guard.getAuthenticateOptions(context);
      expect(options).toEqual({ state: "existing-state" });
    });

    it("should create a default state (web) if no params are provided", () => {
      const context = mockExecutionContext({ query: {} });
      const options = guard.getAuthenticateOptions(context);
      const expectedState = Buffer.from(
        JSON.stringify({ origin: "web" }),
      ).toString("base64");
      expect(options).toEqual({ state: expectedState });
    });

    it("should create a mobile state if origin=mobile is provided", () => {
      const context = mockExecutionContext({ query: { origin: "mobile" } });
      const options = guard.getAuthenticateOptions(context);
      const expectedState = Buffer.from(
        JSON.stringify({ origin: "mobile" }),
      ).toString("base64");
      expect(options).toEqual({ state: expectedState });
    });

    it("should include token in state if provided", () => {
      const context = mockExecutionContext({ query: { token: "my-token" } });
      const options = guard.getAuthenticateOptions(context);
      const expectedState = Buffer.from(
        JSON.stringify({ origin: "web", token: "my-token" }),
      ).toString("base64");
      expect(options).toEqual({ state: expectedState });
    });

    it("should include both origin and token in state", () => {
      const context = mockExecutionContext({
        query: { origin: "mobile", token: "my-token" },
      });
      const options = guard.getAuthenticateOptions(context);
      const expectedState = Buffer.from(
        JSON.stringify({ origin: "mobile", token: "my-token" }),
      ).toString("base64");
      expect(options).toEqual({ state: expectedState });
    });
  });
});

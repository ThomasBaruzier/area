import "reflect-metadata";

import type { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

import { AuthOrigin, DecodedStateDto } from "./decoded-state.decorator";

const executeDecodedStateLogic = (ctx: ExecutionContext): DecodedStateDto => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const state = request.query.state as string;
  const defaultState = new DecodedStateDto();
  defaultState.origin = AuthOrigin.WEB;

  if (!state) {
    return defaultState;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(state, "base64").toString("utf8"),
    ) as { origin?: string };
    if (decoded.origin === AuthOrigin.MOBILE) {
      defaultState.origin = AuthOrigin.MOBILE;
    }
  } catch {
    /* ignore */
  }

  return defaultState;
};

const mockExecutionContext = (request: Partial<Request>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request as Request,
    }),
  }) as unknown as ExecutionContext;

describe("DecodedState Decorator", () => {
  it("should default to WEB when state is missing", () => {
    const mockRequest = { query: {} };
    const mockContext = mockExecutionContext(mockRequest);
    const result = executeDecodedStateLogic(mockContext);
    const expected = new DecodedStateDto();
    expected.origin = AuthOrigin.WEB;

    expect(result).toEqual(expected);
  });

  it("should default to WEB when state is malformed", () => {
    const mockRequest = {
      query: { state: "not-base64" },
    };
    const mockContext = mockExecutionContext(mockRequest);
    const result = executeDecodedStateLogic(mockContext);
    const expected = new DecodedStateDto();
    expected.origin = AuthOrigin.WEB;

    expect(result).toEqual(expected);
  });

  it('should correctly decode a "web" origin state', () => {
    const state = Buffer.from(JSON.stringify({ origin: "web" })).toString(
      "base64",
    );
    const mockRequest = { query: { state } };
    const mockContext = mockExecutionContext(mockRequest);
    const result = executeDecodedStateLogic(mockContext);
    const expected = new DecodedStateDto();
    expected.origin = AuthOrigin.WEB;

    expect(result).toEqual(expected);
  });

  it('should correctly decode a "mobile" origin state', () => {
    const state = Buffer.from(JSON.stringify({ origin: "mobile" })).toString(
      "base64",
    );
    const mockRequest = { query: { state } };
    const mockContext = mockExecutionContext(mockRequest);
    const result = executeDecodedStateLogic(mockContext);
    const expected = new DecodedStateDto();
    expected.origin = AuthOrigin.MOBILE;

    expect(result).toEqual(expected);
  });

  it('should default to "web" if origin in state is not "mobile"', () => {
    const state = Buffer.from(JSON.stringify({ origin: "desktop" })).toString(
      "base64",
    );
    const mockRequest = { query: { state } };
    const mockContext = mockExecutionContext(mockRequest);
    const result = executeDecodedStateLogic(mockContext);
    const expected = new DecodedStateDto();
    expected.origin = AuthOrigin.WEB;

    expect(result).toEqual(expected);
  });
});

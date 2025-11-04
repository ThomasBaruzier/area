import type { CallHandler, ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";
import { of } from "rxjs";
import { tap } from "rxjs/operators";

import type { CustomLogger } from "./logger.service";
import { LoggingInterceptor } from "./logging.interceptor";

export class TestController {}

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  const mockLogger: CustomLogger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    verbose: jest.fn(),
  } as unknown as CustomLogger;

  const createMockExecutionContext = (
    request: Partial<
      Request & {
        user?: { id?: number; email?: string };
      }
    >,
    response?: Partial<Response & { statusCode?: number }>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request as Request,
        getResponse: () => response as Response,
      }),
      getClass: () => TestController,
    }) as ExecutionContext;

  const createMockCallHandler = (response: unknown): CallHandler => ({
    handle: () => of(response),
  });

  beforeEach(() => {
    interceptor = new LoggingInterceptor(mockLogger);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should log request and response details", (done) => {
    const mockRequest = {
      method: "GET",
      url: "/test",
      ip: "127.0.0.1",
      headers: { "user-agent": "jest" },
    };
    const mockResponse = {
      statusCode: 200,
    };

    const mockExecutionContext = createMockExecutionContext(
      mockRequest,
      mockResponse,
    );
    const mockCallHandler = createMockCallHandler("test response");

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .pipe(
        tap(() => {
          expect(mockLogger.debug).toHaveBeenCalledTimes(2);
          expect(mockLogger.debug).toHaveBeenNthCalledWith(
            1,
            "--> GET /test - from 127.0.0.1",
            "TestController",
          );
          expect(mockLogger.debug).toHaveBeenNthCalledWith(
            2,
            expect.stringMatching(/<-- GET \/test 200 \[\d+ms\]/),
            "TestController",
          );
          done();
        }),
      )
      .subscribe();
  });

  it("should log user identifier if user is present on request", (done) => {
    const mockRequest = {
      method: "POST",
      url: "/data",
      ip: "::1",
      headers: { "user-agent": "jest" },
      user: { id: 123, email: "user@test.com" },
    };

    const mockExecutionContext = createMockExecutionContext(mockRequest, {
      statusCode: 201,
    });
    const mockCallHandler = createMockCallHandler({});

    interceptor
      .intercept(mockExecutionContext, mockCallHandler)
      .pipe(
        tap(() => {
          expect(mockLogger.debug).toHaveBeenNthCalledWith(
            1,
            "--> POST /data - from ::1 (User: 123)",
            "TestController",
          );
          expect(mockLogger.debug).toHaveBeenNthCalledWith(
            2,
            expect.stringMatching(/<-- POST \/data 201 \[\d+ms\]/),
            "TestController",
          );
          done();
        }),
      )
      .subscribe();
  });

  it("should not log if user agent is wget", () => {
    const mockRequest = {
      method: "GET",
      url: "/about.json",
      ip: "127.0.0.1",
      headers: { "user-agent": "Wget/1.20.3 (linux-gnu)" },
    };
    const mockExecutionContext = createMockExecutionContext(mockRequest);
    const mockCallHandler = createMockCallHandler("data");

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe();

    expect(mockLogger.debug).not.toHaveBeenCalled();
  });
});

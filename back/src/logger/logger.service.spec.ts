import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { CustomLogger } from "./logger.service";

describe("CustomLogger", () => {
  let logger: CustomLogger;
  let configService: ConfigService;
  let writeSpy: jest.SpyInstance;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomLogger,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    logger = module.get<CustomLogger>(CustomLogger);
    configService = module.get<ConfigService>(ConfigService);
    writeSpy = jest.spyOn(process.stdout, "write").mockImplementation();
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("should be defined", () => {
    expect(logger).toBeDefined();
  });

  it("should log a message", () => {
    logger.log("test message");
    expect(writeSpy).toHaveBeenCalled();
    const firstCallArgs = writeSpy.mock.calls[0] as [string];
    expect(firstCallArgs[0]).toContain("LOG");
    expect(firstCallArgs[0]).toContain("test message");
  });

  it("should log an error message and trace", () => {
    logger.error("error message", "stack trace");
    expect(writeSpy).toHaveBeenCalledTimes(2);
    const firstCallArgs = writeSpy.mock.calls[0] as [string];
    const secondCallArgs = writeSpy.mock.calls[1] as [string];
    expect(firstCallArgs[0]).toContain("ERROR");
    expect(firstCallArgs[0]).toContain("error message");
    expect(secondCallArgs[0]).toContain("stack trace");
  });

  it("should log a warning message", () => {
    logger.warn("warn message");
    expect(writeSpy).toHaveBeenCalled();
    const firstCallArgs = writeSpy.mock.calls[0] as [string];
    expect(firstCallArgs[0]).toContain("WARN");
    expect(firstCallArgs[0]).toContain("warn message");
  });

  describe("debug and verbose logging", () => {
    it("should log debug when DEBUG_LOGS is true", () => {
      jest.spyOn(configService, "get").mockReturnValue("true");
      const debugLogger = new CustomLogger(configService);
      debugLogger.debug("debug message");
      expect(writeSpy).toHaveBeenCalled();
      const firstCallArgs = writeSpy.mock.calls[0] as [string];
      expect(firstCallArgs[0]).toContain("DEBUG");
    });

    it("should not log debug when DEBUG_LOGS is not true", () => {
      jest.spyOn(configService, "get").mockReturnValue("false");
      const debugLogger = new CustomLogger(configService);
      debugLogger.debug("debug message");
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it("should log verbose when DEBUG_LOGS is true", () => {
      jest.spyOn(configService, "get").mockReturnValue("true");
      const verboseLogger = new CustomLogger(configService);
      verboseLogger.verbose("verbose message");
      expect(writeSpy).toHaveBeenCalled();
      const firstCallArgs = writeSpy.mock.calls[0] as [string];
      expect(firstCallArgs[0]).toContain("VERBOSE");
    });

    it("should not log verbose when DEBUG_LOGS is not true", () => {
      jest.spyOn(configService, "get").mockReturnValue(undefined);
      const verboseLogger = new CustomLogger(configService);
      verboseLogger.verbose("verbose message");
      expect(writeSpy).not.toHaveBeenCalled();
    });
  });

  it("should use the provided context", () => {
    logger.log("message", "MyContext");
    const firstCallArgs = writeSpy.mock.calls[0] as [string];
    expect(firstCallArgs[0]).toContain("[MyContext]");
  });

  it("should use the context set by setContext", () => {
    logger.setContext("GlobalContext");
    logger.log("message");
    const firstCallArgs = writeSpy.mock.calls[0] as [string];
    expect(firstCallArgs[0]).toContain("[GlobalContext]");
  });

  it("should stringify object messages", () => {
    const message = { key: "value" };
    logger.log(message);
    const firstCallArgs = writeSpy.mock.calls[0] as [string];
    expect(firstCallArgs[0]).toContain(JSON.stringify(message, null, 2));
  });
});

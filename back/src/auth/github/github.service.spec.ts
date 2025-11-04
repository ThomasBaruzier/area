import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { AxiosHeaders, type AxiosResponse } from "axios";
import { of, throwError } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { GithubService } from "./github.service";

type PrivateGithubService = {
  getWebhookUrl: () => string;
  ensureWebhook: (
    userId: number,
    token: string,
    owner: string,
    repo: string,
    requiredEvents: string[],
  ) => Promise<void>;
};

describe("GithubService", () => {
  let service: GithubService;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let configService: ConfigService;
  let logger: CustomLogger;

  const mockPrismaService = {
    serviceConnection: {
      findFirst: jest.fn(),
    },
    workflow: {
      findMany: jest.fn(),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
    get: jest.fn(),
    patch: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<GithubService>(GithubService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<CustomLogger>(CustomLogger);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createIssue", () => {
    const userId = 123;
    const payload = { title: "Dynamic Title", body: "Dynamic Body" };
    const reactionData = {
      owner: "testuser",
      repo: "testrepo",
      title: "{{title}}",
      body: "{{body}}",
    };

    it("should handle invalid reaction data", async () => {
      await service.createIssue(userId, payload, { invalid: "data" });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Invalid create_issue reaction data for user 123",
        ),
      );
    });

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await service.createIssue(userId, payload, reactionData);

      expect(logger.warn).toHaveBeenCalledWith(
        "No GitHub connection found for user 123. Cannot create issue.",
      );
    });

    it("should create issue successfully", async () => {
      const mockConnection = {
        token: "access_token",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      const mockResponse: AxiosResponse = {
        data: { id: 1 },
        status: 201,
        statusText: "Created",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.createIssue(userId, payload, reactionData);

      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.github.com/repos/testuser/testrepo/issues",
        {
          title: "Dynamic Title",
          body: "Dynamic Body",
        },
        {
          headers: {
            Authorization: "token access_token",
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      expect(logger.log).toHaveBeenCalledWith(
        "Successfully created issue on testuser/testrepo for user 123",
      );
    });

    it("should handle error when creating issue", async () => {
      const mockConnection = {
        token: "access_token",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      (httpService.post as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error("API Error")),
      );

      await service.createIssue(userId, payload, reactionData);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create GitHub issue for user 123 on testuser/testrepo: API Error",
        expect.any(String),
      );
    });
  });

  describe("createComment", () => {
    const userId = 123;
    const payload = { body: "Dynamic comment" };
    const reactionData = {
      owner: "testuser",
      repo: "testrepo",
      issue_number: 1,
      body: "{{body}}",
    };

    it("should handle invalid reaction data", async () => {
      await service.createComment(userId, payload, { invalid: "data" });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Invalid create_comment reaction data for user 123",
        ),
      );
    });

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await service.createComment(userId, payload, reactionData);

      expect(logger.warn).toHaveBeenCalledWith(
        "No GitHub connection found for user 123. Cannot create comment.",
      );
    });

    it("should create comment successfully", async () => {
      const mockConnection = {
        token: "access_token",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      const mockResponse: AxiosResponse = {
        data: { id: 1 },
        status: 201,
        statusText: "Created",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.createComment(userId, payload, reactionData);

      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.github.com/repos/testuser/testrepo/issues/1/comments",
        {
          body: "Dynamic comment",
        },
        {
          headers: {
            Authorization: "token access_token",
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      expect(logger.log).toHaveBeenCalledWith(
        "Successfully created comment on testuser/testrepo#1 for user 123",
      );
    });

    it("should handle error when creating comment", async () => {
      const mockConnection = {
        token: "access_token",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      (httpService.post as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error("API Error")),
      );

      await service.createComment(userId, payload, reactionData);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create comment for user 123 on testuser/testrepo#1: API Error",
        expect.any(String),
      );
    });
  });

  describe("createRelease", () => {
    const userId = 123;
    const payload = { tag: "v1.0.0" };
    const reactionData = {
      owner: "testuser",
      repo: "testrepo",
      tag_name: "v1.0.0",
      name: "Release {{tag}}",
      body: "Release body",
    };

    it("should handle invalid reaction data", async () => {
      await service.createRelease(userId, payload, { invalid: "data" });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Invalid create_release reaction data for user 123",
        ),
      );
    });

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await service.createRelease(userId, payload, reactionData);

      expect(logger.warn).toHaveBeenCalledWith(
        "No GitHub connection found for user 123. Cannot create release.",
      );
    });

    it("should create release successfully", async () => {
      const mockConnection = {
        token: "access_token",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      const mockResponse: AxiosResponse = {
        data: { id: 1 },
        status: 201,
        statusText: "Created",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      (httpService.post as jest.Mock).mockClear();

      await service.createRelease(userId, payload, reactionData);

      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.github.com/repos/testuser/testrepo/releases",
        {
          tag_name: "v1.0.0",
          name: "Release v1.0.0",
          body: "Release body",
          draft: false,
          prerelease: false,
        },
        {
          headers: {
            Authorization: "token access_token",
            "Content-Type": "application/json",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      expect(logger.log).toHaveBeenCalledWith(
        "Successfully created release on testuser/testrepo for user 123",
      );
    });

    it("should handle error when creating release", async () => {
      const mockConnection = {
        token: "access_token",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      (httpService.post as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error("API Error")),
      );

      await service.createRelease(userId, payload, reactionData);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to create GitHub release for user 123 on testuser/testrepo: API Error",
        expect.any(String),
      );
    });
  });

  describe("checkUrlRepoUser", () => {
    const mockUser = {
      id: 123,
      email: "test@example.com",
      username: "testuser",
      role: "USER" as const,
    };
    const mockWorkflow = {
      id: 1,
      userId: 123,
      action: { name: "push", service: { name: "github" } },
      actionJson: { owner: "testuser", repo: "testrepo" },
    };

    it("should return early if no GitHub workflows", async () => {
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([]);

      await service.checkUrlRepoUser(mockUser);

      expect(logger.debug).toHaveBeenCalledWith(
        "User 123 has no GitHub workflows, skipping webhook setup.",
      );
    });

    it("should return early if no GitHub token", async () => {
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        mockWorkflow,
      ]);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await service.checkUrlRepoUser(mockUser);

      expect(logger.warn).toHaveBeenCalledWith(
        "No GitHub token for user 123, cannot set up webhooks.",
      );
    });

    it("should process workflows and set up webhooks", async () => {
      const mockConnection = {
        userId: 123,
        token: "access_token",
      };

      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        mockWorkflow,
      ]);
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);

      jest
        .spyOn(service as unknown as PrivateGithubService, "ensureWebhook")
        .mockResolvedValue(undefined);

      await service.checkUrlRepoUser(mockUser);

      expect(
        (service as unknown as PrivateGithubService).ensureWebhook,
      ).toHaveBeenCalledWith(123, "access_token", "testuser", "testrepo", [
        "push",
      ]);
    });

    it("should aggregate events for the same repo", async () => {
      const mockConnection = { userId: 123, token: "access_token" };
      const workflows = [
        {
          id: 1,
          action: { name: "push" },
          actionJson: { owner: "test", repo: "repo1" },
        },
        {
          id: 2,
          action: { name: "issues" },
          actionJson: { owner: "test", repo: "repo1" },
        },
        {
          id: 3,
          action: { name: "push" },
          actionJson: { owner: "test", repo: "repo2" },
        },
      ];
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue(
        workflows,
      );
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValue(mockConnection);
      const ensureWebhookSpy = jest
        .spyOn(service as unknown as PrivateGithubService, "ensureWebhook")
        .mockResolvedValue(undefined);

      await service.checkUrlRepoUser(mockUser);

      expect(ensureWebhookSpy).toHaveBeenCalledTimes(2);
      expect(ensureWebhookSpy).toHaveBeenCalledWith(
        123,
        "access_token",
        "test",
        "repo1",
        expect.arrayContaining(["push", "issues"]),
      );
      expect(ensureWebhookSpy).toHaveBeenCalledWith(
        123,
        "access_token",
        "test",
        "repo2",
        ["push"],
      );
    });
  });

  describe("getWebhookUrl", () => {
    it("should return proxy URL if configured", () => {
      (configService.get as jest.Mock).mockReturnValue(
        "https://proxy.example.com",
      );
      (configService.getOrThrow as jest.Mock).mockReturnValue(
        "https://backend.example.com",
      );

      const result = (
        service as unknown as PrivateGithubService
      ).getWebhookUrl();
      expect(result).toBe("https://proxy.example.com/auth/github/webhooks");
    });

    it("should return backend URL if no proxy configured", () => {
      (configService.get as jest.Mock).mockReturnValue(null);
      (configService.getOrThrow as jest.Mock).mockReturnValue(
        "https://backend.example.com",
      );

      const result = (
        service as unknown as PrivateGithubService
      ).getWebhookUrl();
      expect(result).toBe("https://backend.example.com/auth/github/webhooks");
    });
  });

  describe("ensureWebhook", () => {
    const userId = 123;
    const token = "access_token";
    const owner = "testuser";
    const repo = "testrepo";
    const events = ["push"];

    it("should create new webhook if not exists", async () => {
      const mockResponse: AxiosResponse = {
        data: [],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.get as jest.Mock).mockReturnValue(of(mockResponse));

      const mockPostResponse: AxiosResponse = {
        data: { id: 123 },
        status: 201,
        statusText: "Created",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValue(of(mockPostResponse));
      (configService.get as jest.Mock).mockReturnValue("secret");

      (httpService.post as jest.Mock).mockClear();

      (configService.get as jest.Mock).mockReturnValueOnce(null);
      (configService.getOrThrow as jest.Mock).mockReturnValueOnce(
        "https://backend.example.com",
      );
      (configService.get as jest.Mock).mockReturnValueOnce("secret");

      await (service as unknown as PrivateGithubService).ensureWebhook(
        userId,
        token,
        owner,
        repo,
        events,
      );

      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.github.com/repos/testuser/testrepo/hooks",
        {
          name: "web",
          active: true,
          events: ["push"],
          config: {
            url: "https://backend.example.com/auth/github/webhooks",
            content_type: "json",
            secret: "secret",
          },
        },
        {
          headers: {
            Authorization: "token access_token",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
    });

    it("should update existing webhook if events differ", async () => {
      (httpService.get as jest.Mock).mockClear();
      (httpService.patch as jest.Mock).mockClear();
      (httpService.post as jest.Mock).mockClear();

      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "WEBHOOK_PROXY_URL") return null;
        if (key === "GITHUB_WEBHOOK_SECRET") return "secret";
        return null;
      });
      (configService.getOrThrow as jest.Mock).mockReturnValueOnce(
        "https://backend.example.com",
      );

      const mockResponse: AxiosResponse = {
        data: [
          {
            id: 123,
            config: { url: "https://backend.example.com/auth/github/webhooks" },
            events: ["issues"],
          },
        ],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.get as jest.Mock).mockReturnValueOnce(of(mockResponse));

      const mockPatchResponse: AxiosResponse = {
        data: { id: 123 },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.patch as jest.Mock).mockReturnValueOnce(
        of(mockPatchResponse),
      );

      await (service as unknown as PrivateGithubService).ensureWebhook(
        userId,
        token,
        owner,
        repo,
        events,
      );

      expect(httpService.patch).toHaveBeenCalledWith(
        "https://api.github.com/repos/testuser/testrepo/hooks/123",
        { events: ["push"] },
        {
          headers: {
            Authorization: "token access_token",
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
    });

    it("should skip if webhook exists with correct events", async () => {
      (httpService.get as jest.Mock).mockClear();
      (configService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === "WEBHOOK_PROXY_URL") return null;
        if (key === "GITHUB_WEBHOOK_SECRET") return "secret";
        return null;
      });
      (configService.getOrThrow as jest.Mock).mockReturnValueOnce(
        "https://backend.example.com",
      );
      (configService.get as jest.Mock)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce("secret");
      (configService.getOrThrow as jest.Mock).mockReturnValueOnce(
        "https://backend.example.com",
      );

      const mockResponse: AxiosResponse = {
        data: [
          {
            id: 123,
            config: { url: "https://backend.example.com/auth/github/webhooks" },
            events: ["push"],
          },
        ],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.get as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await (service as unknown as PrivateGithubService).ensureWebhook(
        userId,
        token,
        owner,
        repo,
        events,
      );

      expect(httpService.patch).not.toHaveBeenCalled();
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("should handle error during webhook operations", async () => {
      (httpService.get as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error("API Error")),
      );

      await expect(
        (service as unknown as PrivateGithubService).ensureWebhook(
          userId,
          token,
          owner,
          repo,
          events,
        ),
      ).rejects.toThrow("API Error");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to ensure webhook for testuser/testrepo for user 123: API Error",
      );
    });
  });
});

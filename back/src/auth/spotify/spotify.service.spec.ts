import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import { type ServiceConnection } from "@prisma/client";
import { AxiosHeaders, type AxiosResponse } from "axios";
import { of, throwError } from "rxjs";

import { CustomLogger } from "../../logger/logger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { SpotifyService } from "./spotify.service";

type PrivateSpotifyService = {
  refreshAccessToken: (connection: ServiceConnection) => Promise<string | null>;
  spotifyRequest: <T>(
    connection: ServiceConnection,
    requestFn: (token: string) => Promise<T>,
  ) => Promise<T | null>;
};

describe("SpotifyService", () => {
  let service: SpotifyService;
  let prismaService: PrismaService;
  let httpService: HttpService;
  let configService: ConfigService;
  let logger: CustomLogger;

  const mockPrismaService = {
    serviceConnection: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockHttpService = {
    post: jest.fn(),
    put: jest.fn(),
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpotifyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<SpotifyService>(SpotifyService);
    prismaService = module.get<PrismaService>(PrismaService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get<CustomLogger>(CustomLogger);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("refreshAccessToken", () => {
    const mockConnection: ServiceConnection = {
      id: 1,
      userId: 123,
      serviceId: 1,
      token: "old_token",
      refreshToken: "refresh_token",
      expiresAt: new Date(),
      webhookState: null,
      serviceUserIdentity: "test",
    };

    it("should return null if missing Spotify credentials", async () => {
      (configService.get as jest.Mock).mockReturnValueOnce(null);
      (configService.get as jest.Mock).mockReturnValueOnce("secret");

      const result = await (
        service as unknown as PrivateSpotifyService
      ).refreshAccessToken(mockConnection);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Missing Spotify credentials or refresh token for user.",
      );
    });

    it("should return null if refresh token is missing", async () => {
      (configService.get as jest.Mock).mockReturnValueOnce("client_id");
      (configService.get as jest.Mock).mockReturnValueOnce("client_secret");

      const connectionWithoutRefresh: ServiceConnection = {
        ...mockConnection,
        refreshToken: null,
      };
      const result = await (
        service as unknown as PrivateSpotifyService
      ).refreshAccessToken(connectionWithoutRefresh);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Missing Spotify credentials or refresh token for user.",
      );
    });

    it("should successfully refresh access token", async () => {
      (configService.get as jest.Mock).mockReturnValueOnce("client_id");
      (configService.get as jest.Mock).mockReturnValueOnce("client_secret");

      const mockResponse: AxiosResponse = {
        data: { access_token: "new_token" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      const result = await (
        service as unknown as PrivateSpotifyService
      ).refreshAccessToken(mockConnection);
      expect(result).toBe("new_token");
      expect(prismaService.serviceConnection.update).toHaveBeenCalledWith({
        where: { id: mockConnection.id },
        data: { token: "new_token" },
      });
      expect(logger.log).toHaveBeenCalledWith(
        "Refreshed Spotify access token for user 123",
      );
    });

    it("should return null if refresh request fails", async () => {
      (configService.get as jest.Mock).mockReturnValueOnce("client_id");
      (configService.get as jest.Mock).mockReturnValueOnce("client_secret");

      (httpService.post as jest.Mock).mockReturnValueOnce(
        throwError(() => new Error("Network error")),
      );

      const result = await (
        service as unknown as PrivateSpotifyService
      ).refreshAccessToken(mockConnection);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to refresh Spotify token: Network error",
      );
    });
  });

  describe("spotifyRequest", () => {
    const mockConnection: ServiceConnection = {
      id: 1,
      userId: 123,
      serviceId: 1,
      token: "valid_token",
      refreshToken: "refresh_token",
      expiresAt: new Date(),
      webhookState: null,
      serviceUserIdentity: "test",
    };

    it("should successfully execute request with valid token", async () => {
      const mockRequestFn = jest.fn().mockResolvedValue("success_result");
      const result = await (
        service as unknown as PrivateSpotifyService
      ).spotifyRequest(mockConnection, mockRequestFn);
      expect(result).toBe("success_result");
      expect(mockRequestFn).toHaveBeenCalledWith("valid_token");
    });

    it("should handle 401 error and refresh token", async () => {
      const mockRequestFn = jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce("retry_result");

      (configService.get as jest.Mock).mockReturnValueOnce("client_id");
      (configService.get as jest.Mock).mockReturnValueOnce("client_secret");

      const mockResponse: AxiosResponse = {
        data: { access_token: "new_token" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      const result = await (
        service as unknown as PrivateSpotifyService
      ).spotifyRequest(mockConnection, mockRequestFn);
      expect(result).toBe("retry_result");
      expect(logger.warn).toHaveBeenCalledWith(
        "Token expired for user 123, refreshing...",
      );
    });

    it("should return null for non-401 errors", async () => {
      const mockRequestFn = jest
        .fn()
        .mockRejectedValue(new Error("Other error"));

      const result = await (
        service as unknown as PrivateSpotifyService
      ).spotifyRequest(mockConnection, mockRequestFn);
      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith(
        "Spotify API request failed for user 123: Other error",
      );
    });
  });

  describe("setPlaybackVolume", () => {
    const userId = 123;
    const payload = { volume: 50 };
    const reactionData = { volume: "{{volume}}" };

    it("should handle invalid reaction data", async () => {
      const invalidReactionData = { invalidField: "invalid" };
      await service.setPlaybackVolume(userId, payload, invalidReactionData);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "Invalid change_volume reaction data for user 123",
        ),
      );
    });

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(null);
      await service.setPlaybackVolume(userId, payload, reactionData);
      expect(logger.warn).toHaveBeenCalledWith(
        "No Spotify connection found for user 123",
      );
    });

    it("should successfully set playback volume", async () => {
      const mockConnection: ServiceConnection = {
        id: 1,
        userId: 123,
        serviceId: 1,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        webhookState: null,
        serviceUserIdentity: "test",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(mockConnection);

      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.put as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.setPlaybackVolume(userId, payload, reactionData);
      expect(httpService.put).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/player/volume?volume_percent=50",
        null,
        { headers: { Authorization: "Bearer token" } },
      );
    });
  });

  describe("pausePlayback", () => {
    const userId = 123;

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(null);
      await service.pausePlayback(userId);
      expect(logger.warn).toHaveBeenCalledWith(
        "No Spotify connection found for user 123. Cannot pause playback.",
      );
    });

    it("should successfully pause playback", async () => {
      const mockConnection: ServiceConnection = {
        id: 1,
        userId: 123,
        serviceId: 1,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        webhookState: null,
        serviceUserIdentity: "test",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(mockConnection);

      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.put as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.pausePlayback(userId);
      expect(httpService.put).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/player/pause",
        null,
        { headers: { Authorization: "Bearer token" } },
      );
    });

    it("should handle pause error", async () => {
      const mockConnection: ServiceConnection = {
        id: 1,
        userId: 123,
        serviceId: 1,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        webhookState: null,
        serviceUserIdentity: "test",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(mockConnection);
      const mockError = Object.assign(new Error("Pause error"), {
        response: { status: 500 },
      });
      (httpService.put as jest.Mock).mockReturnValueOnce(
        throwError(() => mockError),
      );

      await service.pausePlayback(userId);
      expect(logger.error).toHaveBeenCalledWith(
        "Spotify API request failed for user 123: Pause error",
      );
    });
  });

  describe("skipToNext", () => {
    const userId = 123;

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(null);
      await service.skipToNext(userId);
      expect(logger.warn).toHaveBeenCalledWith(
        "No Spotify connection found for user 123. Cannot skip to next.",
      );
    });

    it("should successfully skip to next", async () => {
      const mockConnection: ServiceConnection = {
        id: 1,
        userId: 123,
        serviceId: 1,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        webhookState: null,
        serviceUserIdentity: "test",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(mockConnection);

      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.skipToNext(userId);
      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/player/next",
        null,
        { headers: { Authorization: "Bearer token" } },
      );
    });
  });

  describe("skipToPrevious", () => {
    const userId = 123;

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(null);
      await service.skipToPrevious(userId);
      expect(logger.warn).toHaveBeenCalledWith(
        "No Spotify connection found for user 123. Cannot skip to previous.",
      );
    });

    it("should successfully skip to previous", async () => {
      const mockConnection: ServiceConnection = {
        id: 1,
        userId: 123,
        serviceId: 1,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        webhookState: null,
        serviceUserIdentity: "test",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(mockConnection);

      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.skipToPrevious(userId);
      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/me/player/previous",
        null,
        { headers: { Authorization: "Bearer token" } },
      );
    });
  });

  describe("createPlaylist", () => {
    const userId = 123;
    const payload = { name: "Test Playlist" };
    const reactionData = {
      owner: "user123",
      name: "{{name}}",
      description: "Test desc",
      isPublic: "true",
    };

    it("should handle invalid reaction data", async () => {
      const invalidReactionData = { invalidField: "invalid" };
      await service.createPlaylist(userId, payload, invalidReactionData);
      expect(logger.warn).toHaveBeenCalledWith(
        "Invalid create_playlist data for 123",
      );
    });

    it("should handle missing connection", async () => {
      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(null);
      await service.createPlaylist(userId, payload, reactionData);
    });

    it("should successfully create playlist", async () => {
      const mockConnection: ServiceConnection = {
        id: 1,
        userId: 123,
        serviceId: 1,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(),
        webhookState: null,
        serviceUserIdentity: "test",
      };

      (
        prismaService.serviceConnection.findFirst as jest.Mock
      ).mockResolvedValueOnce(mockConnection);

      const mockResponse: AxiosResponse = {
        data: {},
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      };

      (httpService.post as jest.Mock).mockReturnValueOnce(of(mockResponse));

      await service.createPlaylist(userId, payload, reactionData);
      expect(httpService.post).toHaveBeenCalledWith(
        "https://api.spotify.com/v1/users/user123/playlists",
        {
          name: "Test Playlist",
          description: "Test desc",
          public: true,
        },
        {
          headers: {
            Authorization: "Bearer token",
            "Content-Type": "application/json",
          },
        },
      );
    });
  });
});

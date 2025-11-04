import { HttpService } from "@nestjs/axios";
import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { AxiosResponse } from "axios";
import { AxiosHeaders } from "axios";
import type { Server } from "http";
import { of } from "rxjs";
import request from "supertest";

import { AuthService } from "../../src/auth/auth.service";
import { GithubStrategy } from "../../src/auth/github/github.strategy";
import { GoogleStrategy } from "../../src/auth/google/google.strategy";
import type { PrismaService } from "../../src/prisma/prisma.service";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

type OAuth2TokenCallback = (
  err: Error | null,
  accessToken?: string,
  refreshToken?: string,
  results?: { expires_in: number },
) => void;

type UserProfileCallback = (err?: Error | null, profile?: unknown) => void;

describe("OAuth Flows (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let httpService: HttpService;
  let authService: AuthService;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    httpService = app.get<HttpService>(HttpService);
    authService = app.get<AuthService>(AuthService);
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    const googleStrategy = app.get<GoogleStrategy>(GoogleStrategy);

    const googleOauth2 = (googleStrategy as any)._oauth2;
    jest
      .spyOn(googleOauth2, "getOAuthAccessToken")
      .mockImplementation(
        (_code: string, _params: unknown, callback: OAuth2TokenCallback) => {
          callback(null, "google_access_token", "google_refresh_token", {
            expires_in: 3600,
          });
        },
      );

    jest
      .spyOn(googleStrategy, "userProfile")
      .mockImplementation((accessToken: string, done: UserProfileCallback) => {
        done(null, {
          id: "google-123",
          displayName: "New User",
          name: { givenName: "New" },
          emails: [{ value: "new.user@google.com", verified: "true" }],
        });
      });

    const githubStrategy = app.get<GithubStrategy>(GithubStrategy);

    const githubOauth2 = (githubStrategy as any)._oauth2;
    jest
      .spyOn(githubOauth2, "getOAuthAccessToken")
      .mockImplementation(
        (_code: string, _params: unknown, callback: OAuth2TokenCallback) => {
          callback(null, "github_access_token", "github_refresh_token");
        },
      );

    jest
      .spyOn(githubStrategy, "userProfile")
      .mockImplementation((accessToken: string, done: UserProfileCallback) => {
        done(null, {
          id: "98765",
          displayName: "GitHub User",
          username: "githubuser",
        });
      });
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    jest.clearAllMocks();
    await prisma.service.createMany({
      data: [
        { name: "google", description: "Google" },
        { name: "github", description: "GitHub" },
      ],
      skipDuplicates: true,
    });
  });

  it("should create a new user and service connection on successful Google OAuth callback", async () => {
    const state = Buffer.from(JSON.stringify({ origin: "web" })).toString(
      "base64",
    );

    const response = await request(app.getHttpServer() as Server)
      .get(`/auth/google/callback?code=mock_code&state=${state}`)
      .expect(302);

    expect(response.headers.location).toContain("/oauth-callback?token=");

    const user = await prisma.user.findUnique({
      where: { email: "new.user@google.com" },
    });
    if (!user) throw new Error("User not created");
    expect(user).not.toBeNull();
    expect(user.username).toBe("New");

    const connection = await prisma.serviceConnection.findFirst({
      where: { userId: user.id },
    });
    expect(connection).not.toBeNull();
  });

  it("should link a service to an existing user if a valid JWT is in the state", async () => {
    const existingUser = await prisma.user.create({
      data: {
        username: "existing_user",
        email: "existing@area.com",
        password: "password",
      },
    });
    const token = (await authService.createToken(existingUser)).access_token;

    jest.spyOn(httpService, "get").mockReturnValue(
      of({
        data: [
          { email: "github_user@email.com", primary: true, verified: true },
        ],
        status: 200,
        statusText: "OK",
        headers: {},
        config: { headers: new AxiosHeaders() },
      } satisfies AxiosResponse),
    );

    const state = Buffer.from(
      JSON.stringify({ origin: "web", token }),
    ).toString("base64");

    await request(app.getHttpServer() as Server)
      .get(`/auth/github/callback?code=mock_code&state=${state}`)
      .expect(302);

    const userCount = await prisma.user.count();
    expect(userCount).toBe(1);

    const connection = await prisma.serviceConnection.findFirst({
      where: { userId: existingUser.id, service: { name: "github" } },
    });
    expect(connection).not.toBeNull();
  });

  it("should redirect to the mobile app schema for mobile origins", async () => {
    const state = Buffer.from(JSON.stringify({ origin: "mobile" })).toString(
      "base64",
    );

    const response = await request(app.getHttpServer() as Server)
      .get(`/auth/google/callback?code=mock_code&state=${state}`)
      .expect(302);

    expect(response.headers.location).toMatch(
      /^area-app:\/\/oauth-callback\?token=/,
    );
  });

  it("should return 401 on OAuth failure", async () => {
    await request(app.getHttpServer() as Server)
      .get("/auth/google/callback?error=access_denied")
      .expect(401);
  });
});

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import * as crypto from "crypto";
import type { Server } from "http";
import request from "supertest";

import { GithubService } from "../../src/auth/github/github.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

describe("Webhooks (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let githubService: GithubService;
  let createIssueSpy: jest.SpyInstance;

  const GITHUB_WEBHOOK_SECRET = "test-secret";
  const TWITCH_WEBHOOK_SECRET = "twitch-secret";

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = GITHUB_WEBHOOK_SECRET;
    process.env.CLIENT_SECRET_TWITCH = TWITCH_WEBHOOK_SECRET;

    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    githubService = app.get<GithubService>(GithubService);

    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
    delete process.env.GITHUB_WEBHOOK_SECRET;
    delete process.env.CLIENT_SECRET_TWITCH;
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    createIssueSpy = jest
      .spyOn(githubService, "createIssue")
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    createIssueSpy.mockRestore();
  });

  describe("/auth/github/webhooks (POST)", () => {
    const pushPayload = {
      ref: "refs/heads/main",
      repository: {
        name: "test-repo",
        owner: {
          login: "test-owner",
        },
      },
      sender: {
        id: 12345,
      },
    };

    it("should reject webhook with invalid signature", () => {
      return request(app.getHttpServer() as Server)
        .post("/auth/github/webhooks")
        .set("X-GitHub-Event", "push")
        .set("X-Hub-Signature-256", "sha256=invalid")
        .send(pushPayload)
        .expect(400);
    });

    it("should accept webhook with valid signature and trigger reaction", async () => {
      const user = await prisma.user.create({
        data: {
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        },
      });
      const githubServiceDb = await prisma.service.create({
        data: { name: "github", description: "GitHub" },
      });
      const githubAction = await prisma.action.create({
        data: {
          name: "push",
          description: "On push",
          serviceId: githubServiceDb.id,
          jsonFormat: {},
        },
      });
      const githubReaction = await prisma.reaction.create({
        data: {
          name: "create_issue",
          description: "Create issue",
          serviceId: githubServiceDb.id,
          jsonFormat: {},
        },
      });
      await prisma.workflow.create({
        data: {
          userId: user.id,
          actionId: githubAction.id,
          actionJson: { owner: "test-owner", repo: "test-repo" },
          reactions: { connect: { id: githubReaction.id } },
          reactionsJson: [
            {
              owner: "test-owner",
              repo: "test-repo",
              title: "New Push!",
              body: "A new push was detected.",
            },
          ],
        },
      });
      await prisma.serviceConnection.create({
        data: {
          userId: user.id,
          serviceId: githubServiceDb.id,
          token: "fake-token",
          expiresAt: new Date(Date.now() + 3600000),
          serviceUserIdentity: "12345",
        },
      });

      const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
      const signature = `sha256=${hmac
        .update(JSON.stringify(pushPayload))
        .digest("hex")}`;

      await request(app.getHttpServer() as Server)
        .post("/auth/github/webhooks")
        .set("X-GitHub-Event", "push")
        .set("X-GitHub-Delivery", "test-delivery-id")
        .set("X-Hub-Signature-256", signature)
        .send(pushPayload)
        .expect(201);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(createIssueSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("/auth/twitch/webhook (POST)", () => {
    it("should handle verification challenge", () => {
      const body = { challenge: "test-challenge" };
      const messageId = "msg-id";
      const timestamp = new Date().toISOString();
      const message = messageId + timestamp + JSON.stringify(body);
      const hmac = crypto.createHmac("sha256", TWITCH_WEBHOOK_SECRET);
      const signature = `sha256=${hmac.update(message).digest("hex")}`;

      return request(app.getHttpServer() as Server)
        .post("/auth/twitch/webhook")
        .set("twitch-eventsub-message-type", "webhook_callback_verification")
        .set("twitch-eventsub-message-id", messageId)
        .set("twitch-eventsub-message-timestamp", timestamp)
        .set("twitch-eventsub-message-signature", signature)
        .send(body)
        .expect(200)
        .expect("test-challenge");
    });
  });
});

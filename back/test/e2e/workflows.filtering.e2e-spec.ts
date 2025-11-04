import type { INestApplication } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import type { Server } from "http";
import request from "supertest";

import { DiscordService } from "../../src/auth/discord/discord.service";
import { GithubService } from "../../src/auth/github/github.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { LoginResponseDto } from "../../src/users/dto/user.dto";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

describe("Workflow Filtering (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let sendMessageSpy: jest.SpyInstance;

  const GITHUB_WEBHOOK_SECRET = "e2e-filtering-secret";

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = GITHUB_WEBHOOK_SECRET;
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    const discordService = app.get<DiscordService>(DiscordService);
    sendMessageSpy = jest
      .spyOn(discordService, "sendMessage")
      .mockResolvedValue(undefined);
    const githubService = app.get<GithubService>(GithubService);
    jest.spyOn(githubService, "checkUrlRepoUser").mockResolvedValue(undefined);
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
    delete process.env.GITHUB_WEBHOOK_SECRET;
    sendMessageSpy.mockRestore();
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    const hashedPassword = await bcrypt.hash("password", 10);

    const user = await prisma.user.create({
      data: {
        username: "filter-user",
        email: "filter@example.com",
        password: hashedPassword,
      },
    });

    const loginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "filter@example.com", password: "password" });
    authToken = (loginRes.body as LoginResponseDto).access_token;

    const githubService = await prisma.service.create({
      data: { name: "github", description: "GitHub" },
    });
    const discordServiceDb = await prisma.service.create({
      data: { name: "discord", description: "Discord" },
    });

    await prisma.serviceConnection.create({
      data: {
        userId: user.id,
        serviceId: githubService.id,
        token: "fake-token",
        expiresAt: new Date(Date.now() + 1000 * 3600),
        serviceUserIdentity: "54321",
      },
    });

    const githubAction = await prisma.action.create({
      data: {
        name: "push",
        description: "On push",
        serviceId: githubService.id,
        jsonFormat: {},
      },
    });
    const discordReaction = await prisma.reaction.create({
      data: {
        name: "send_message",
        description: "Send a message",
        serviceId: discordServiceDb.id,
        jsonFormat: {},
      },
    });

    await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        action: {
          actionId: githubAction.id,
          actionBody: { owner: "owner", repo: "repo-A", branch: "main" },
        },
        reactions: [
          {
            reactionId: discordReaction.id,
            reactionBody: { channelId: "channel-A", message: "Push to repo-A" },
          },
        ],
      });

    await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        action: {
          actionId: githubAction.id,
          actionBody: { owner: "owner", repo: "repo-B", branch: "main" },
        },
        reactions: [
          {
            reactionId: discordReaction.id,
            reactionBody: { channelId: "channel-B", message: "Push to repo-B" },
          },
        ],
      });
  });

  it("should only trigger the workflow matching the repository", async () => {
    const pushPayload = {
      ref: "refs/heads/main",
      repository: { name: "repo-A", owner: { login: "owner" } },
      sender: { id: 54321 },
    };

    const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
    const signature = `sha256=${hmac.update(JSON.stringify(pushPayload)).digest("hex")}`;

    await request(app.getHttpServer() as Server)
      .post("/auth/github/webhooks")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", signature)
      .send(pushPayload)
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith(
      expect.any(Number),
      expect.any(Object),
      { channelId: "channel-A", message: "Push to repo-A" },
    );
  });
});

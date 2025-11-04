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

describe("Workflow Execution (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let discordService: DiscordService;
  let sendMessageSpy: jest.SpyInstance;

  const GITHUB_WEBHOOK_SECRET = "e2e-super-secret";

  beforeAll(async () => {
    process.env.GITHUB_WEBHOOK_SECRET = GITHUB_WEBHOOK_SECRET;
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    discordService = app.get<DiscordService>(DiscordService);
    const githubService = app.get<GithubService>(GithubService);
    jest.spyOn(githubService, "checkUrlRepoUser").mockResolvedValue(undefined);
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
    delete process.env.GITHUB_WEBHOOK_SECRET;
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await clearDatabase(prisma);

    sendMessageSpy = jest
      .spyOn(discordService, "sendMessage")
      .mockResolvedValue(undefined);

    const hashedPassword = await bcrypt.hash("password", 10);
    const user = await prisma.user.create({
      data: {
        username: "e2e-user",
        email: "e2e@example.com",
        password: hashedPassword,
      },
    });

    const loginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "e2e@example.com", password: "password" });
    authToken = (loginRes.body as LoginResponseDto).access_token;

    const githubService = await prisma.service.upsert({
      where: { name: "github" },
      update: {},
      create: { name: "github", description: "GitHub" },
    });
    const discordServiceDb = await prisma.service.upsert({
      where: { name: "discord" },
      update: {},
      create: { name: "discord", description: "Discord" },
    });

    await prisma.serviceConnection.create({
      data: {
        userId: user.id,
        serviceId: githubService.id,
        token: "fake-token",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        serviceUserIdentity: "12345",
      },
    });

    await prisma.action.upsert({
      where: { name_serviceId: { name: "push", serviceId: githubService.id } },
      update: {},
      create: {
        name: "push",
        description: "On push",
        serviceId: githubService.id,
        jsonFormat: {},
      },
    });
    await prisma.reaction.upsert({
      where: {
        name_serviceId: {
          name: "send_message",
          serviceId: discordServiceDb.id,
        },
      },
      update: {},
      create: {
        name: "send_message",
        description: "Send message",
        serviceId: discordServiceDb.id,
        jsonFormat: {},
      },
    });
  });

  afterEach(() => {
    sendMessageSpy.mockRestore();
  });

  it("should trigger a GitHub push -> Discord message workflow", async () => {
    const pushAction = await prisma.action.findFirst({
      where: { name: "push" },
    });
    if (!pushAction) throw new Error("Push action not found");

    const sendMessageReaction = await prisma.reaction.findFirst({
      where: { name: "send_message" },
    });
    if (!sendMessageReaction)
      throw new Error("send_message reaction not found");

    const workflowPayload = {
      action: {
        actionId: pushAction.id,
        actionBody: { owner: "test-owner", repo: "test-repo", branch: "main" },
      },
      reactions: [
        {
          reactionId: sendMessageReaction.id,
          reactionBody: {
            channelId: "12345",
            message: "New push on {{ repository.name }}!",
          },
        },
      ],
    };

    await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload)
      .expect(201);

    const pushPayload = {
      ref: "refs/heads/main",
      repository: {
        name: "test-repo",
        owner: { login: "test-owner" },
      },
      sender: {
        id: 12345,
      },
    };

    const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
    const signature = `sha256=${hmac.update(JSON.stringify(pushPayload)).digest("hex")}`;

    await request(app.getHttpServer() as Server)
      .post("/auth/github/webhooks")
      .set("X-GitHub-Event", "push")
      .set("X-GitHub-Delivery", "e2e-delivery-id")
      .set("X-Hub-Signature-256", signature)
      .send(pushPayload)
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith(
      expect.any(Number),
      pushPayload,
      {
        channelId: "12345",
        message: "New push on {{ repository.name }}!",
      },
    );
  });
});

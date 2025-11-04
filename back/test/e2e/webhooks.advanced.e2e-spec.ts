import type { INestApplication } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as crypto from "crypto";
import type { Server } from "http";
import request from "supertest";

import type { PrismaService } from "../../src/prisma/prisma.service";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

describe("Advanced Webhooks (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;
  let eventEmitterSpy: jest.SpyInstance;

  const TWITCH_SECRET = "test-twitch-secret";
  const GITHUB_WEBHOOK_SECRET = "test-secret";

  beforeAll(async () => {
    process.env.CLIENT_SECRET_TWITCH = TWITCH_SECRET;
    process.env.GITHUB_WEBHOOK_SECRET = GITHUB_WEBHOOK_SECRET;
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    eventEmitter = app.get<EventEmitter2>(EventEmitter2);
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
    delete process.env.CLIENT_SECRET_TWITCH;
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    eventEmitterSpy = jest.spyOn(eventEmitter, "emit");
  });

  afterEach(() => {
    eventEmitterSpy.mockRestore();
  });

  it("should not trigger a disabled workflow", async () => {
    const user = await prisma.user.create({
      data: { username: "test", email: "test@test.com" },
    });
    const service = await prisma.service.create({
      data: { name: "github", description: "" },
    });
    const action = await prisma.action.create({
      data: {
        name: "push",
        serviceId: service.id,
        description: "",
        jsonFormat: {},
      },
    });
    await prisma.workflow.create({
      data: {
        userId: user.id,
        actionId: action.id,
        actionJson: {},
        isEnabled: false,
      },
    });
    await prisma.serviceConnection.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        token: "token",
        expiresAt: new Date(Date.now() + 3600000),
        serviceUserIdentity: "12345",
      },
    });

    const payload = {
      ref: "refs/heads/main",
      repository: { name: "repo", owner: { login: "test" } },
      sender: { id: 12345 },
    };
    const signature = `sha256=${crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex")}`;

    await request(app.getHttpServer() as Server)
      .post("/auth/github/webhooks")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", signature)
      .send(payload);

    expect(eventEmitterSpy).not.toHaveBeenCalledWith(
      "reaction.execute",
      expect.anything(),
    );
  });

  it("should not trigger a reaction if the user has no service connection", async () => {
    const user = await prisma.user.create({
      data: { username: "test-no-conn", email: "test-no-conn@test.com" },
    });
    const service = await prisma.service.create({
      data: { name: "github", description: "" },
    });
    const action = await prisma.action.create({
      data: {
        name: "push",
        serviceId: service.id,
        description: "",
        jsonFormat: {},
      },
    });
    await prisma.workflow.create({
      data: {
        userId: user.id,
        actionId: action.id,
        actionJson: {},
        isEnabled: true,
      },
    });

    const payload = {
      ref: "refs/heads/main",
      repository: { name: "repo", owner: { login: "test-no-conn" } },
      sender: { id: 54321 },
    };
    const signature = `sha256=${crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET).update(JSON.stringify(payload)).digest("hex")}`;

    await request(app.getHttpServer() as Server)
      .post("/auth/github/webhooks")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", signature)
      .send(payload);

    expect(eventEmitterSpy).not.toHaveBeenCalledWith(
      "reaction.execute",
      expect.anything(),
    );
  });

  it("should handle Twitch webhook verification", async () => {
    const challenge = "test-challenge-string";
    const payload = { challenge };
    const messageId = "msg-id";
    const timestamp = new Date().toISOString();
    const message = messageId + timestamp + JSON.stringify(payload);
    const signature = `sha256=${crypto.createHmac("sha256", TWITCH_SECRET).update(message).digest("hex")}`;

    await request(app.getHttpServer() as Server)
      .post("/auth/twitch/webhook")
      .set("Twitch-Eventsub-Message-Id", messageId)
      .set("Twitch-Eventsub-Message-Timestamp", timestamp)
      .set("Twitch-Eventsub-Message-Signature", signature)
      .set("Twitch-Eventsub-Message-Type", "webhook_callback_verification")
      .send(payload)
      .expect(200)
      .expect(challenge);
  });

  it("should handle a Twitch notification and trigger a reaction", async () => {
    const user = await prisma.user.create({
      data: { username: "twitchy", email: "twitch@test.com" },
    });
    const service = await prisma.service.create({
      data: { name: "twitch", description: "" },
    });
    const action = await prisma.action.create({
      data: {
        name: "stream_online",
        serviceId: service.id,
        description: "",
        jsonFormat: {},
      },
    });
    const reaction = await prisma.reaction.create({
      data: {
        name: "test_reaction",
        description: "",
        serviceId: service.id,
        jsonFormat: {},
      },
    });
    await prisma.workflow.create({
      data: {
        userId: user.id,
        actionId: action.id,
        actionJson: {},
        identifier: "sub-123",
        reactions: {
          connect: { id: reaction.id },
        },
        reactionsJson: [{}],
      },
    });

    const payload = {
      subscription: { id: "sub-123", type: "stream.online" },
      event: { broadcaster_user_name: "test" },
    };
    const messageId = "msg-id-2";
    const timestamp = new Date().toISOString();
    const message = messageId + timestamp + JSON.stringify(payload);
    const signature = `sha256=${crypto.createHmac("sha256", TWITCH_SECRET).update(message).digest("hex")}`;

    await request(app.getHttpServer() as Server)
      .post("/auth/twitch/webhook")
      .set("Twitch-Eventsub-Message-Id", messageId)
      .set("Twitch-Eventsub-Message-Timestamp", timestamp)
      .set("Twitch-Eventsub-Message-Signature", signature)
      .set("Twitch-Eventsub-Message-Type", "notification")
      .send(payload)
      .expect(204);

    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(eventEmitterSpy).toHaveBeenCalledWith(
      "reaction.execute",
      expect.anything(),
    );
  });

  it("should handle Microsoft webhook validation", async () => {
    const validationToken = "validation-token-123";
    await request(app.getHttpServer() as Server)
      .post(`/auth/microsoft/outlook?validationToken=${validationToken}`)
      .send({})
      .expect(200)
      .expect(validationToken);
  });

  it("should handle a Google Pub/Sub webhook", async () => {
    const user = await prisma.user.create({
      data: { username: "googler", email: "google@test.com" },
    });
    const service = await prisma.service.create({
      data: { name: "google", description: "" },
    });
    const action = await prisma.action.create({
      data: {
        name: "mail_received",
        serviceId: service.id,
        description: "",
        jsonFormat: {},
      },
    });
    await prisma.workflow.create({
      data: { userId: user.id, actionId: action.id, actionJson: {} },
    });
    await prisma.serviceConnection.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        token: "token",
        refreshToken: "refresh",
        expiresAt: new Date(Date.now() + 3600000),
        serviceUserIdentity: "google@test.com",
      },
    });

    const pubsubPayload = {
      emailAddress: "google@test.com",
      historyId: "12345",
    };
    const encodedData = Buffer.from(JSON.stringify(pubsubPayload)).toString(
      "base64",
    );
    const payload = { message: { data: encodedData } };

    await request(app.getHttpServer() as Server)
      .post("/api/google/webhook")
      .send(payload)
      .expect(204);

    await new Promise((resolve) => setTimeout(resolve, 200));
  });
});

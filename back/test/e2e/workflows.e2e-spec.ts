import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";

import { GithubService } from "../../src/auth/github/github.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import type { LoginResponseDto } from "../../src/users/dto/user.dto";
import type { WorkflowDto } from "../../src/workflows/workflows.service";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

interface WorkflowPayload {
  action: {
    serviceId: number;
    actionId: number;
    actionBody: Record<string, unknown>;
  };
  reactions: Array<{
    serviceId: number;
    reactionId: number;
    reactionBody: Record<string, unknown>;
  }>;
}

describe("WorkflowsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    const githubService = app.get<GithubService>(GithubService);
    jest.spyOn(githubService, "checkUrlRepoUser").mockResolvedValue(undefined);
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await clearDatabase(prisma);

    await request(app.getHttpServer() as Server)
      .post("/api/user/register")
      .send({
        username: "testuser",
        email: "test@example.com",
        password: "password123",
      });

    const loginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "test@example.com", password: "password123" });
    authToken = (loginRes.body as LoginResponseDto).access_token;

    const githubServiceDb = await prisma.service.create({
      data: {
        name: "github",
        description: "GitHub",
      },
    });
    const googleService = await prisma.service.create({
      data: {
        name: "google",
        description: "Google",
      },
    });

    const action = await prisma.action.create({
      data: {
        name: "push",
        description: "On push",
        serviceId: githubServiceDb.id,
        jsonFormat: {},
      },
    });
    const reaction = await prisma.reaction.create({
      data: {
        name: "send_mail",
        description: "Send mail",
        serviceId: googleService.id,
        jsonFormat: {},
      },
    });

    workflowPayload = {
      action: {
        serviceId: githubServiceDb.id,
        actionId: action.id,
        actionBody: { repo: "test/repo" },
      },
      reactions: [
        {
          serviceId: googleService.id,
          reactionId: reaction.id,
          reactionBody: { to: "dest@mail.com" },
        },
      ],
    };
  });

  let workflowPayload: WorkflowPayload;

  it("should create a workflow and trigger action hook", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload)
      .expect(201)
      .then((res) => {
        const body = res.body as WorkflowDto;
        expect(body.id).toBeDefined();
        expect(body.action.actionId).toBe(workflowPayload.action.actionId);
      });
  });

  it("should create a workflow", () => {
    return request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload)
      .expect(201)
      .then((res) => {
        const body = res.body as WorkflowDto;
        expect(body.id).toBeDefined();
        expect(body.action.actionId).toBe(workflowPayload.action.actionId);
        expect(body.reactions[0].reactionId).toBe(
          workflowPayload.reactions[0].reactionId,
        );
      });
  });

  it("should list workflows for the authenticated user", async () => {
    await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload);

    return request(app.getHttpServer() as Server)
      .get("/api/workflow/list")
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200)
      .then((res) => {
        const body = res.body as WorkflowDto[];
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBe(1);
        expect(body[0].action.actionBody).toEqual({ repo: "test/repo" });
      });
  });

  it("should update a workflow", async () => {
    const createRes = await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload);

    const workflowId = (createRes.body as WorkflowDto).id;

    return request(app.getHttpServer() as Server)
      .patch(`/api/workflow/edit/${String(workflowId)}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ toggle: false })
      .expect(200)
      .then((res) => {
        expect((res.body as WorkflowDto).toggle).toBe(false);
      });
  });

  it("should delete a workflow", async () => {
    const createRes = await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload);

    const workflowId = (createRes.body as WorkflowDto).id;

    await request(app.getHttpServer() as Server)
      .delete(`/api/workflow/delete/${String(workflowId)}`)
      .set("Authorization", `Bearer ${authToken}`)
      .expect(200);

    const listRes = await request(app.getHttpServer() as Server)
      .get("/api/workflow/list")
      .set("Authorization", `Bearer ${authToken}`);

    expect((listRes.body as WorkflowDto[]).length).toBe(0);
  });

  it("should not allow a user to delete another user's workflow", async () => {
    const createRes = await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload);
    const workflowId = (createRes.body as WorkflowDto).id;

    await request(app.getHttpServer() as Server)
      .post("/api/user/register")
      .send({
        username: "otheruser",
        email: "other@example.com",
        password: "password123",
      });
    const otherLoginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "other@example.com", password: "password123" });
    const otherAuthToken = (otherLoginRes.body as LoginResponseDto)
      .access_token;

    return request(app.getHttpServer() as Server)
      .delete(`/api/workflow/delete/${String(workflowId)}`)
      .set("Authorization", `Bearer ${otherAuthToken}`)
      .expect(404);
  });

  it("should not allow a user to update another user's workflow", async () => {
    const createRes = await request(app.getHttpServer() as Server)
      .post("/api/workflow/create")
      .set("Authorization", `Bearer ${authToken}`)
      .send(workflowPayload);
    const workflowId = (createRes.body as WorkflowDto).id;

    await request(app.getHttpServer() as Server)
      .post("/api/user/register")
      .send({
        username: "otheruser",
        email: "other@example.com",
        password: "password123",
      });
    const otherLoginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "other@example.com", password: "password123" });
    const otherAuthToken = (otherLoginRes.body as LoginResponseDto)
      .access_token;

    return request(app.getHttpServer() as Server)
      .patch(`/api/workflow/edit/${String(workflowId)}`)
      .set("Authorization", `Bearer ${otherAuthToken}`)
      .send({ toggle: false })
      .expect(404);
  });
});

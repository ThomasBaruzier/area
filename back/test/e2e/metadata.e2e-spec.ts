import type { INestApplication } from "@nestjs/common";
import type { Reaction } from "@prisma/client";
import type { Server } from "http";
import request from "supertest";

import type { ActionInfo } from "../../src/actions/actions.service";
import type { PrismaService } from "../../src/prisma/prisma.service";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

interface ServiceInfo {
  id: number;
  name: string;
  connectUrl: string;
}

type ReactionInfo = Pick<
  Reaction,
  "id" | "name" | "description" | "jsonFormat"
>;

describe("Metadata Endpoints (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let serviceId: number;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
    const service = await prisma.service.create({
      data: {
        name: "test-service",
        description: "A test service",
        actions: {
          create: {
            name: "test-action",
            description: "A test action",
            jsonFormat: {},
          },
        },
        reactions: {
          create: {
            name: "test-reaction",
            description: "A test reaction",
            jsonFormat: {},
          },
        },
      },
    });
    serviceId = service.id;
  });

  it("/api/services (GET) should return a list of services", () => {
    return request(app.getHttpServer() as Server)
      .get("/api/services")
      .expect(200)
      .then((res) => {
        const body = res.body as ServiceInfo[];
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBeGreaterThan(0);
        expect(body[0]).toHaveProperty("id");
        expect(body[0]).toHaveProperty("name");
        expect(body[0]).toHaveProperty("connectUrl");
      });
  });

  it("/api/actions/:serviceId (GET) should return actions for a service", () => {
    return request(app.getHttpServer() as Server)
      .get(`/api/actions/${serviceId.toString()}`)
      .expect(200)
      .then((res) => {
        const body = res.body as ActionInfo[];
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBe(1);
        expect(body[0]).toHaveProperty("id");
        expect(body[0]).toHaveProperty("name", "test-action");
      });
  });

  it("/api/reactions/:serviceId (GET) should return reactions for a service", () => {
    return request(app.getHttpServer() as Server)
      .get(`/api/reactions/${serviceId.toString()}`)
      .expect(200)
      .then((res) => {
        const body = res.body as ReactionInfo[];
        expect(body).toBeInstanceOf(Array);
        expect(body.length).toBe(1);
        expect(body[0]).toHaveProperty("id");
        expect(body[0]).toHaveProperty("name", "test-reaction");
      });
  });
});

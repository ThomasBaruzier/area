import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";

import type { PrismaService } from "../../src/prisma/prisma.service";
import type { LoginResponseDto } from "../../src/users/dto/user.dto";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

describe("AuthController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    prisma = setup.prisma;
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await teardownTestApp(app);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  describe("/api/user/register (POST)", () => {
    it("should register a new user", () => {
      return request(app.getHttpServer() as Server)
        .post("/api/user/register")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        })
        .expect(201)
        .then((res) => {
          expect(res.body).toEqual({
            id: expect.any(Number),
            username: "testuser",
            email: "test@example.com",
            role: "USER",
          });
        });
    });

    it("should fail if email already exists", async () => {
      await prisma.user.create({
        data: {
          username: "existing",
          email: "test@example.com",
          password: "password",
        },
      });

      return request(app.getHttpServer() as Server)
        .post("/api/user/register")
        .send({
          username: "newuser",
          email: "test@example.com",
          password: "password123",
        })
        .expect(400);
    });
  });

  describe("/api/user/login (POST)", () => {
    beforeEach(async () => {
      await request(app.getHttpServer() as Server)
        .post("/api/user/register")
        .send({
          username: "testuser",
          email: "test@example.com",
          password: "password123",
        });
    });

    it("should login a user and return a token", () => {
      return request(app.getHttpServer() as Server)
        .post("/api/user/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(201)
        .then((res) => {
          const body = res.body as LoginResponseDto;
          expect(body).toHaveProperty("access_token");
          expect(body.user.email).toBe("test@example.com");
        });
    });

    it("should fail with incorrect password", () => {
      return request(app.getHttpServer() as Server)
        .post("/api/user/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);
    });
  });

  describe("Protected Routes", () => {
    it("should deny access to a protected route without a token", () => {
      return request(app.getHttpServer() as Server)
        .get("/api/user/connections")
        .expect(401);
    });

    it("should allow access to a protected route with a valid token", async () => {
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

      const token = (loginRes.body as LoginResponseDto).access_token;

      return request(app.getHttpServer() as Server)
        .get("/api/user/connections")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
    });
  });
});

import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import { Role } from "@prisma/client";
import * as bcrypt from "bcrypt";
import type { Server } from "http";
import request from "supertest";

import type { PrismaService } from "../../src/prisma/prisma.service";
import type { LoginResponseDto, UserDto } from "../../src/users/dto/user.dto";
import {
  clearDatabase,
  setupTestApp,
  teardownTestApp,
} from "../utils/test-setup";

describe("Admin User Management (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let userIdToManage: number;

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
    const hashedPassword = await bcrypt.hash("password123", 10);

    await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@area.com",
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        username: "user",
        email: "user@area.com",
        password: hashedPassword,
      },
    });
    userIdToManage = regularUser.id;

    const adminLoginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "admin@area.com", password: "password123" });
    adminToken = (adminLoginRes.body as LoginResponseDto).access_token;

    const userLoginRes = await request(app.getHttpServer() as Server)
      .post("/api/user/login")
      .send({ email: "user@area.com", password: "password123" });
    userToken = (userLoginRes.body as LoginResponseDto).access_token;
  });

  describe("/api/user/list (GET)", () => {
    it("should allow admin to list users", () => {
      return request(app.getHttpServer() as Server)
        .get("/api/user/list")
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          const body = res.body as UserDto[];
          expect(body).toBeInstanceOf(Array);
          expect(body.length).toBe(2);
          expect(body.find((u) => u.email === "admin@area.com")).toBeDefined();
        });
    });

    it("should forbid non-admin from listing users", () => {
      return request(app.getHttpServer() as Server)
        .get("/api/user/list")
        .set("Authorization", `Bearer ${userToken}`)
        .expect(401);
    });
  });

  describe("/api/user/admin/:id (PATCH)", () => {
    it("should allow admin to edit a user", () => {
      return request(app.getHttpServer() as Server)
        .patch(`/api/user/admin/${userIdToManage.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ username: "edited_user" })
        .expect(200)
        .then((res) => {
          expect((res.body as UserDto).username).toBe("edited_user");
        });
    });

    it("should forbid non-admin from editing a user", () => {
      return request(app.getHttpServer() as Server)
        .patch(`/api/user/admin/${userIdToManage.toString()}`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({ username: "edited_user" })
        .expect(401);
    });
  });

  describe("/api/user/admin/:id/promote (PATCH)", () => {
    it("should allow admin to promote a user", async () => {
      await request(app.getHttpServer() as Server)
        .patch(`/api/user/admin/${userIdToManage.toString()}/promote`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200)
        .then((res) => {
          expect((res.body as UserDto).role).toBe(Role.ADMIN);
        });

      const user = await prisma.user.findUnique({
        where: { id: userIdToManage },
      });
      expect(user?.role).toBe(Role.ADMIN);
    });
  });

  describe("/api/user/admin/:id (DELETE)", () => {
    it("should allow admin to delete a user", async () => {
      await request(app.getHttpServer() as Server)
        .delete(`/api/user/admin/${userIdToManage.toString()}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .expect(200);

      const user = await prisma.user.findUnique({
        where: { id: userIdToManage },
      });
      expect(user).toBeNull();
    });

    it("should forbid non-admin from deleting a user", () => {
      return request(app.getHttpServer() as Server)
        .delete(`/api/user/admin/${userIdToManage.toString()}`)
        .set("Authorization", `Bearer ${userToken}`)
        .expect(401);
    });
  });
});

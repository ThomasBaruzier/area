import { NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { PrismaService } from "../prisma/prisma.service";
import { ServiceConnectionService } from "./serviceConnection.service";

const mockPrismaService = {
  serviceConnection: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
  },
  service: {
    findUnique: jest.fn(),
  },
};

describe("ServiceConnectionService", () => {
  let service: ServiceConnectionService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceConnectionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceConnectionService>(ServiceConnectionService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createOrUpdateServiceConnection", () => {
    const connectionData = {
      userId: 1,
      serviceId: 1,
      token: "new-token",
      refreshToken: "new-refresh-token",
      expiresAt: new Date(),
      serviceUserIdentity: "user@service.com",
    };

    it("should update an existing connection for the same user", async () => {
      const existingConnection = { id: 1, ...connectionData };
      prisma.serviceConnection.findFirst.mockResolvedValue(existingConnection);
      prisma.serviceConnection.update.mockResolvedValue({
        ...existingConnection,
        token: "updated-token",
      });

      await service.createOrUpdateServiceConnection(connectionData);

      expect(prisma.serviceConnection.findFirst).toHaveBeenCalledWith({
        where: {
          userId: connectionData.userId,
          serviceId: connectionData.serviceId,
        },
      });
      expect(prisma.serviceConnection.update).toHaveBeenCalledWith({
        where: { id: existingConnection.id },
        data: {
          token: connectionData.token,
          refreshToken: connectionData.refreshToken,
          expiresAt: connectionData.expiresAt,
          serviceUserIdentity: connectionData.serviceUserIdentity,
        },
      });
      expect(prisma.serviceConnection.create).not.toHaveBeenCalled();
    });

    it("should create a new connection if one does not exist for the user", async () => {
      prisma.serviceConnection.findFirst.mockResolvedValue(null);
      prisma.serviceConnection.create.mockResolvedValue({
        id: 2,
        ...connectionData,
      });

      await service.createOrUpdateServiceConnection(connectionData);

      expect(prisma.serviceConnection.findFirst).toHaveBeenCalled();
      expect(prisma.serviceConnection.create).toHaveBeenCalledWith({
        data: {
          user: { connect: { id: connectionData.userId } },
          service: { connect: { id: connectionData.serviceId } },
          token: connectionData.token,
          refreshToken: connectionData.refreshToken,
          expiresAt: connectionData.expiresAt,
          serviceUserIdentity: connectionData.serviceUserIdentity,
        },
      });
      expect(prisma.serviceConnection.update).not.toHaveBeenCalled();
    });

    it("should create a new connection for a different user, even if the external account is the same", async () => {
      const connectionDataForUserB = {
        userId: 2,
        serviceId: 1,
        token: "token-for-B",
        refreshToken: "refresh-for-B",
        expiresAt: new Date(),
        serviceUserIdentity: "user@service.com",
      };

      prisma.serviceConnection.findFirst.mockResolvedValue(null);
      prisma.serviceConnection.create.mockResolvedValue({
        id: 99,
        ...connectionDataForUserB,
      });

      await service.createOrUpdateServiceConnection(connectionDataForUserB);

      expect(prisma.serviceConnection.findFirst).toHaveBeenCalledWith({
        where: {
          userId: connectionDataForUserB.userId,
          serviceId: connectionDataForUserB.serviceId,
        },
      });
      expect(prisma.serviceConnection.update).not.toHaveBeenCalled();
      expect(prisma.serviceConnection.create).toHaveBeenCalledWith({
        data: {
          user: { connect: { id: connectionDataForUserB.userId } },
          service: { connect: { id: connectionDataForUserB.serviceId } },
          token: connectionDataForUserB.token,
          refreshToken: connectionDataForUserB.refreshToken,
          expiresAt: connectionDataForUserB.expiresAt,
          serviceUserIdentity: connectionDataForUserB.serviceUserIdentity,
        },
      });
    });
  });

  describe("getServiceIdByName", () => {
    it("should return the service ID for a given name", async () => {
      const serviceName = "github";
      const serviceId = 1;
      prisma.service.findUnique.mockResolvedValue({ id: serviceId });

      const result = await service.getServiceIdByName(serviceName);

      expect(result).toBe(serviceId);
      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { name: serviceName },
        select: { id: true },
      });
    });

    it("should throw NotFoundException if service is not found", async () => {
      const serviceName = "nonexistent";
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.getServiceIdByName(serviceName)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

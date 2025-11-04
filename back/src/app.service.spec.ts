import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import type { AboutResponse } from "./app.service";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma/prisma.service";

const mockPrismaService = {
  service: {
    findMany: jest.fn(),
  },
};

describe("AppService", () => {
  let service: AppService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAbout", () => {
    it("should return about info with services", async () => {
      const clientHost = "127.0.0.1";
      const mockServices = [
        {
          name: "github",
          actions: [{ name: "push", description: "On push" }],
          reactions: [{ name: "create_issue", description: "Create issue" }],
        },
      ];
      prisma.service.findMany.mockResolvedValue(mockServices);

      const result: AboutResponse = await service.getAbout(clientHost);

      expect(prisma.service.findMany).toHaveBeenCalledWith({
        include: {
          actions: { select: { name: true, description: true } },
          reactions: { select: { name: true, description: true } },
        },
      });

      expect(result.client.host).toBe(clientHost);
      expect(
        Math.abs(result.server.current_time - Date.now() / 1000),
      ).toBeLessThan(2);
      expect(result.server.services).toEqual(mockServices);
    });

    it("should return about info with empty services", async () => {
      const clientHost = "192.168.1.1";
      prisma.service.findMany.mockResolvedValue([]);

      const result: AboutResponse = await service.getAbout(clientHost);

      expect(result.client.host).toBe(clientHost);
      expect(result.server.services).toEqual([]);
    });
  });
});

import { ConfigService } from "@nestjs/config";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Service as ServiceModel } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ServicesService } from "./services.service";

const mockPrismaService = {
  service: {
    findMany: jest.fn(),
  },
};

const mockConfigService = {
  getOrThrow: jest.fn().mockReturnValue("http://localhost:8080"),
};

describe("ServicesService", () => {
  let service: ServicesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getServices", () => {
    it("should return an array of services with connectUrl", async () => {
      const mockServices: Partial<ServiceModel>[] = [
        { id: 1, name: "github", description: "GitHub service" },
        { id: 2, name: "google", description: "Google service" },
      ];

      prisma.service.findMany.mockResolvedValue(mockServices);

      const result = await service.getServices();

      expect(result).toEqual([
        {
          ...mockServices[0],
          connectUrl: "http://localhost:8080/auth/github",
        },
        {
          ...mockServices[1],
          connectUrl: "http://localhost:8080/auth/google",
        },
      ]);
      expect(prisma.service.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          name: true,
          description: true,
        },
      });
    });
  });
});

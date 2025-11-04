import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Action } from "@prisma/client";

import { PrismaService } from "../prisma/prisma.service";
import { ActionsService } from "./actions.service";

const mockPrismaService = {
  action: {
    findMany: jest.fn(),
  },
};

describe("ActionsService", () => {
  let service: ActionsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ActionsService>(ActionsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getActionByServiceId", () => {
    it("should get actions by service ID", async () => {
      const serviceId = 1;
      const mockActions: Partial<Action>[] = [
        { id: 1, name: "action1", description: "Desc 1", jsonFormat: {} },
        { id: 2, name: "action2", description: "Desc 2", jsonFormat: {} },
      ];

      prisma.action.findMany.mockResolvedValue(mockActions);

      const result = await service.getActionByServiceId(serviceId);

      expect(result).toEqual(mockActions);
      expect(prisma.action.findMany).toHaveBeenCalledWith({
        where: { serviceId },
        select: {
          id: true,
          name: true,
          description: true,
          jsonFormat: true,
        },
      });
    });

    it("should return empty array for no actions", async () => {
      const serviceId = 2;
      prisma.action.findMany.mockResolvedValue([]);

      const result = await service.getActionByServiceId(serviceId);

      expect(result).toEqual([]);
      expect(prisma.action.findMany).toHaveBeenCalledWith({
        where: { serviceId },
        select: {
          id: true,
          name: true,
          description: true,
          jsonFormat: true,
        },
      });
    });
  });
});

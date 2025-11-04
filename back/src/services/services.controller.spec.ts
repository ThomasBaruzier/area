import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Service } from "@prisma/client";

import { ServicesController } from "./services.controller";
import { ServicesService } from "./services.service";

const mockServicesService = {
  getServices: jest.fn(),
};

type ServiceInfo = Pick<Service, "id" | "name" | "description"> & {
  connectUrl: string;
};

describe("ServicesController", () => {
  let controller: ServicesController;
  let servicesService: typeof mockServicesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController],
      providers: [{ provide: ServicesService, useValue: mockServicesService }],
    }).compile();

    controller = module.get<ServicesController>(ServicesController);
    servicesService = module.get(ServicesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getServices", () => {
    it("should get all services", async () => {
      const mockServices: ServiceInfo[] = [
        {
          id: 1,
          name: "service1",
          description: "desc1",
          connectUrl: "/auth/service1",
        },
      ];
      servicesService.getServices.mockResolvedValue(mockServices);

      const result = await controller.getServices();

      expect(result).toEqual(mockServices);
      expect(servicesService.getServices).toHaveBeenCalled();
    });
  });
});

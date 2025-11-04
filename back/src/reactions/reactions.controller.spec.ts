import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Reaction } from "@prisma/client";

import { ReactionsController } from "./reactions.controller";
import { TriggerService } from "./trigger.service";

const mockTriggerService = {
  getReactionsByServiceId: jest.fn(),
};

describe("ReactionsController", () => {
  let controller: ReactionsController;
  let triggerService: typeof mockTriggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReactionsController],
      providers: [{ provide: TriggerService, useValue: mockTriggerService }],
    }).compile();

    controller = module.get<ReactionsController>(ReactionsController);
    triggerService = module.get(TriggerService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getReactions", () => {
    it("should get reactions by service ID", async () => {
      const serviceId = 1;
      const mockReactions: Pick<
        Reaction,
        "id" | "name" | "description" | "jsonFormat"
      >[] = [
        {
          id: 1,
          name: "reaction1",
          description: "A reaction",
          jsonFormat: {},
        },
      ];
      triggerService.getReactionsByServiceId.mockResolvedValue(mockReactions);

      const result = await controller.getReactions(serviceId);

      expect(result).toEqual(mockReactions);
      expect(triggerService.getReactionsByServiceId).toHaveBeenCalledWith(
        serviceId,
      );
    });
  });
});

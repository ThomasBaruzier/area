import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { ActionsController } from "./actions.controller";
import type { ActionInfo } from "./actions.service";
import { ActionsService } from "./actions.service";

const mockActionsService = {
  getActionByServiceId: jest.fn(),
};

describe("ActionsController", () => {
  let controller: ActionsController;
  let actionsService: typeof mockActionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActionsController],
      providers: [{ provide: ActionsService, useValue: mockActionsService }],
    }).compile();

    controller = module.get<ActionsController>(ActionsController);
    actionsService = module.get(ActionsService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getActions", () => {
    it("should get actions by service ID", async () => {
      const serviceId = 1;
      const mockActions: ActionInfo[] = [
        {
          id: 1,
          name: "action1",
          description: "An action",
          jsonFormat: {},
        },
      ];
      actionsService.getActionByServiceId.mockResolvedValue(mockActions);

      const result = await controller.getActions(serviceId);

      expect(result).toEqual(mockActions);
      expect(actionsService.getActionByServiceId).toHaveBeenCalledWith(
        serviceId,
      );
    });
  });
});

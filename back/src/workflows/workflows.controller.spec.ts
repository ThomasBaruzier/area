import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import type { AuthenticatedRequest } from "../auth/auth.type";
import { CreateWorkflowDto } from "./dto/create-workflow.dto";
import { UpdateWorkflowDto } from "./dto/update.dto";
import { WorkflowsController } from "./workflows.controller";
import { WorkflowsService } from "./workflows.service";

const mockWorkflowsService = {
  getWorkflows: jest.fn(),
  createWorkflow: jest.fn(),
  deleteWorkflow: jest.fn(),
  updateWorkflow: jest.fn(),
};

const mockUser = {
  id: 1,
  username: "test",
  email: "test@test.com",
  role: "USER",
};
const mockReq = { user: mockUser } as AuthenticatedRequest;

describe("WorkflowsController", () => {
  let controller: WorkflowsController;
  let service: typeof mockWorkflowsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowsController],
      providers: [
        { provide: WorkflowsService, useValue: mockWorkflowsService },
      ],
    }).compile();

    controller = module.get<WorkflowsController>(WorkflowsController);
    service = module.get(WorkflowsService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getWorkflows", () => {
    it("should call getWorkflows on the service with the user id", async () => {
      service.getWorkflows.mockResolvedValue([]);
      await controller.getWorkflows(mockReq);
      expect(service.getWorkflows).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("createWorkflow", () => {
    it("should call createWorkflow on the service with the user id and dto", async () => {
      const dto = new CreateWorkflowDto();
      service.createWorkflow.mockResolvedValue({});
      await controller.createWorkflow(mockReq, dto);
      expect(service.createWorkflow).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe("deleteWorkflow", () => {
    it("should call deleteWorkflow on the service with the user id and workflow id", async () => {
      const workflowId = "1";
      service.deleteWorkflow.mockResolvedValue({});
      await controller.deleteWorkflow(workflowId, mockReq);
      expect(service.deleteWorkflow).toHaveBeenCalledWith(
        mockUser.id,
        +workflowId,
      );
    });
  });

  describe("updateWorkflow", () => {
    it("should call updateWorkflow on the service with user id, workflow id, and dto", async () => {
      const workflowId = "1";
      const dto = new UpdateWorkflowDto();
      service.updateWorkflow.mockResolvedValue({});
      await controller.updateWorkflow(workflowId, dto, mockReq);
      expect(service.updateWorkflow).toHaveBeenCalledWith(
        mockUser.id,
        +workflowId,
        dto,
      );
    });
  });
});

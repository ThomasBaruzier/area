import { NotFoundException } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Action, Reaction, Service, User, Workflow } from "@prisma/client";

import { GithubService } from "../auth/github/github.service";
import { GmailService } from "../auth/gmail/gmail.service";
import { MicrosoftService } from "../auth/microsoft/microsoft.service";
import { TwitchService } from "../auth/twitch/twitch.service";
import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { WorkflowsService } from "./workflows.service";

const mockPrismaService = {
  workflow: {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
};

const mockLogger = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockGithubService = {
  checkUrlRepoUser: jest.fn(),
};

const mockGmailService = {
  startWatch: jest.fn(),
};

const mockTwitchService = {
  checkTwitch: jest.fn(),
};

const mockMicrosoftService = {
  startWatch: jest.fn(),
  deleteSubscription: jest.fn(),
};

const mockService: Service = {
  id: 1,
  name: "github",
  description: "A service",
};

const mockAction: Action = {
  id: 1,
  name: "test_action",
  description: "A test action",
  jsonFormat: {},
  serviceId: 1,
};

const mockReaction: Reaction = {
  id: 1,
  name: "test_reaction",
  description: "A test reaction",
  jsonFormat: {},
  serviceId: 1,
};

const mockWorkflow: Workflow & {
  action: Action & { service: Service };
  reactions: Reaction[];
} = {
  id: 1,
  userId: 1,
  actionId: 1,
  actionJson: { key: "value" },
  identifier: null,
  reactionsJson: [{ rKey: "rValue" }],
  isEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  action: { ...mockAction, service: mockService },
  reactions: [mockReaction],
};

const mockUser: User = {
  id: 1,
  username: "test",
  email: "test@test.com",
  password: "pw",
  role: "USER",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("WorkflowsService", () => {
  let service: WorkflowsService;
  let prisma: typeof mockPrismaService;
  let githubService: typeof mockGithubService;
  let gmailService: typeof mockGmailService;
  let microsoftService: typeof mockMicrosoftService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CustomLogger, useValue: mockLogger },
        { provide: GithubService, useValue: mockGithubService },
        { provide: GmailService, useValue: mockGmailService },
        { provide: TwitchService, useValue: mockTwitchService },
        { provide: MicrosoftService, useValue: mockMicrosoftService },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
    prisma = module.get(PrismaService);
    githubService = module.get(GithubService);
    gmailService = module.get(GmailService);
    microsoftService = module.get(MicrosoftService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getWorkflows", () => {
    it("should get all workflows for a user", async () => {
      prisma.workflow.findMany.mockResolvedValue([mockWorkflow]);
      const result = await service.getWorkflows(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockWorkflow.id);
      expect(result[0].action.actionId).toBe(mockAction.id);
      expect(result[0].reactions[0].reactionId).toBe(mockReaction.id);
      expect(prisma.workflow.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          action: { include: { service: true } },
          reactions: true,
        },
      });
    });
  });

  describe("createWorkflow", () => {
    const createDto = {
      action: {
        actionId: 1,
        serviceId: 1,
        actionBody: { key: "value" },
      },
      reactions: [
        {
          reactionId: 1,
          serviceId: 1,
          reactionBody: { rKey: "rValue" },
        },
      ],
    };

    it("should create a workflow and trigger github check", async () => {
      prisma.workflow.create.mockResolvedValue(mockWorkflow);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.createWorkflow(1, createDto);

      expect(result.id).toBe(mockWorkflow.id);
      expect(prisma.workflow.create).toHaveBeenCalled();
      expect(githubService.checkUrlRepoUser).toHaveBeenCalledWith(mockUser);
      expect(gmailService.startWatch).not.toHaveBeenCalled();
    });

    it("should create a workflow and trigger gmail watch", async () => {
      const googleService = { id: 2, name: "google", description: "Google" };
      const googleAction = { ...mockAction, id: 2, service: googleService };
      const googleWorkflow = { ...mockWorkflow, action: googleAction };
      prisma.workflow.create.mockResolvedValue(googleWorkflow);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await service.createWorkflow(1, createDto);

      expect(prisma.workflow.create).toHaveBeenCalled();
      expect(gmailService.startWatch).toHaveBeenCalledWith(mockUser);
      expect(githubService.checkUrlRepoUser).not.toHaveBeenCalled();
    });

    it("should create a workflow and trigger microsoft watch", async () => {
      const microsoftServiceData = {
        id: 3,
        name: "microsoft",
        description: "Microsoft",
      };
      const microsoftAction = {
        ...mockAction,
        id: 3,
        service: microsoftServiceData,
      };
      const microsoftWorkflow = { ...mockWorkflow, action: microsoftAction };
      prisma.workflow.create.mockResolvedValue(microsoftWorkflow);
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await service.createWorkflow(mockUser.id, createDto);

      expect(prisma.workflow.create).toHaveBeenCalled();
      expect(microsoftService.startWatch).toHaveBeenCalledWith(
        mockUser.id,
        microsoftWorkflow.id,
      );
    });

    it("should not trigger checks if user is not found", async () => {
      prisma.workflow.create.mockResolvedValue(mockWorkflow);
      prisma.user.findUnique.mockResolvedValue(null);

      await service.createWorkflow(1, createDto);

      expect(gmailService.startWatch).not.toHaveBeenCalled();
      expect(githubService.checkUrlRepoUser).not.toHaveBeenCalled();
    });
  });

  describe("deleteWorkflow", () => {
    it("should delete a workflow", async () => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      prisma.workflow.delete.mockResolvedValue(mockWorkflow);

      const result = await service.deleteWorkflow(1, 1);

      expect(result.id).toBe(mockWorkflow.id);
      expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        include: { action: { include: { service: true } }, reactions: true },
      });
      expect(prisma.workflow.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it("should throw if workflow to delete is not found", async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(service.deleteWorkflow(1, 999)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.workflow.delete).not.toHaveBeenCalled();
    });
  });

  describe("updateWorkflow", () => {
    const userId = 1;
    const workflowId = 1;
    const updateDto = {
      toggle: false,
      action: {
        actionId: 2,
        serviceId: 1,
        actionBody: { newKey: "newValue" },
      },
    };
    const updatedWorkflow = {
      ...mockWorkflow,
      isEnabled: false,
      actionId: 2,
      action: { ...mockAction, id: 2, name: "updated_action" },
    };

    it("should update a workflow", async () => {
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      prisma.workflow.update.mockResolvedValue(updatedWorkflow);

      const result = await service.updateWorkflow(
        userId,
        workflowId,
        updateDto,
      );

      expect(prisma.workflow.findFirst).toHaveBeenCalledWith({
        where: { id: workflowId, userId },
      });
      expect(prisma.workflow.update).toHaveBeenCalledWith({
        where: { id: workflowId },
        data: {
          isEnabled: false,
          action: { connect: { id: 2 } },
          actionJson: { newKey: "newValue" },
        },
        include: { action: { include: { service: true } }, reactions: true },
      });
      expect(result.id).toBe(updatedWorkflow.id);
      expect(result.toggle).toBe(false);
      expect(result.action.actionId).toBe(2);
    });

    it("should throw if workflow to update is not found", async () => {
      prisma.workflow.findFirst.mockResolvedValue(null);

      await expect(
        service.updateWorkflow(userId, workflowId, updateDto),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.workflow.update).not.toHaveBeenCalled();
    });

    it("should partially update a workflow", async () => {
      const partialUpdateDto = { toggle: true };
      const updatedWf = { ...mockWorkflow, isEnabled: true };
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      prisma.workflow.update.mockResolvedValue(updatedWf);

      await service.updateWorkflow(userId, workflowId, partialUpdateDto);

      expect(prisma.workflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isEnabled: true },
        }),
      );
    });

    it("should update reactions", async () => {
      const reactionUpdateDto = {
        reactions: [
          {
            reactionId: 99,
            serviceId: 1,
            reactionBody: { data: "new" },
          },
        ],
      };
      prisma.workflow.findFirst.mockResolvedValue(mockWorkflow);
      prisma.workflow.update.mockResolvedValue(mockWorkflow);

      await service.updateWorkflow(userId, workflowId, reactionUpdateDto);

      expect(prisma.workflow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            reactions: {
              set: [],
              connect: [{ id: 99 }],
            },
            reactionsJson: [{ data: "new" }],
          },
        }),
      );
    });
  });
});

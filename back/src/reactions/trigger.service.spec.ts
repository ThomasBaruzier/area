import { EventEmitter2 } from "@nestjs/event-emitter";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { CustomLogger } from "../logger/logger.service";
import { PrismaService } from "../prisma/prisma.service";
import { TriggerService } from "./trigger.service";

describe("TriggerService", () => {
  let service: TriggerService;
  let prismaService: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    service: { findUnique: jest.fn() },
    action: { findFirst: jest.fn() },
    serviceConnection: { findMany: jest.fn() },
    workflow: { findMany: jest.fn() },
    reaction: { findMany: jest.fn() },
  };
  const mockEventEmitter = { emit: jest.fn() };
  const mockLogger = {
    setContext: jest.fn(),
    log: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TriggerService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: CustomLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<TriggerService>(TriggerService);
    prismaService = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    jest.clearAllMocks();
  });

  const mockService = { id: 1, name: "github" };
  const mockAction = { id: 1, name: "push" };
  const mockWorkflow = {
    id: 1,
    actionJson: { owner: "test", repo: "test-repo", branch: "main" },
    userId: 123,
    reactions: [{ id: 1, name: "create_issue", service: { name: "github" } }],
    reactionsJson: [{}],
    isEnabled: true,
  };
  const mockPayload = {
    ref: "refs/heads/main",
    repository: { name: "test-repo", owner: { login: "test" } },
  };

  describe("handleTrigger", () => {
    beforeEach(() => {
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockService,
      );
      (prismaService.action.findFirst as jest.Mock).mockResolvedValue(
        mockAction,
      );
    });

    it("should process a trigger via serviceUserIdentity", async () => {
      (prismaService.serviceConnection.findMany as jest.Mock).mockResolvedValue(
        [{ userId: 123 }],
      );
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        mockWorkflow,
      ]);

      await service.handleTrigger("github", "push", mockPayload, "test-owner");

      expect(prismaService.workflow.findMany).toHaveBeenCalledWith({
        where: {
          actionId: mockAction.id,
          isEnabled: true,
          userId: { in: [123] },
        },
        include: {
          reactions: { include: { service: true } },
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "reaction.execute",
        expect.anything(),
      );
    });

    it("should process a trigger via identifier", async () => {
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        mockWorkflow,
      ]);

      await service.handleTrigger(
        "github",
        "push",
        mockPayload,
        undefined,
        "sub-123",
      );

      expect(prismaService.workflow.findMany).toHaveBeenCalledWith({
        where: {
          actionId: mockAction.id,
          isEnabled: true,
          identifier: "sub-123",
        },
        include: {
          reactions: { include: { service: true } },
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        "reaction.execute",
        expect.anything(),
      );
    });

    it("should not trigger disabled workflows", async () => {
      (prismaService.serviceConnection.findMany as jest.Mock).mockResolvedValue(
        [{ userId: 123 }],
      );
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([]);

      await service.handleTrigger("github", "push", mockPayload, "test-owner");
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should trigger multiple matching workflows", async () => {
      const anotherWorkflow = { ...mockWorkflow, id: 2 };
      (prismaService.serviceConnection.findMany as jest.Mock).mockResolvedValue(
        [{ userId: 123 }],
      );
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        mockWorkflow,
        anotherWorkflow,
      ]);

      await service.handleTrigger("github", "push", mockPayload, "test-owner");
      expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    });

    it("should not trigger if payload does not match workflow config", async () => {
      const nonMatchingWorkflow = {
        ...mockWorkflow,
        actionJson: { ...mockWorkflow.actionJson, branch: "develop" },
      };
      (prismaService.serviceConnection.findMany as jest.Mock).mockResolvedValue(
        [{ userId: 123 }],
      );
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        nonMatchingWorkflow,
      ]);

      await service.handleTrigger("github", "push", mockPayload, "test-owner");
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should return early if service or action is not found", async () => {
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(null);
      await service.handleTrigger(
        "nonexistent",
        "push",
        mockPayload,
        "test-owner",
      );
      expect(prismaService.action.findFirst).not.toHaveBeenCalled();

      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockService,
      );
      (prismaService.action.findFirst as jest.Mock).mockResolvedValue(null);
      await service.handleTrigger(
        "github",
        "nonexistent",
        mockPayload,
        "test-owner",
      );
      expect(prismaService.workflow.findMany).not.toHaveBeenCalled();
    });
  });

  describe("Workflow Matching Logic", () => {
    beforeEach(() => {
      (prismaService.service.findUnique as jest.Mock).mockResolvedValue(
        mockService,
      );
      (prismaService.serviceConnection.findMany as jest.Mock).mockResolvedValue(
        [{ userId: 123 }],
      );
    });

    it("should not trigger for non-matching GitHub branch", async () => {
      (prismaService.action.findFirst as jest.Mock).mockResolvedValue({
        id: 1,
        name: "push",
      });
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockWorkflow,
          actionJson: { branch: "develop" },
        },
      ]);
      await service.handleTrigger("github", "push", mockPayload, "test-owner");
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should not trigger for GitHub issue without required label", async () => {
      (prismaService.action.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        name: "issues",
      });
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockWorkflow,
          actionJson: { label: "bug" },
        },
      ]);
      const issuePayload = {
        action: "opened",
        repository: { owner: { login: "test" } },
        issue: { labels: [] },
      };
      await service.handleTrigger(
        "github",
        "issues",
        issuePayload,
        "test-owner",
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should not trigger for non-matching email sender", async () => {
      (prismaService.action.findFirst as jest.Mock).mockResolvedValue({
        id: 3,
        name: "mail_received",
      });
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockWorkflow,
          actionJson: { from: "noreply@google.com" },
        },
      ]);
      const mailPayload = { from: "user@gmail.com", subject: "Hello" };
      await service.handleTrigger(
        "google",
        "mail_received",
        mailPayload,
        "test-owner",
      );
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("should trigger for matching email subject", async () => {
      (prismaService.action.findFirst as jest.Mock).mockResolvedValue({
        id: 3,
        name: "mail_received",
      });
      (prismaService.workflow.findMany as jest.Mock).mockResolvedValue([
        {
          ...mockWorkflow,
          actionJson: { subject: "Update" },
        },
      ]);
      const mailPayload = {
        from: "user@gmail.com",
        subject: "Security Update",
      };
      await service.handleTrigger(
        "google",
        "mail_received",
        mailPayload,
        "test-owner",
      );
      expect(eventEmitter.emit).toHaveBeenCalled();
    });
  });

  describe("getReactionsByServiceId", () => {
    it("should return reactions for a service", async () => {
      const mockReactions = [
        { id: 1, name: "test_reaction", description: "Test", jsonFormat: {} },
      ];
      (prismaService.reaction.findMany as jest.Mock).mockResolvedValue(
        mockReactions,
      );

      const result = await service.getReactionsByServiceId(1);
      expect(result).toEqual(mockReactions);
      expect(prismaService.reaction.findMany).toHaveBeenCalledWith({
        where: { serviceId: 1 },
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

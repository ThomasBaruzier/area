import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Request, Response } from "express";

import { CustomLogger } from "../../logger/logger.service";
import type { OAuthUser } from "../auth.service";
import { AuthService } from "../auth.service";
import { DecodedStateDto } from "../decoded-state.decorator";
import { MicrosoftController } from "./microsoft.controller";
import { MicrosoftService } from "./microsoft.service";
import type { MicrosoftGraphNotificationBody } from "./microsoft.types";

jest.mock("../auth.service");
jest.mock("./microsoft.service");
jest.mock("../../logger/logger.service");

describe("MicrosoftController", () => {
  let controller: MicrosoftController;
  let authService: jest.Mocked<AuthService>;
  let microsoftService: jest.Mocked<MicrosoftService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MicrosoftController],
      providers: [AuthService, MicrosoftService, CustomLogger],
    }).compile();

    controller = module.get<MicrosoftController>(MicrosoftController);
    authService = module.get(AuthService);
    microsoftService = module.get(MicrosoftService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("microsoftCallback", () => {
    it("should call authService.handleOAuthCallback", async () => {
      const req = {
        user: {
          identity: "123",
          email: "test@example.com",
          firstName: "Test",
          accessToken: "token",
          refreshToken: "refresh",
        } as OAuthUser,
      } as Request & { user: OAuthUser };
      const res = {} as Response;
      const state = new DecodedStateDto();

      await controller.microsoftCallback(req, res, state);

      expect(authService.handleOAuthCallback).toHaveBeenCalledWith(
        req.user,
        "microsoft",
        expect.any(Number),
        state,
        res,
      );
    });
  });

  describe("outlookactions", () => {
    it("should call microsoftService.mailReceived with the correct arguments", async () => {
      const body: MicrosoftGraphNotificationBody = {
        value: [
          {
            subscriptionId: "sub123",
            changeType: "created",
            resource: "some/resource",
            resourceData: {
              id: "res123",
              "@odata.type": "#Microsoft.Graph.Message",
            },
          },
        ],
      };
      const req = { body } as Request;
      const res = {} as Response;

      await controller.outlookactions(req, res, body);

      expect(microsoftService.mailReceived).toHaveBeenCalledWith(
        req,
        res,
        body,
      );
    });
  });
});

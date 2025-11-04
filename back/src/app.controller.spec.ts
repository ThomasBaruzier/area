import type { INestApplication } from "@nestjs/common";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { Request } from "express";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CustomLogger } from "./logger/logger.service";

describe("AppController", () => {
  let app: INestApplication;
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            getAbout: jest.fn(),
          },
        },
        {
          provide: CustomLogger,
          useValue: {
            setContext: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    appController = moduleRef.get<AppController>(AppController);
    appService = moduleRef.get<AppService>(AppService);
  });

  describe("getAbout", () => {
    it("should call appService.getAbout with the client's IP", async () => {
      const mockReq = {
        ip: "127.0.0.1",
        headers: { "user-agent": "jest-test" },
      } as unknown as Request;
      await appController.getAbout(mockReq);
      expect(appService.getAbout).toHaveBeenCalledWith("127.0.0.1");
    });
  });
});

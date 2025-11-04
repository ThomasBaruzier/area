import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";

import { DiscordGatewayModule } from "./discord.gateway.module";

describe("DiscordGatewayModule", () => {
  let module: DiscordGatewayModule;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [DiscordGatewayModule],
    }).compile();

    module = moduleRef.get<DiscordGatewayModule>(DiscordGatewayModule);
  });

  it("should be defined", () => {
    expect(module).toBeDefined();
  });
});

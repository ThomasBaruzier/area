import { Global, Module, Scope } from "@nestjs/common";

import { CustomLogger } from "./logger.service";

@Global()
@Module({
  providers: [
    {
      provide: CustomLogger,
      useClass: CustomLogger,
      scope: Scope.TRANSIENT,
    },
  ],
  exports: [CustomLogger],
})
export class LoggerModule {}

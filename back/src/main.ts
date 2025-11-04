import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as express from "express";
import type { IncomingMessage } from "http";

import { AppModule } from "./app.module";
import { CustomLogger } from "./logger/logger.service";
import { LoggingInterceptor } from "./logger/logging.interceptor";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });

  const logger = await app.resolve(CustomLogger);
  app.useLogger(logger);

  app.use(
    express.json({
      verify: (req: IncomingMessage & { rawBody?: Buffer }, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor(logger));

  app.set("trust proxy", true);
  app.useGlobalPipes(new ValidationPipe());
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle("Area example")
    .setDescription("The area API description")
    .setVersion("1.0")
    .addTag("Area")
    .build();
  const documentFactory = (): OpenAPIObject =>
    SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, documentFactory);

  const port = process.env.PORT || "3000";
  await app.listen(port);
  logger.log(`Server listening on port ${port}`, "Bootstrap");
}
bootstrap().catch((err: unknown) => {
  console.error("Failed to bootstrap application", err);
  process.exit(1);
});

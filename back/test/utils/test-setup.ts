import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { TestingModule } from "@nestjs/testing";
import { Test } from "@nestjs/testing";
import type { PrismaClient } from "@prisma/client";
import * as express from "express";
import type { IncomingMessage } from "http";

import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/prisma/prisma.service";

export async function setupTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>({
    bodyParser: false,
  });
  app.use(
    express.json({
      verify: (req: IncomingMessage & { rawBody?: Buffer }, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  const prisma = app.get<PrismaService>(PrismaService);
  return { app, prisma };
}

export async function teardownTestApp(app: INestApplication): Promise<void> {
  if (app) {
    await app.close();
  }
}

export async function clearDatabase(prisma: PrismaClient): Promise<void> {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== "_prisma_migrations")
    .map((name) => `"public"."${name}"`)
    .join(", ");

  try {
    if (tables) {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    }
  } catch (error) {
    console.log({ error });
  }
}

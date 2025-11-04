-- Enum Definitions
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- Table Definitions
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jsonFormat" JSONB NOT NULL,
    "serviceId" INTEGER NOT NULL,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reaction" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "jsonFormat" JSONB NOT NULL,
    "serviceId" INTEGER NOT NULL,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Service" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ServiceConnection" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT,
    "webhookState" JSONB,
    "serviceUserIdentity" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,

    CONSTRAINT "ServiceConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Workflow" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "actionId" INTEGER NOT NULL,
    "actionJson" JSONB NOT NULL,
    "reactionsJson" JSONB[],
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowHistory" (
    "id" SERIAL NOT NULL,
    "workflowId" INTEGER NOT NULL,
    "triggered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorkflowHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_ReactionToWorkflow" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- Index Definitions
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Action_name_serviceId_key" ON "Action"("name", "serviceId");
CREATE UNIQUE INDEX "Reaction_name_serviceId_key" ON "Reaction"("name", "serviceId");
CREATE UNIQUE INDEX "Service_name_key" ON "Service"("name");
CREATE UNIQUE INDEX "ServiceConnection_userId_serviceId_key" ON "ServiceConnection"("userId", "serviceId");
CREATE UNIQUE INDEX "_ReactionToWorkflow_AB_unique" ON "_ReactionToWorkflow"("A", "B");
CREATE INDEX "_ReactionToWorkflow_B_index" ON "_ReactionToWorkflow"("B");

-- Foreign Key Constraints
ALTER TABLE "Action" ADD CONSTRAINT "Action_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceConnection" ADD CONSTRAINT "ServiceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceConnection" ADD CONSTRAINT "ServiceConnection_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "Action"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowHistory" ADD CONSTRAINT "WorkflowHistory_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ReactionToWorkflow" ADD CONSTRAINT "_ReactionToWorkflow_A_fkey" FOREIGN KEY ("A") REFERENCES "Reaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ReactionToWorkflow" ADD CONSTRAINT "_ReactionToWorkflow_B_fkey" FOREIGN KEY ("B") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

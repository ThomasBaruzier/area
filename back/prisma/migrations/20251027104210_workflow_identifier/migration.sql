-- AlterTable
ALTER TABLE "Workflow" ADD COLUMN     "identifier" TEXT;

-- AlterTable
ALTER TABLE "_ReactionToWorkflow" ADD CONSTRAINT "_ReactionToWorkflow_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "public"."_ReactionToWorkflow_AB_unique";

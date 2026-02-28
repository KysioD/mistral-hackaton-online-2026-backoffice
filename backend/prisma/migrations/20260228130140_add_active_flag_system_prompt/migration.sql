-- AlterTable
ALTER TABLE "SystemPrompt" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "SystemPrompt_isActive_key" ON "SystemPrompt"("isActive") WHERE "isActive" = true;

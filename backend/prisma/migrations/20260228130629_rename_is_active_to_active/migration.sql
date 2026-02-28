/*
  Warnings:

  - You are about to drop the column `isActive` on the `SystemPrompt` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SystemPrompt_isActive_key";

-- AlterTable
ALTER TABLE "SystemPrompt" RENAME COLUMN "isActive" TO "active";

-- CreateIndex
CREATE UNIQUE INDEX "SystemPrompt_active_key" ON "SystemPrompt"("active") WHERE "active" = true;

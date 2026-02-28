/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Tool` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "ToolParameter" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolParameter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ToolParameter_toolId_name_key" ON "ToolParameter"("toolId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_name_key" ON "Tool"("name");

-- AddForeignKey
ALTER TABLE "ToolParameter" ADD CONSTRAINT "ToolParameter_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

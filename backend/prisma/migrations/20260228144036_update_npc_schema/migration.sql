/*
  Warnings:

  - You are about to drop the column `name` on the `Npc` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[firstName,lastName]` on the table `Npc` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `firstName` to the `Npc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Npc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prefab` to the `Npc` table without a default value. This is not possible if the table is not empty.
  - Added the required column `spawnRotation` to the `Npc` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Npc" DROP COLUMN "name",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "prefab" TEXT NOT NULL,
ADD COLUMN     "spawnRotation" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Npc_firstName_lastName_key" ON "Npc"("firstName", "lastName");

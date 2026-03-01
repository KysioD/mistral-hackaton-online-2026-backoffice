-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "ConversationExample" (
    "id" TEXT NOT NULL,
    "npcId" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "embedding" vector(1024),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationExample_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ConversationExample" ADD CONSTRAINT "ConversationExample_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "Npc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

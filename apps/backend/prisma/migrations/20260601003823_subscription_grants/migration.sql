-- CreateEnum
CREATE TYPE "SubscriptionGrantStatus" AS ENUM ('PENDING', 'CLAIMED', 'CANCELLED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SubscriptionGrant" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "status" "SubscriptionGrantStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdByTelegramId" TEXT,
    "claimedByUserId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionGrant_token_key" ON "SubscriptionGrant"("token");

-- CreateIndex
CREATE INDEX "SubscriptionGrant_status_expiresAt_idx" ON "SubscriptionGrant"("status", "expiresAt");

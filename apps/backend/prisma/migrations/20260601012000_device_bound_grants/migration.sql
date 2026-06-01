-- AlterTable
ALTER TABLE "VpnConfig" ADD COLUMN "deviceFingerprint" TEXT;

-- AlterTable
ALTER TABLE "SubscriptionGrant" ADD COLUMN "deviceFingerprint" TEXT;

-- CreateIndex
CREATE INDEX "VpnConfig_userId_deviceFingerprint_idx" ON "VpnConfig"("userId", "deviceFingerprint");

-- CreateIndex
CREATE INDEX "SubscriptionGrant_deviceFingerprint_idx" ON "SubscriptionGrant"("deviceFingerprint");

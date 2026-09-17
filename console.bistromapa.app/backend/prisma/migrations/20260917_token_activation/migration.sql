-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "activationToken" TEXT;
ALTER TABLE "Lead" ADD COLUMN "activationTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_activationToken_key" ON "Lead"("activationToken");
CREATE INDEX "Lead_activationToken_idx" ON "Lead"("activationToken");
CREATE INDEX "Lead_activationTokenExpiry_idx" ON "Lead"("activationTokenExpiry");

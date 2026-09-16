/*
  Warnings:

  - You are about to drop the column `currentPeriodEnd` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `hasStaticMenu` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `isPromoted` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `endsAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startsAt` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Subscription_restaurantId_key";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "currentPeriodEnd",
DROP COLUMN "hasStaticMenu",
DROP COLUMN "isPromoted",
DROP COLUMN "plan",
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Subscription_restaurantId_idx" ON "Subscription"("restaurantId");

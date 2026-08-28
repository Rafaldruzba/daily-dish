-- AlterTable
ALTER TABLE "Restaurant" ADD COLUMN     "googlePlaceId" TEXT,
ADD COLUMN     "userRatingsTotal" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemStats" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SystemStats_pkey" PRIMARY KEY ("id")
);

/*
  Warnings:

  - A unique constraint covering the columns `[restaurantId,date]` on the table `DailyDish` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DailyDish_restaurantId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "DailyDish_restaurantId_date_key" ON "DailyDish"("restaurantId", "date");

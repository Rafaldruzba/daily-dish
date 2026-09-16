-- AlterTable: add citySlug (required) and cuisines to Restaurant
ALTER TABLE "Restaurant" ADD COLUMN "citySlug" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Restaurant" ADD COLUMN "cuisines" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Update existing Restaurant rows with default citySlug from city
UPDATE "Restaurant" SET "citySlug" = LOWER(REPLACE("city", ' ', '-'));

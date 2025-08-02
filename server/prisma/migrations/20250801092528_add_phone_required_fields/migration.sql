/*
  Warnings:

  - Added the required column `phone` to the `admin_users` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `carers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable - Add phone column to admin_users with temporary default, then remove default
ALTER TABLE "admin_users" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "admin_users" ALTER COLUMN "phone" DROP DEFAULT;

-- AlterTable - Update any NULL phone values for carers with empty string, then make required
UPDATE "carers" SET "phone" = '' WHERE "phone" IS NULL;
ALTER TABLE "carers" ALTER COLUMN "phone" SET NOT NULL;

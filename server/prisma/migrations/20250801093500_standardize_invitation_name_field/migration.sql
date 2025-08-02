/*
  Warnings:

  - You are about to drop the column `first_name` on the `invitations` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `invitations` table. All the data in the column will be lost.

*/
-- Migrate existing data: combine first_name and last_name into name field
UPDATE "invitations" 
SET "name" = CONCAT("first_name", ' ', "last_name") 
WHERE "first_name" IS NOT NULL AND "last_name" IS NOT NULL AND "name" IS NULL;

-- AlterTable
ALTER TABLE "invitations" DROP COLUMN "first_name";
ALTER TABLE "invitations" DROP COLUMN "last_name";
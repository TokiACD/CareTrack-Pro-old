/*
  Warnings:

  - Added the required column `date` to the `shifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_time` to the `shifts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_time` to the `shifts` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ShiftApplicationStatus" AS ENUM ('PENDING', 'SELECTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ShiftStatus" ADD VALUE 'WAITING_RESPONSES';
ALTER TYPE "ShiftStatus" ADD VALUE 'HAS_APPLICATIONS';
ALTER TYPE "ShiftStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "ShiftStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "end_time" TEXT NOT NULL,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "rota_entry_id" TEXT,
ADD COLUMN     "selected_carer_id" TEXT,
ADD COLUMN     "start_time" TEXT NOT NULL,
ADD COLUMN     "status" "ShiftStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "shift_applications" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ShiftApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "shift_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shift_applications_shift_id_carer_id_key" ON "shift_applications"("shift_id", "carer_id");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_selected_carer_id_fkey" FOREIGN KEY ("selected_carer_id") REFERENCES "carers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_applications" ADD CONSTRAINT "shift_applications_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_applications" ADD CONSTRAINT "shift_applications_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

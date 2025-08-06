/*
  Warnings:

  - You are about to drop the column `display_task_id` on the `assessments` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "assessments" DROP COLUMN "display_task_id";

-- CreateTable
CREATE TABLE "draft_assessment_responses" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "created_by_admin_id" TEXT NOT NULL,
    "draft_data" JSONB NOT NULL,
    "last_saved" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "synced_to_server" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "draft_assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "draft_assessment_responses_assessment_id_carer_id_key" ON "draft_assessment_responses"("assessment_id", "carer_id");

-- AddForeignKey
ALTER TABLE "draft_assessment_responses" ADD CONSTRAINT "draft_assessment_responses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_assessment_responses" ADD CONSTRAINT "draft_assessment_responses_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_assessment_responses" ADD CONSTRAINT "draft_assessment_responses_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

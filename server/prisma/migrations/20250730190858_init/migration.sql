-- CreateEnum
CREATE TYPE "CompetencyLevel" AS ENUM ('NOT_ASSESSED', 'NOT_COMPETENT', 'ADVANCED_BEGINNER', 'COMPETENT', 'PROFICIENT', 'EXPERT');

-- CreateEnum
CREATE TYPE "CompetencySource" AS ENUM ('ASSESSMENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "PracticalRating" AS ENUM ('COMPETENT', 'NEEDS_SUPPORT', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('DAY', 'NIGHT');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "invited_by" TEXT,
    "last_login" TIMESTAMP(3),

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "carers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "care_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "care_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carer_package_assignments" (
    "id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "carer_package_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_task_assignments" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "package_task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "display_task_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "model_answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "knowledge_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practical_skills" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "skill_description" TEXT NOT NULL,
    "can_be_not_applicable" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "practical_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "model_answer" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "emergency_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_task_coverage" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,

    CONSTRAINT "assessment_task_coverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_responses" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "assessor_id" TEXT NOT NULL,
    "assessor_name" TEXT NOT NULL,
    "assessor_unique_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overall_rating" "CompetencyLevel" NOT NULL,

    CONSTRAINT "assessment_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_responses" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "carer_answer" TEXT NOT NULL,

    CONSTRAINT "knowledge_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practical_responses" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "rating" "PracticalRating" NOT NULL,

    CONSTRAINT "practical_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_responses" (
    "id" TEXT NOT NULL,
    "response_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "carer_answer" TEXT NOT NULL,

    CONSTRAINT "emergency_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_progress" (
    "id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "completion_count" INTEGER NOT NULL DEFAULT 0,
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competency_ratings" (
    "id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "level" "CompetencyLevel" NOT NULL,
    "source" "CompetencySource" NOT NULL,
    "assessment_response_id" TEXT,
    "set_by_admin_id" TEXT,
    "set_by_admin_name" TEXT,
    "set_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "competency_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "required_competencies" TEXT[],
    "is_competent_only" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_admin_id" TEXT NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_assignments" (
    "id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMP(3),
    "status" "ShiftStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rota_entries" (
    "id" TEXT NOT NULL,
    "package_id" TEXT NOT NULL,
    "carer_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "shift_type" "ShiftType" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_admin_id" TEXT NOT NULL,

    CONSTRAINT "rota_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "performed_by_admin_id" TEXT NOT NULL,
    "performed_by_admin_name" TEXT NOT NULL,
    "performed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "user_agent" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "carers_email_key" ON "carers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "carer_package_assignments_carer_id_package_id_key" ON "carer_package_assignments"("carer_id", "package_id");

-- CreateIndex
CREATE UNIQUE INDEX "package_task_assignments_package_id_task_id_key" ON "package_task_assignments"("package_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_task_coverage_assessment_id_task_id_key" ON "assessment_task_coverage"("assessment_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_progress_carer_id_package_id_task_id_key" ON "task_progress"("carer_id", "package_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "competency_ratings_carer_id_task_id_key" ON "competency_ratings"("carer_id", "task_id");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carer_package_assignments" ADD CONSTRAINT "carer_package_assignments_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carer_package_assignments" ADD CONSTRAINT "carer_package_assignments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "care_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_task_assignments" ADD CONSTRAINT "package_task_assignments_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "care_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_task_assignments" ADD CONSTRAINT "package_task_assignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_questions" ADD CONSTRAINT "knowledge_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_skills" ADD CONSTRAINT "practical_skills_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_questions" ADD CONSTRAINT "emergency_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_task_coverage" ADD CONSTRAINT "assessment_task_coverage_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_task_coverage" ADD CONSTRAINT "assessment_task_coverage_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_responses" ADD CONSTRAINT "assessment_responses_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_responses" ADD CONSTRAINT "knowledge_responses_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "assessment_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_responses" ADD CONSTRAINT "knowledge_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "knowledge_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_responses" ADD CONSTRAINT "practical_responses_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "assessment_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_responses" ADD CONSTRAINT "practical_responses_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "practical_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_responses" ADD CONSTRAINT "emergency_responses_response_id_fkey" FOREIGN KEY ("response_id") REFERENCES "assessment_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_responses" ADD CONSTRAINT "emergency_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "emergency_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "care_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_assessment_response_id_fkey" FOREIGN KEY ("assessment_response_id") REFERENCES "assessment_responses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competency_ratings" ADD CONSTRAINT "competency_ratings_set_by_admin_id_fkey" FOREIGN KEY ("set_by_admin_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "care_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_entries" ADD CONSTRAINT "rota_entries_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "care_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_entries" ADD CONSTRAINT "rota_entries_carer_id_fkey" FOREIGN KEY ("carer_id") REFERENCES "carers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rota_entries" ADD CONSTRAINT "rota_entries_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performed_by_admin_id_fkey" FOREIGN KEY ("performed_by_admin_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

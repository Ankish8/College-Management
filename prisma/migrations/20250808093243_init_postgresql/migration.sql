-- CreateTable
CREATE TABLE "public"."universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "totalSems" INTEGER NOT NULL,
    "programType" TEXT NOT NULL DEFAULT 'UNDERGRADUATE',
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."specializations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specializations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "specializationId" TEXT,
    "semester" INTEGER NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "semType" TEXT NOT NULL DEFAULT 'ODD',
    "maxCapacity" INTEGER,
    "currentStrength" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "employeeId" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "departmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."students" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "address" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."time_slots" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subjects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "totalHours" INTEGER NOT NULL,
    "batchId" TEXT NOT NULL,
    "primaryFacultyId" TEXT,
    "coFacultyId" TEXT,
    "examType" TEXT NOT NULL DEFAULT 'THEORY',
    "subjectType" TEXT NOT NULL DEFAULT 'CORE',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subjects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timetable_entries" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT,
    "facultyId" TEXT,
    "timeSlotId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "entryType" TEXT NOT NULL DEFAULT 'REGULAR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "customEventTitle" TEXT,
    "customEventColor" TEXT,
    "requiresAttendance" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_sessions" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "markedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_records" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABSENT',
    "reason" TEXT,
    "notes" TEXT,
    "markedAt" TIMESTAMP(3),
    "lastModifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attendance_disputes" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedStatus" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."academic_calendars" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "semesterName" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "semesterStart" TIMESTAMP(3) NOT NULL,
    "semesterEnd" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academic_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holidays" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "departmentId" TEXT,
    "academicCalendarId" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."exam_periods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "academicCalendarId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "examType" TEXT NOT NULL DEFAULT 'INTERNAL',
    "blockRegularClasses" BOOLEAN NOT NULL DEFAULT true,
    "allowReviewClasses" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timetable_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "timeSlotId" TEXT NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "recurrencePattern" TEXT NOT NULL DEFAULT 'WEEKLY',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "endCondition" TEXT NOT NULL DEFAULT 'SEMESTER_END',
    "totalHours" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."faculty_preferences" (
    "id" TEXT NOT NULL,
    "facultyId" TEXT NOT NULL,
    "preferredTimeSlots" JSONB,
    "maxDailyHours" INTEGER NOT NULL DEFAULT 8,
    "maxWeeklyHours" INTEGER NOT NULL DEFAULT 40,
    "notificationSettings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."faculty_blackout_periods" (
    "id" TEXT NOT NULL,
    "facultyPreferencesId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrencePattern" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faculty_blackout_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewModes" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."department_settings" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "creditHoursRatio" INTEGER NOT NULL DEFAULT 15,
    "maxFacultyCredits" INTEGER NOT NULL DEFAULT 30,
    "coFacultyWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "defaultExamTypes" JSONB,
    "defaultSubjectTypes" JSONB,
    "customExamTypes" JSONB,
    "customSubjectTypes" JSONB,
    "schedulingMode" TEXT NOT NULL DEFAULT 'MODULE_BASED',
    "displaySettings" JSONB,
    "defaultTimeSlots" JSONB,
    "breakConfiguration" JSONB,
    "moduledurations" JSONB,
    "classTypes" JSONB,
    "conflictRules" JSONB,
    "autoCreateAttendance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "department_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bulk_operations" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "results" JSONB,
    "errorLog" TEXT,
    "affectedCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bulk_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."operation_logs" (
    "id" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timetable_templates_new" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "templateData" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateType" TEXT,
    "targetBatches" JSONB,
    "creditHours" INTEGER,
    "subjectCount" INTEGER,
    "timesUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUsed" TIMESTAMP(3),

    CONSTRAINT "timetable_templates_new_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."undo_operations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "undo_operations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specializations_programId_shortName_key" ON "public"."specializations"("programId", "shortName");

-- CreateIndex
CREATE UNIQUE INDEX "batches_programId_specializationId_semester_startYear_key" ON "public"."batches"("programId", "specializationId", "semester", "startYear");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employeeId_key" ON "public"."users"("employeeId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_departmentId_idx" ON "public"."users"("departmentId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "public"."users"("status");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "public"."users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "students_userId_key" ON "public"."students"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentId_key" ON "public"."students"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "students_rollNumber_key" ON "public"."students"("rollNumber");

-- CreateIndex
CREATE INDEX "students_batchId_idx" ON "public"."students"("batchId");

-- CreateIndex
CREATE INDEX "students_rollNumber_idx" ON "public"."students"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_key" ON "public"."subjects"("code");

-- CreateIndex
CREATE INDEX "timetable_entries_batchId_idx" ON "public"."timetable_entries"("batchId");

-- CreateIndex
CREATE INDEX "timetable_entries_facultyId_idx" ON "public"."timetable_entries"("facultyId");

-- CreateIndex
CREATE INDEX "timetable_entries_subjectId_idx" ON "public"."timetable_entries"("subjectId");

-- CreateIndex
CREATE INDEX "timetable_entries_timeSlotId_idx" ON "public"."timetable_entries"("timeSlotId");

-- CreateIndex
CREATE INDEX "timetable_entries_date_idx" ON "public"."timetable_entries"("date");

-- CreateIndex
CREATE INDEX "timetable_entries_dayOfWeek_idx" ON "public"."timetable_entries"("dayOfWeek");

-- CreateIndex
CREATE INDEX "timetable_entries_batchId_date_idx" ON "public"."timetable_entries"("batchId", "date");

-- CreateIndex
CREATE INDEX "timetable_entries_facultyId_date_idx" ON "public"."timetable_entries"("facultyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "timetable_entries_batchId_timeSlotId_dayOfWeek_date_key" ON "public"."timetable_entries"("batchId", "timeSlotId", "dayOfWeek", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_sessions_batchId_subjectId_date_key" ON "public"."attendance_sessions"("batchId", "subjectId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_sessionId_studentId_key" ON "public"."attendance_records"("sessionId", "studentId");

-- CreateIndex
CREATE INDEX "academic_calendars_departmentId_idx" ON "public"."academic_calendars"("departmentId");

-- CreateIndex
CREATE INDEX "academic_calendars_semesterStart_idx" ON "public"."academic_calendars"("semesterStart");

-- CreateIndex
CREATE INDEX "academic_calendars_semesterEnd_idx" ON "public"."academic_calendars"("semesterEnd");

-- CreateIndex
CREATE INDEX "academic_calendars_isActive_idx" ON "public"."academic_calendars"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "academic_calendars_departmentId_semesterName_academicYear_key" ON "public"."academic_calendars"("departmentId", "semesterName", "academicYear");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "public"."holidays"("date");

-- CreateIndex
CREATE INDEX "holidays_type_idx" ON "public"."holidays"("type");

-- CreateIndex
CREATE INDEX "holidays_departmentId_idx" ON "public"."holidays"("departmentId");

-- CreateIndex
CREATE INDEX "holidays_departmentId_date_idx" ON "public"."holidays"("departmentId", "date");

-- CreateIndex
CREATE INDEX "exam_periods_academicCalendarId_idx" ON "public"."exam_periods"("academicCalendarId");

-- CreateIndex
CREATE INDEX "exam_periods_startDate_idx" ON "public"."exam_periods"("startDate");

-- CreateIndex
CREATE INDEX "exam_periods_endDate_idx" ON "public"."exam_periods"("endDate");

-- CreateIndex
CREATE INDEX "exam_periods_examType_idx" ON "public"."exam_periods"("examType");

-- CreateIndex
CREATE INDEX "exam_periods_startDate_endDate_idx" ON "public"."exam_periods"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "faculty_preferences_facultyId_key" ON "public"."faculty_preferences"("facultyId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_userId_key" ON "public"."user_preferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "department_settings_departmentId_key" ON "public"."department_settings"("departmentId");

-- CreateIndex
CREATE INDEX "bulk_operations_userId_idx" ON "public"."bulk_operations"("userId");

-- CreateIndex
CREATE INDEX "bulk_operations_status_idx" ON "public"."bulk_operations"("status");

-- CreateIndex
CREATE INDEX "bulk_operations_type_idx" ON "public"."bulk_operations"("type");

-- CreateIndex
CREATE INDEX "bulk_operations_startedAt_idx" ON "public"."bulk_operations"("startedAt");

-- CreateIndex
CREATE INDEX "operation_logs_operationId_idx" ON "public"."operation_logs"("operationId");

-- CreateIndex
CREATE INDEX "operation_logs_level_idx" ON "public"."operation_logs"("level");

-- CreateIndex
CREATE INDEX "operation_logs_timestamp_idx" ON "public"."operation_logs"("timestamp");

-- CreateIndex
CREATE INDEX "timetable_templates_new_createdBy_idx" ON "public"."timetable_templates_new"("createdBy");

-- CreateIndex
CREATE INDEX "timetable_templates_new_departmentId_idx" ON "public"."timetable_templates_new"("departmentId");

-- CreateIndex
CREATE INDEX "timetable_templates_new_isDefault_idx" ON "public"."timetable_templates_new"("isDefault");

-- CreateIndex
CREATE INDEX "timetable_templates_new_isPublic_idx" ON "public"."timetable_templates_new"("isPublic");

-- CreateIndex
CREATE INDEX "timetable_templates_new_templateType_idx" ON "public"."timetable_templates_new"("templateType");

-- CreateIndex
CREATE INDEX "undo_operations_userId_idx" ON "public"."undo_operations"("userId");

-- CreateIndex
CREATE INDEX "undo_operations_entityType_idx" ON "public"."undo_operations"("entityType");

-- CreateIndex
CREATE INDEX "undo_operations_entityId_idx" ON "public"."undo_operations"("entityId");

-- CreateIndex
CREATE INDEX "undo_operations_expiresAt_idx" ON "public"."undo_operations"("expiresAt");

-- CreateIndex
CREATE INDEX "undo_operations_createdAt_idx" ON "public"."undo_operations"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."departments" ADD CONSTRAINT "departments_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "public"."universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."programs" ADD CONSTRAINT "programs_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."specializations" ADD CONSTRAINT "specializations_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batches" ADD CONSTRAINT "batches_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "public"."specializations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."batches" ADD CONSTRAINT "batches_programId_fkey" FOREIGN KEY ("programId") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."students" ADD CONSTRAINT "students_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subjects" ADD CONSTRAINT "subjects_coFacultyId_fkey" FOREIGN KEY ("coFacultyId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subjects" ADD CONSTRAINT "subjects_primaryFacultyId_fkey" FOREIGN KEY ("primaryFacultyId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subjects" ADD CONSTRAINT "subjects_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_entries" ADD CONSTRAINT "timetable_entries_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_entries" ADD CONSTRAINT "timetable_entries_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_entries" ADD CONSTRAINT "timetable_entries_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_entries" ADD CONSTRAINT "timetable_entries_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_sessions" ADD CONSTRAINT "attendance_sessions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_sessions" ADD CONSTRAINT "attendance_sessions_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_records" ADD CONSTRAINT "attendance_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_records" ADD CONSTRAINT "attendance_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."attendance_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_disputes" ADD CONSTRAINT "attendance_disputes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attendance_disputes" ADD CONSTRAINT "attendance_disputes_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."academic_calendars" ADD CONSTRAINT "academic_calendars_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holidays" ADD CONSTRAINT "holidays_academicCalendarId_fkey" FOREIGN KEY ("academicCalendarId") REFERENCES "public"."academic_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holidays" ADD CONSTRAINT "holidays_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."exam_periods" ADD CONSTRAINT "exam_periods_academicCalendarId_fkey" FOREIGN KEY ("academicCalendarId") REFERENCES "public"."academic_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_templates" ADD CONSTRAINT "timetable_templates_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "public"."time_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_templates" ADD CONSTRAINT "timetable_templates_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_templates" ADD CONSTRAINT "timetable_templates_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "public"."subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_templates" ADD CONSTRAINT "timetable_templates_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."faculty_preferences" ADD CONSTRAINT "faculty_preferences_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."faculty_blackout_periods" ADD CONSTRAINT "faculty_blackout_periods_facultyPreferencesId_fkey" FOREIGN KEY ("facultyPreferencesId") REFERENCES "public"."faculty_preferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_preferences" ADD CONSTRAINT "user_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."department_settings" ADD CONSTRAINT "department_settings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."bulk_operations" ADD CONSTRAINT "bulk_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."operation_logs" ADD CONSTRAINT "operation_logs_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "public"."bulk_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_templates_new" ADD CONSTRAINT "timetable_templates_new_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "public"."departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timetable_templates_new" ADD CONSTRAINT "timetable_templates_new_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."undo_operations" ADD CONSTRAINT "undo_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

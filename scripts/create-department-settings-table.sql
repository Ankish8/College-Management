-- Create department_settings table
CREATE TABLE IF NOT EXISTS "department_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "departmentId" TEXT NOT NULL,
    "creditHoursRatio" INTEGER NOT NULL DEFAULT 15,
    "maxFacultyCredits" INTEGER NOT NULL DEFAULT 30,
    "coFacultyWeight" REAL NOT NULL DEFAULT 0.5,
    "defaultExamTypes" TEXT,
    "defaultSubjectTypes" TEXT,
    "customExamTypes" TEXT,
    "customSubjectTypes" TEXT,
    "schedulingMode" TEXT NOT NULL DEFAULT 'MODULE_BASED',
    "displaySettings" TEXT,
    "defaultTimeSlots" TEXT,
    "breakConfiguration" TEXT,
    "moduledurations" TEXT,
    "classTypes" TEXT,
    "conflictRules" TEXT,
    "autoCreateAttendance" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "department_settings_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create unique index
CREATE UNIQUE INDEX IF NOT EXISTS "department_settings_departmentId_key" ON "department_settings"("departmentId");
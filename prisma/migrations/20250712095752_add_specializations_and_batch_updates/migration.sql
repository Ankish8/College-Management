-- CreateTable
CREATE TABLE "specializations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "specializations_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_batches" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "batches_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "batches_specializationId_fkey" FOREIGN KEY ("specializationId") REFERENCES "specializations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_batches" ("createdAt", "endYear", "id", "isActive", "name", "programId", "semType", "semester", "startYear", "updatedAt") SELECT "createdAt", "endYear", "id", "isActive", "name", "programId", "semType", "semester", "startYear", "updatedAt" FROM "batches";
DROP TABLE "batches";
ALTER TABLE "new_batches" RENAME TO "batches";
CREATE UNIQUE INDEX "batches_programId_specializationId_semester_startYear_key" ON "batches"("programId", "specializationId", "semester", "startYear");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

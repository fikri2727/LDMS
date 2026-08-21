/*
  Warnings:

  - You are about to drop the column `hodId` on the `Pme` table. All the data in the column will be lost.
  - You are about to drop the column `pmeCreatedAt` on the `Pme` table. All the data in the column will be lost.
  - You are about to drop the column `verifiedByUserId` on the `Pme` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingId" INTEGER NOT NULL,
    "participationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "supervisorId" INTEGER,
    "designation" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffNo" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "trainingTitle" TEXT NOT NULL,
    "fromDate" DATETIME,
    "toDate" DATETIME,
    "ojtConducted" BOOLEAN NOT NULL DEFAULT false,
    "levelRating" TEXT,
    "levelPercent" INTEGER,
    "levelRemark" TEXT,
    "levelRating2" TEXT,
    "levelPercent2" INTEGER,
    "levelRemark2" TEXT,
    "behavioralRating" TEXT,
    "behavioralPercent" INTEGER,
    "behavioralRemark" TEXT,
    "resultRating" TEXT,
    "resultPercent" INTEGER,
    "resultRemark" TEXT,
    "totalMark" INTEGER,
    "averageMark" REAL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "evaluatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pme_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pme_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pme_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pme" ("averageMark", "behavioralPercent", "behavioralRating", "behavioralRemark", "createdAt", "department", "designation", "fromDate", "id", "levelPercent", "levelPercent2", "levelRating", "levelRating2", "levelRemark", "levelRemark2", "ojtConducted", "participationId", "resultPercent", "resultRating", "resultRemark", "staffName", "staffNo", "status", "toDate", "totalMark", "trainingId", "trainingTitle", "updatedAt", "userId") SELECT "averageMark", "behavioralPercent", "behavioralRating", "behavioralRemark", "createdAt", "department", "designation", "fromDate", "id", "levelPercent", "levelPercent2", "levelRating", "levelRating2", "levelRemark", "levelRemark2", "ojtConducted", "participationId", "resultPercent", "resultRating", "resultRemark", "staffName", "staffNo", "status", "toDate", "totalMark", "trainingId", "trainingTitle", "updatedAt", "userId" FROM "Pme";
DROP TABLE "Pme";
ALTER TABLE "new_Pme" RENAME TO "Pme";
CREATE UNIQUE INDEX "Pme_participationId_key" ON "Pme"("participationId");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "staffNo" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "staffName" TEXT NOT NULL,
    "email" TEXT,
    "gender" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "grade" TEXT,
    "divisionId" INTEGER,
    "departmentId" INTEGER,
    "sectionId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dateResign" DATETIME,
    "hodId" INTEGER,
    "isHod" BOOLEAN NOT NULL DEFAULT false,
    "roleType" TEXT NOT NULL DEFAULT 'STAFF',
    "supervisorId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "dateResign", "departmentId", "designation", "divisionId", "email", "gender", "grade", "hodId", "id", "isHod", "password", "roleType", "sectionId", "staffName", "staffNo", "status", "updatedAt") SELECT "createdAt", "dateResign", "departmentId", "designation", "divisionId", "email", "gender", "grade", "hodId", "id", "isHod", "password", "roleType", "sectionId", "staffName", "staffNo", "status", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_staffNo_key" ON "User"("staffNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

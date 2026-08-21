-- CreateTable
CREATE TABLE "Division" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Department" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "divisionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "hodUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Department_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Department_hodUserId_fkey" FOREIGN KEY ("hodUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "departmentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Section_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Training" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "program" TEXT NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "platform" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "hrdcClaimable" BOOLEAN NOT NULL DEFAULT false,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "trainer" TEXT NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Training_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "attendance" TEXT NOT NULL DEFAULT 'PENDING',
    "q1" INTEGER,
    "q2" INTEGER,
    "q3" INTEGER,
    "q4" INTEGER,
    "q5" INTEGER,
    "q6" INTEGER,
    "q7" INTEGER,
    "q8" INTEGER,
    "q9" INTEGER,
    "q10" INTEGER,
    "q11" INTEGER,
    "q12" BOOLEAN,
    "q13" TEXT,
    "q14" TEXT,
    "q15" TEXT,
    "q16" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Participation_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedByUserId" INTEGER NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Certificate_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Certificate_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ojt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "trainerType" TEXT NOT NULL,
    "trainerName" TEXT NOT NULL,
    "totalDay" INTEGER NOT NULL,
    "totalHour" REAL NOT NULL,
    "totalMan" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Ojt_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParticipateOjt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ojtId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "attendance" TEXT NOT NULL DEFAULT 'PENDING',
    "q1" TEXT,
    "q2" INTEGER,
    "q3" INTEGER,
    "totalMan" INTEGER NOT NULL DEFAULT 1,
    "department" TEXT,
    "clerkId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ParticipateOjt_ojtId_fkey" FOREIGN KEY ("ojtId") REFERENCES "Ojt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ParticipateOjt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ParticipateOjt_clerkId_fkey" FOREIGN KEY ("clerkId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pme" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "trainingId" INTEGER NOT NULL,
    "participationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "hodId" INTEGER,
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
    "verifiedByUserId" INTEGER,
    "pmeCreatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pme_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pme_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pme_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pme_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Division_name_key" ON "Division"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_hodUserId_key" ON "Department"("hodUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_divisionId_name_key" ON "Department"("divisionId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Section_departmentId_name_key" ON "Section"("departmentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_staffNo_key" ON "User"("staffNo");

-- CreateIndex
CREATE UNIQUE INDEX "Training_trainingCode_key" ON "Training"("trainingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Participation_trainingId_userId_key" ON "Participation"("trainingId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Ojt_trainingCode_key" ON "Ojt"("trainingCode");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipateOjt_ojtId_userId_key" ON "ParticipateOjt"("ojtId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Pme_participationId_key" ON "Pme"("participationId");

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('ADMIN', 'CLERK', 'STAFF', 'CREATOR');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "Designation" AS ENUM ('EXECUTIVE', 'MANAGER', 'NON_EXECUTIVE', 'CONTRACT', 'TRAINEE');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'RESIGN');

-- CreateEnum
CREATE TYPE "TrainingProgram" AS ENUM ('EXT', 'INTX', 'INTI');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('PHYSICAL', 'ONLINE');

-- CreateEnum
CREATE TYPE "TrainingFunction" AS ENUM ('BUSINESS', 'DIGITAL', 'LEADERSHIP', 'PERSONAL_EFFECTIVENESS');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'COMPLETED', 'ABSENT');

-- CreateEnum
CREATE TYPE "TrainerType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "PmeStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "RatingBand" AS ENUM ('EXCELLENT', 'VERY_GOOD', 'GOOD', 'SATISFACTORY', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "ModuleStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('SLIDE', 'VIDEO', 'QUIZ');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'TRUE_FALSE', 'MULTIPLE_ANSWER');

-- CreateEnum
CREATE TYPE "TnaSection" AS ENUM ('ESG', 'SELF', 'LEAD', 'DATA', 'FUNCTIONAL', 'BUSINESS', 'SPECIAL');

-- CreateEnum
CREATE TYPE "TnaTrainingType" AS ENUM ('OJT', 'COACHING', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "TnaStatus" AS ENUM ('PENDING', 'APPROVED');

-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "Division" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "divisionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "hodUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" SERIAL NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "staffNo" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "passwordIsDefault" BOOLEAN NOT NULL DEFAULT true,
    "staffName" TEXT NOT NULL,
    "email" TEXT,
    "gender" "Gender" NOT NULL,
    "designation" "Designation" NOT NULL,
    "nationality" TEXT,
    "divisionId" INTEGER,
    "departmentId" INTEGER,
    "sectionId" INTEGER,
    "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
    "dateResign" TIMESTAMP(3),
    "hodId" INTEGER,
    "isHod" BOOLEAN NOT NULL DEFAULT false,
    "roleType" "RoleType" NOT NULL DEFAULT 'STAFF',
    "supervisorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" SERIAL NOT NULL,
    "trainingCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "program" "TrainingProgram" NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platform" "Platform" NOT NULL,
    "function" "TrainingFunction" NOT NULL,
    "venue" TEXT NOT NULL,
    "hrdcClaimable" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "trainer" TEXT NOT NULL,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participation" (
    "id" SERIAL NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "courseRelevance" INTEGER,
    "practicalExercises" INTEGER,
    "sufficientTime" INTEGER,
    "trainerEffectiveness" INTEGER,
    "courseEffectiveness" INTEGER,
    "whatLearnt" TEXT,
    "actionPlan" TEXT,
    "commentSuggestions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "uploadedByUserId" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ojt" (
    "id" SERIAL NOT NULL,
    "trainingCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "trainerType" "TrainerType" NOT NULL,
    "trainerName" TEXT NOT NULL,
    "totalDay" INTEGER NOT NULL,
    "totalHour" DOUBLE PRECISION NOT NULL,
    "totalMan" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ojt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipateOjt" (
    "id" SERIAL NOT NULL,
    "ojtId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PENDING',
    "q1" TEXT,
    "q2" INTEGER,
    "q3" INTEGER,
    "totalMan" INTEGER NOT NULL DEFAULT 1,
    "department" TEXT,
    "clerkId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParticipateOjt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pme" (
    "id" SERIAL NOT NULL,
    "trainingId" INTEGER NOT NULL,
    "participationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "supervisorId" INTEGER,
    "designation" "Designation" NOT NULL,
    "staffName" TEXT NOT NULL,
    "staffNo" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "trainingTitle" TEXT NOT NULL,
    "fromDate" TIMESTAMP(3),
    "toDate" TIMESTAMP(3),
    "ojtConducted" BOOLEAN,
    "ojtDetails" TEXT,
    "levelRating" "RatingBand",
    "levelPercent" TEXT,
    "levelRemark" TEXT,
    "levelRating2" "RatingBand",
    "levelPercent2" TEXT,
    "levelRemark2" TEXT,
    "behavioralRating" "RatingBand",
    "behavioralPercent" TEXT,
    "behavioralRemark" TEXT,
    "resultRating" "RatingBand",
    "resultPercent" TEXT,
    "resultRemark" TEXT,
    "totalMark" INTEGER,
    "averageMark" DOUBLE PRECISION,
    "status" "PmeStatus" NOT NULL DEFAULT 'PENDING',
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElearningCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningModule" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "objectives" TEXT,
    "passThreshold" INTEGER NOT NULL DEFAULT 80,
    "status" "ModuleStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" INTEGER,
    "createdByUserId" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "certificateBackgroundName" TEXT,
    "certificateBackgroundPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElearningModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningLesson" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "type" "LessonType" NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "slideContent" TEXT,
    "slideFileName" TEXT,
    "slideFilePath" TEXT,
    "slideFileType" TEXT,
    "videoUrl" TEXT,
    "videoDescription" TEXT,
    "videoFileName" TEXT,
    "videoFilePath" TEXT,
    "passPercent" INTEGER DEFAULT 80,
    "maxAttempts" INTEGER DEFAULT 3,
    "randomizeQuestions" BOOLEAN NOT NULL DEFAULT false,
    "randomizeOptions" BOOLEAN NOT NULL DEFAULT false,
    "showCorrectAnswers" BOOLEAN NOT NULL DEFAULT true,
    "showExplanation" BOOLEAN NOT NULL DEFAULT true,
    "timeLimitMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElearningLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningQuestion" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElearningQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ElearningOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningAssignment" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "assignedByUserId" INTEGER,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElearningAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningLessonProgress" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElearningLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningQuizAttempt" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "attemptNo" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "answers" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElearningQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningCompletion" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "finalScore" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElearningCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElearningCertificate" (
    "id" SERIAL NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "completionId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElearningCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tna" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "TnaStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TnaItem" (
    "id" SERIAL NOT NULL,
    "tnaId" INTEGER NOT NULL,
    "section" "TnaSection" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "problemStatement" TEXT NOT NULL,
    "training" TEXT NOT NULL,
    "targetSkill" INTEGER NOT NULL,
    "currentSkill" INTEGER NOT NULL,
    "trainingType" "TnaTrainingType" NOT NULL,
    "monthApply" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TnaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TnaTrainingOption" (
    "id" SERIAL NOT NULL,
    "section" "TnaSection" NOT NULL,
    "groupName" TEXT,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TnaTrainingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingRequisition" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "trainingDate" TIMESTAMP(3) NOT NULL,
    "trainingEndDate" TIMESTAMP(3),
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "venue" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "fees" DOUBLE PRECISION NOT NULL,
    "hrdcClaimable" BOOLEAN NOT NULL DEFAULT false,
    "underAtp" BOOLEAN NOT NULL DEFAULT false,
    "remarks" TEXT,
    "trainingProvider" TEXT NOT NULL,
    "brochureFileName" TEXT,
    "brochureFilePath" TEXT,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
    "grantId" TEXT,
    "reviewedByUserId" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionParticipant" (
    "id" SERIAL NOT NULL,
    "requisitionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "RequisitionParticipant_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "ElearningCategory_name_key" ON "ElearningCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ElearningAssignment_moduleId_userId_key" ON "ElearningAssignment"("moduleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ElearningLessonProgress_lessonId_userId_key" ON "ElearningLessonProgress"("lessonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ElearningCompletion_moduleId_userId_key" ON "ElearningCompletion"("moduleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ElearningCertificate_certificateNo_key" ON "ElearningCertificate"("certificateNo");

-- CreateIndex
CREATE UNIQUE INDEX "ElearningCertificate_completionId_key" ON "ElearningCertificate"("completionId");

-- CreateIndex
CREATE UNIQUE INDEX "Tna_userId_year_key" ON "Tna"("userId", "year");

-- CreateIndex
CREATE INDEX "TnaTrainingOption_section_order_idx" ON "TnaTrainingOption"("section", "order");

-- CreateIndex
CREATE INDEX "TrainingRequisition_userId_idx" ON "TrainingRequisition"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RequisitionParticipant_requisitionId_userId_key" ON "RequisitionParticipant"("requisitionId", "userId");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_hodUserId_fkey" FOREIGN KEY ("hodUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_hodId_fkey" FOREIGN KEY ("hodId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participation" ADD CONSTRAINT "Participation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ojt" ADD CONSTRAINT "Ojt_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipateOjt" ADD CONSTRAINT "ParticipateOjt_ojtId_fkey" FOREIGN KEY ("ojtId") REFERENCES "Ojt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipateOjt" ADD CONSTRAINT "ParticipateOjt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipateOjt" ADD CONSTRAINT "ParticipateOjt_clerkId_fkey" FOREIGN KEY ("clerkId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pme" ADD CONSTRAINT "Pme_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pme" ADD CONSTRAINT "Pme_participationId_fkey" FOREIGN KEY ("participationId") REFERENCES "Participation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pme" ADD CONSTRAINT "Pme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pme" ADD CONSTRAINT "Pme_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningModule" ADD CONSTRAINT "ElearningModule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ElearningCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningModule" ADD CONSTRAINT "ElearningModule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningLesson" ADD CONSTRAINT "ElearningLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ElearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningQuestion" ADD CONSTRAINT "ElearningQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ElearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningOption" ADD CONSTRAINT "ElearningOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ElearningQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningAssignment" ADD CONSTRAINT "ElearningAssignment_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ElearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningAssignment" ADD CONSTRAINT "ElearningAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningAssignment" ADD CONSTRAINT "ElearningAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningLessonProgress" ADD CONSTRAINT "ElearningLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ElearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningLessonProgress" ADD CONSTRAINT "ElearningLessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningQuizAttempt" ADD CONSTRAINT "ElearningQuizAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "ElearningLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningQuizAttempt" ADD CONSTRAINT "ElearningQuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningCompletion" ADD CONSTRAINT "ElearningCompletion_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ElearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningCompletion" ADD CONSTRAINT "ElearningCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningCertificate" ADD CONSTRAINT "ElearningCertificate_completionId_fkey" FOREIGN KEY ("completionId") REFERENCES "ElearningCompletion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningCertificate" ADD CONSTRAINT "ElearningCertificate_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "ElearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElearningCertificate" ADD CONSTRAINT "ElearningCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tna" ADD CONSTRAINT "Tna_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tna" ADD CONSTRAINT "Tna_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TnaItem" ADD CONSTRAINT "TnaItem_tnaId_fkey" FOREIGN KEY ("tnaId") REFERENCES "Tna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequisition" ADD CONSTRAINT "TrainingRequisition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingRequisition" ADD CONSTRAINT "TrainingRequisition_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionParticipant" ADD CONSTRAINT "RequisitionParticipant_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "TrainingRequisition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionParticipant" ADD CONSTRAINT "RequisitionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

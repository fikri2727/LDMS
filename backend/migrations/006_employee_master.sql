-- Employee Master Data (2026-11-18): HR's employee list, shared by LDMS and Appraisal.
-- Only the columns the systems use are kept (no IC, passport, date of birth, phone or personal email).
-- Additive and safe to re-run. RLS is on with no policies, so the Supabase REST API can't read these
-- tables; the backend connects as the table owner and is not affected.

CREATE TABLE IF NOT EXISTS "EmployeeMaster" (
    "employeeNo"     text PRIMARY KEY,
    "fullName"       text NOT NULL,
    "gender"         text,
    "nationality"    text,
    "department"     text,
    "branch"         text,
    "category"       text,
    "employmentType" text,
    "status"         text,
    "jobPosition"    text,
    "jobGrade"       text,
    "section"        text,
    "supervisorNo"   text,
    "workEmail"      text,
    "dateJoined"     timestamp(3),
    "dateResigned"   timestamp(3),
    "inAppraisal"    boolean NOT NULL DEFAULT false,
    "createdAt"      timestamp(3) NOT NULL DEFAULT now(),
    "updatedAt"      timestamp(3) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "EmployeeMasterImport" (
    "id"           serial PRIMARY KEY,
    "fileName"     text,
    "uploadedById" integer REFERENCES "User"("id") ON DELETE SET NULL,
    "uploadedAt"   timestamp(3) NOT NULL DEFAULT now(),
    "summary"      jsonb
);

ALTER TABLE "EmployeeMaster" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeMasterImport" ENABLE ROW LEVEL SECURITY;

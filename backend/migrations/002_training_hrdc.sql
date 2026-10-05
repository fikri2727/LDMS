-- HRDC allowance (RM) and grant ID on Public/Inhouse trainings (2026-10-05).
-- Nullable; existing rows untouched. Safe to run more than once.
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "hrdcAllowance" double precision;
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "hrdcGrantId" text;

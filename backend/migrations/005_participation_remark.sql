-- Remark on a Public/Inhouse participant, e.g. why they were absent (2026-10-15). Nullable; safe to re-run.
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "remark" text;

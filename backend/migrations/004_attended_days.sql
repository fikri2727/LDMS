-- Which days of a multi-day Public/Inhouse training each participant attended (2026-10-14).
-- NULL = all days (the default for every existing participant). Safe to run more than once.
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "attendedDays" integer[];

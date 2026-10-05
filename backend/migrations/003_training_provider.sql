-- Training provider on Public/Inhouse trainings (2026-10-05). Nullable; safe to run more than once.
ALTER TABLE "Training" ADD COLUMN IF NOT EXISTS "trainingProvider" text;

-- Admin "evaluate on behalf" audit trail (2026-10-02).
-- Records which admin keyed in a survey / PME on someone's behalf. Nullable; existing rows untouched.
-- Safe to run more than once.
ALTER TABLE "Participation" ADD COLUMN IF NOT EXISTS "keyedInById" integer;
ALTER TABLE "Pme" ADD COLUMN IF NOT EXISTS "keyedInById" integer;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Participation_keyedInById_fkey') THEN
        ALTER TABLE "Participation" ADD CONSTRAINT "Participation_keyedInById_fkey"
            FOREIGN KEY ("keyedInById") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Pme_keyedInById_fkey') THEN
        ALTER TABLE "Pme" ADD CONSTRAINT "Pme_keyedInById_fkey"
            FOREIGN KEY ("keyedInById") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
    END IF;
END $$;

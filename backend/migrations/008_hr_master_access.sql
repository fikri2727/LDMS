-- HR Master access: an Admin ticks this for HR staff who may open the HR Master
-- (upload the employee report). Admins always have it. Old code ignores the column.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "hrMaster" boolean NOT NULL DEFAULT false;

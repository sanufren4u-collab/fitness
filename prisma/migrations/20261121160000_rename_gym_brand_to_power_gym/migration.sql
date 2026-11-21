ALTER TABLE "GymSettings"
ALTER COLUMN "gymName" SET DEFAULT 'Power Gym';

UPDATE "GymSettings"
SET "gymName" = 'Power Gym'
WHERE "gymName" IN ('IronPulse Fitness', 'IronPulse Flagship');

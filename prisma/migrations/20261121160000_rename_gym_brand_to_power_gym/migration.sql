ALTER TABLE "GymSettings"
ALTER COLUMN "gymName" SET DEFAULT 'Byayamshala';

UPDATE "GymSettings"
SET "gymName" = 'Byayamshala'
WHERE "gymName" IN ('IronPulse Fitness', 'IronPulse Flagship');

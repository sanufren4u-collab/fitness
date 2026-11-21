CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

INSERT INTO "Vendor" ("id", "name", "slug", "updatedAt")
VALUES ('default-vendor', 'Byayamshala', 'power-gym', CURRENT_TIMESTAMP);

ALTER TABLE "User"
ADD COLUMN "vendorId" TEXT,
ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "vendorId" = 'default-vendor';
UPDATE "User"
SET "isPlatformAdmin" = true
WHERE "id" = (
    SELECT "id"
    FROM "User"
    WHERE "role" = 'ADMIN'
    ORDER BY "createdAt", "id"
    LIMIT 1
);

ALTER TABLE "GymSettings" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "TrainerProfile" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "MemberProfile" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "MembershipPlan" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "Membership" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "ClassSession" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "ClassBooking" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "CheckIn" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "WorkoutPlan" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "DietPlan" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "BodyMetricLog" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "Equipment" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "EquipmentLog" ADD COLUMN "vendorId" TEXT;

UPDATE "GymSettings" SET "vendorId" = 'default-vendor';
UPDATE "TrainerProfile" SET "vendorId" = "User"."vendorId"
FROM "User" WHERE "TrainerProfile"."userId" = "User"."id";
UPDATE "MemberProfile" SET "vendorId" = "User"."vendorId"
FROM "User" WHERE "MemberProfile"."userId" = "User"."id";
UPDATE "MembershipPlan" SET "vendorId" = 'default-vendor';
UPDATE "Membership" SET "vendorId" = "MemberProfile"."vendorId"
FROM "MemberProfile" WHERE "Membership"."memberId" = "MemberProfile"."id";
UPDATE "Invoice" SET "vendorId" = "User"."vendorId"
FROM "User" WHERE "Invoice"."userId" = "User"."id";
UPDATE "ClassSession" SET "vendorId" = "TrainerProfile"."vendorId"
FROM "TrainerProfile" WHERE "ClassSession"."trainerId" = "TrainerProfile"."id";
UPDATE "ClassBooking" SET "vendorId" = "ClassSession"."vendorId"
FROM "ClassSession" WHERE "ClassBooking"."sessionId" = "ClassSession"."id";
UPDATE "CheckIn" SET "vendorId" = "User"."vendorId"
FROM "User" WHERE "CheckIn"."userId" = "User"."id";
UPDATE "WorkoutPlan" SET "vendorId" = "MemberProfile"."vendorId"
FROM "MemberProfile" WHERE "WorkoutPlan"."memberId" = "MemberProfile"."id";
UPDATE "DietPlan" SET "vendorId" = "MemberProfile"."vendorId"
FROM "MemberProfile" WHERE "DietPlan"."memberId" = "MemberProfile"."id";
UPDATE "BodyMetricLog" SET "vendorId" = "MemberProfile"."vendorId"
FROM "MemberProfile" WHERE "BodyMetricLog"."memberId" = "MemberProfile"."id";
UPDATE "Equipment" SET "vendorId" = 'default-vendor';
UPDATE "EquipmentLog" SET "vendorId" = "Equipment"."vendorId"
FROM "Equipment" WHERE "EquipmentLog"."equipmentId" = "Equipment"."id";

ALTER TABLE "GymSettings" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "TrainerProfile" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "MemberProfile" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "MembershipPlan" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "Membership" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "ClassSession" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "ClassBooking" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "CheckIn" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "WorkoutPlan" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "DietPlan" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "BodyMetricLog" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "Equipment" ALTER COLUMN "vendorId" SET NOT NULL;
ALTER TABLE "EquipmentLog" ALTER COLUMN "vendorId" SET NOT NULL;

CREATE UNIQUE INDEX "GymSettings_vendorId_key" ON "GymSettings"("vendorId");
CREATE INDEX "User_vendorId_role_isActive_idx" ON "User"("vendorId", "role", "isActive");
CREATE INDEX "TrainerProfile_vendorId_idx" ON "TrainerProfile"("vendorId");
CREATE INDEX "MemberProfile_vendorId_idx" ON "MemberProfile"("vendorId");
CREATE INDEX "MembershipPlan_vendorId_isActive_idx" ON "MembershipPlan"("vendorId", "isActive");
CREATE INDEX "Membership_vendorId_status_idx" ON "Membership"("vendorId", "status");
CREATE INDEX "Invoice_vendorId_createdAt_idx" ON "Invoice"("vendorId", "createdAt");
CREATE INDEX "ClassSession_vendorId_startTime_idx" ON "ClassSession"("vendorId", "startTime");
CREATE INDEX "ClassBooking_vendorId_status_idx" ON "ClassBooking"("vendorId", "status");
CREATE INDEX "CheckIn_vendorId_checkedInAt_idx" ON "CheckIn"("vendorId", "checkedInAt");
CREATE INDEX "WorkoutPlan_vendorId_idx" ON "WorkoutPlan"("vendorId");
CREATE INDEX "DietPlan_vendorId_idx" ON "DietPlan"("vendorId");
CREATE INDEX "BodyMetricLog_vendorId_recordedAt_idx" ON "BodyMetricLog"("vendorId", "recordedAt");
CREATE INDEX "Equipment_vendorId_idx" ON "Equipment"("vendorId");
CREATE INDEX "EquipmentLog_vendorId_createdAt_idx" ON "EquipmentLog"("vendorId", "createdAt");
DROP INDEX "Equipment_serialNumber_key";
CREATE UNIQUE INDEX "Equipment_vendorId_serialNumber_key" ON "Equipment"("vendorId", "serialNumber");
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");

ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TrainerProfile" ADD CONSTRAINT "TrainerProfile_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MemberProfile" ADD CONSTRAINT "MemberProfile_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BodyMetricLog" ADD CONSTRAINT "BodyMetricLog_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EquipmentLog" ADD CONSTRAINT "EquipmentLog_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

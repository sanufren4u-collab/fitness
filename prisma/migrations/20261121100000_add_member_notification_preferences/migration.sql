ALTER TABLE "MemberProfile"
ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "whatsappNotifications" BOOLEAN NOT NULL DEFAULT true;

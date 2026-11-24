-- Preserve a verified account's own under-age signal without retaining its age or birth date.
ALTER TABLE "public"."User" ADD COLUMN "eligibilityRestrictedAt" TIMESTAMP(3);

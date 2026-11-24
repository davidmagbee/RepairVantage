-- Null keeps every existing project active without changing its repair status.
ALTER TABLE "public"."Project" ADD COLUMN "archivedAt" TIMESTAMP(3);

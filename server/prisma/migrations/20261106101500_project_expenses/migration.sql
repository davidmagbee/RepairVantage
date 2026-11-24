-- Store USD amounts in whole cents so expense totals do not accumulate fractional currency errors.
CREATE TABLE "public"."ProjectExpense" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectExpense_projectId_createdAt_idx" ON "public"."ProjectExpense"("projectId", "createdAt");

ALTER TABLE "public"."ProjectExpense" ADD CONSTRAINT "ProjectExpense_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

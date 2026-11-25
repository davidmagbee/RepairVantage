-- Add no rows for existing accounts: each user must make their own declaration.
CREATE TABLE "public"."EligibilityAcknowledgment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EligibilityAcknowledgment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "EligibilityAcknowledgment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EligibilityAcknowledgment_userId_policyVersion_key" ON "public"."EligibilityAcknowledgment"("userId", "policyVersion");

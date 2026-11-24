-- Preserve legacy rows and relationships without assigning private inventory to a guessed owner.
ALTER TABLE "public"."Part"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "onHand" INTEGER NOT NULL DEFAULT 0 CHECK ("onHand" >= 0);
ALTER TABLE "public"."Tool"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "onHand" INTEGER NOT NULL DEFAULT 0 CHECK ("onHand" >= 0);

CREATE INDEX "Part_userId_idx" ON "public"."Part"("userId");
CREATE INDEX "Tool_userId_idx" ON "public"."Tool"("userId");

ALTER TABLE "public"."Part" ADD CONSTRAINT "Part_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Tool" ADD CONSTRAINT "Tool_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

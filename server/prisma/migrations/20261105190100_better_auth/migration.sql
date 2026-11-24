BEGIN;

-- Better Auth compares canonical emails. The existing unique index rejects
-- ambiguous legacy identities, rolling back the migration for manual review.
UPDATE "User" SET "email" = LOWER(BTRIM("email")) WHERE "email" <> LOWER(BTRIM("email"));
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "Session" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

CREATE TABLE "Account" (
    "id" TEXT PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

CREATE TABLE "Verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Verification_identifier_idx" ON "Verification"("identifier");

CREATE TABLE "RateLimit" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "lastRequest" BIGINT NOT NULL
);
CREATE UNIQUE INDEX "RateLimit_key_key" ON "RateLimit"("key");

COMMIT;

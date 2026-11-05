-- Keep the delivery budget independent of Better Auth's IP-window cleanup.
CREATE TABLE "OtpThrottle" (
    "key" TEXT PRIMARY KEY,
    "count" INTEGER NOT NULL,
    "windowStartedAt" BIGINT NOT NULL
);

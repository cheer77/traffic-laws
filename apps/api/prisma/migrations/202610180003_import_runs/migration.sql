CREATE TYPE "ImportStatus" AS ENUM ('completed', 'blocked', 'failed');
CREATE TYPE "ReuseStatus" AS ENUM ('unclear', 'authorized', 'forbidden');

CREATE TABLE "ImportRun" (
  id uuid NOT NULL,
  "actorId" uuid NOT NULL,
  "sourceKey" varchar(80) NOT NULL,
  "sourceUrl" varchar(1000) NOT NULL,
  edition varchar(200) NOT NULL,
  "questionsUrl" varchar(1000),
  "answersUrl" varchar(1000),
  "sourceUpdatedAt" date,
  status "ImportStatus" NOT NULL,
  "reuseStatus" "ReuseStatus" NOT NULL,
  found integer NOT NULL DEFAULT 0,
  imported integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  rejected integer NOT NULL DEFAULT 0,
  published integer NOT NULL DEFAULT 0,
  "withImages" integer NOT NULL DEFAULT 0,
  "threeDCandidates" integer NOT NULL DEFAULT 0,
  message varchar(2000) NOT NULL,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportRun_pkey" PRIMARY KEY (id),
  CONSTRAINT "ImportRun_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportRun_nonnegative_counts" CHECK (
    found >= 0 AND imported >= 0 AND updated >= 0 AND rejected >= 0 AND published >= 0
    AND "withImages" >= 0 AND "threeDCandidates" >= 0
  )
);

CREATE INDEX "ImportRun_sourceKey_createdAt_idx" ON "ImportRun"("sourceKey", "createdAt");
CREATE INDEX "ImportRun_actorId_createdAt_idx" ON "ImportRun"("actorId", "createdAt");

REVOKE ALL ON "ImportRun" FROM PUBLIC;

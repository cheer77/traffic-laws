-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('student', 'reviewer', 'admin');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('recommend_approval', 'changes_requested', 'rejected');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "status" "AccountStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioRevision" (
    "scenarioId" VARCHAR(80) NOT NULL,
    "revision" INTEGER NOT NULL,
    "country" CHAR(2) NOT NULL DEFAULT 'UA',
    "payload" JSONB NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "rulesSnapshot" JSONB NOT NULL,
    "rulesHash" CHAR(64) NOT NULL,
    "authorId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioRevision_pkey" PRIMARY KEY ("scenarioId","revision")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" UUID NOT NULL,
    "scenarioId" VARCHAR(80) NOT NULL,
    "revision" INTEGER NOT NULL,
    "reviewerId" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "evidence" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "scenarioId" VARCHAR(80) NOT NULL,
    "revision" INTEGER NOT NULL,
    "reviewId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("scenarioId","revision")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scenarioId" VARCHAR(80) NOT NULL,
    "revision" INTEGER NOT NULL,
    "answerId" VARCHAR(80) NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "subject" VARCHAR(160) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ScenarioRevision_country_createdAt_idx" ON "ScenarioRevision"("country", "createdAt");

-- CreateIndex
CREATE INDEX "Review_scenarioId_revision_idx" ON "Review"("scenarioId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Review_id_scenarioId_revision_key" ON "Review"("id", "scenarioId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_reviewId_key" ON "Publication"("reviewId");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_reviewId_scenarioId_revision_key" ON "Publication"("reviewId", "scenarioId", "revision");

-- CreateIndex
CREATE INDEX "Attempt_userId_completedAt_id_idx" ON "Attempt"("userId", "completedAt", "id");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_createdAt_idx" ON "AuditEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioRevision" ADD CONSTRAINT "ScenarioRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_scenarioId_revision_fkey" FOREIGN KEY ("scenarioId", "revision") REFERENCES "ScenarioRevision"("scenarioId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_scenarioId_revision_fkey" FOREIGN KEY ("scenarioId", "revision") REFERENCES "ScenarioRevision"("scenarioId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_reviewId_scenarioId_revision_fkey" FOREIGN KEY ("reviewId", "scenarioId", "revision") REFERENCES "Review"("id", "scenarioId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_scenarioId_revision_fkey" FOREIGN KEY ("scenarioId", "revision") REFERENCES "ScenarioRevision"("scenarioId", "revision") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain identity stays derived from the immutable payload, never independently editable.
ALTER TABLE "User" ADD CONSTRAINT "normalized_email" CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254);
ALTER TABLE "ScenarioRevision" ADD CONSTRAINT "scenario_identity" CHECK ((
  revision > 0 AND country = 'UA' AND jsonb_typeof(payload) = 'object'
  AND payload->>'id' = "scenarioId" AND (payload->>'revision')::integer = revision
  AND payload->>'country' = country AND payload->>'schemaVersion' = '1'
  AND payload->'contentStatus'->>'state' IN ('draft','in_review')
  AND jsonb_typeof("rulesSnapshot") = 'array'
) IS TRUE);
ALTER TABLE "Session" ADD CONSTRAINT "session_expiry" CHECK ("expiresAt" > "createdAt");
CREATE FUNCTION reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'immutable record' USING ERRCODE = '23514'; END;
$$;
CREATE TRIGGER immutable_revision BEFORE UPDATE OR DELETE ON "ScenarioRevision" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER immutable_review BEFORE UPDATE OR DELETE ON "Review" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER immutable_attempt BEFORE UPDATE OR DELETE ON "Attempt" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE TRIGGER immutable_publication BEFORE UPDATE ON "Publication" FOR EACH ROW EXECUTE FUNCTION reject_immutable_change();
CREATE FUNCTION validate_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ScenarioRevision" s JOIN "User" u ON u.id = NEW."reviewerId"
    WHERE s."scenarioId" = NEW."scenarioId" AND s.revision = NEW.revision
    AND s."authorId" <> u.id AND u.role IN ('reviewer','admin') AND u.status = 'active'
  ) THEN RAISE EXCEPTION 'invalid reviewer' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER independent_review BEFORE INSERT ON "Review" FOR EACH ROW EXECUTE FUNCTION validate_review();
CREATE FUNCTION validate_publication() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Review" WHERE id = NEW."reviewId" AND decision = 'recommend_approval'
    AND "scenarioId" = NEW."scenarioId" AND revision = NEW.revision)
  THEN RAISE EXCEPTION 'invalid publication review' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER reviewed_publication BEFORE INSERT ON "Publication" FOR EACH ROW EXECUTE FUNCTION validate_publication();
CREATE FUNCTION validate_attempt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ScenarioRevision" s JOIN "Publication" p USING ("scenarioId",revision)
    WHERE s."scenarioId" = NEW."scenarioId" AND s.revision = NEW.revision
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(s.payload->'answers') a WHERE a->>'id' = NEW."answerId")
    AND NEW.correct = (s.payload->>'correctAnswerId' = NEW."answerId")
  ) THEN RAISE EXCEPTION 'invalid attempt' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER authoritative_attempt BEFORE INSERT ON "Attempt" FOR EACH ROW EXECUTE FUNCTION validate_attempt();

-- Defense in depth: the HTTP role can register students only, even outside a controller.
CREATE FUNCTION restrict_runtime_registration() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user = 'traffic_runtime' AND (NEW.role <> 'student' OR NEW.status <> 'active')
  THEN RAISE EXCEPTION 'runtime registration must be an active student' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER student_registration BEFORE INSERT ON "User" FOR EACH ROW EXECUTE FUNCTION restrict_runtime_registration();

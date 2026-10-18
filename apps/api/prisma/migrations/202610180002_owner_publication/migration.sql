-- Owner publication remains narrower than direct table access: the runtime role may execute only
-- these validated, audited transitions and still has no INSERT/DELETE grant on Publication.
CREATE OR REPLACE FUNCTION validate_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "ScenarioRevision" s JOIN "User" u ON u.id = NEW."reviewerId"
    WHERE s."scenarioId" = NEW."scenarioId" AND s.revision = NEW.revision
    AND (s."authorId" <> u.id OR u.role = 'admin')
    AND u.role IN ('reviewer','admin') AND u.status = 'active'
  ) THEN RAISE EXCEPTION 'invalid reviewer' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION owner_publish_scenario(
  scenario_id text,
  scenario_revision integer,
  actor_id uuid,
  review_id uuid,
  audit_id uuid,
  evidence_text text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF length(btrim(evidence_text)) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'invalid publication evidence' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE id = actor_id AND role = 'admin' AND status = 'active') THEN
    RAISE EXCEPTION 'active administrator required' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "ScenarioRevision" WHERE "scenarioId" = scenario_id AND revision = scenario_revision) THEN
    RAISE EXCEPTION 'scenario revision not found' USING ERRCODE = '23503';
  END IF;
  INSERT INTO "Review" (id, "scenarioId", revision, "reviewerId", decision, evidence, "createdAt")
  VALUES (review_id, scenario_id, scenario_revision, actor_id, 'recommend_approval', btrim(evidence_text), CURRENT_TIMESTAMP);
  INSERT INTO "Publication" ("scenarioId", revision, "reviewId", "createdAt")
  VALUES (scenario_id, scenario_revision, review_id, CURRENT_TIMESTAMP);
  INSERT INTO "AuditEvent" (id, "actorId", action, subject, "createdAt")
  VALUES (audit_id, actor_id, 'scenario.published', scenario_id || '@' || scenario_revision, CURRENT_TIMESTAMP);
  RETURN true;
END;
$$;

CREATE FUNCTION owner_unpublish_scenario(
  scenario_id text,
  scenario_revision integer,
  actor_id uuid,
  audit_id uuid,
  evidence_text text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF length(btrim(evidence_text)) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'invalid withdrawal evidence' USING ERRCODE = '23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "User" WHERE id = actor_id AND role = 'admin' AND status = 'active') THEN
    RAISE EXCEPTION 'active administrator required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM "Publication" WHERE "scenarioId" = scenario_id AND revision = scenario_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'publication not found' USING ERRCODE = '23503'; END IF;
  INSERT INTO "AuditEvent" (id, "actorId", action, subject, "createdAt")
  VALUES (audit_id, actor_id, 'scenario.unpublished', scenario_id || '@' || scenario_revision || ': ' || left(btrim(evidence_text), 100), CURRENT_TIMESTAMP);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION owner_publish_scenario(text, integer, uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION owner_unpublish_scenario(text, integer, uuid, uuid, text) FROM PUBLIC;

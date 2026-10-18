import { createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { validateScenario, type Scenario } from "@traffic-laws/scenarios";
import { validateRules } from "@traffic-laws/country-rules";
import { UA_PDR_REFERENCES } from "@traffic-laws/country-rules/ua-pdr-references";
import { Prisma, type Review, type ScenarioRevision } from "../../.generated/client/client";
import { DatabaseService } from "../database/database.service";
import { pageResult, type PaginationDto } from "../common/pagination";
import type { DraftDto, ReviewDto } from "./scenarios.dto";
// JSON round-trip gives Prisma a checked JSON value; never cast a domain object to ORM input.
export function jsonValue(value: unknown): Prisma.InputJsonValue {
  const parsed: unknown = JSON.parse(JSON.stringify(value));
  function isJson(input: unknown): input is Prisma.InputJsonValue {
    if (typeof input === "string" || typeof input === "boolean" || typeof input === "number")
      return true;
    if (Array.isArray(input)) return input.every((v) => v === null || isJson(v));
    return (
      input !== null &&
      typeof input === "object" &&
      Object.values(input).every((v) => v === null || isJson(v))
    );
  }
  if (!isJson(parsed)) throw new BadRequestException();
  return parsed;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
function reviewView(review: Review) {
  return {
    id: review.id,
    scenarioId: review.scenarioId,
    revision: review.revision,
    reviewerId: review.reviewerId,
    decision: review.decision,
    evidence: review.evidence,
    createdAt: review.createdAt,
  };
}
export const contentHash = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");
export function readRevision(record: ScenarioRevision): Scenario {
  if (
    contentHash(record.payload) !== record.payloadHash ||
    contentHash(record.rulesSnapshot) !== record.rulesHash ||
    !Array.isArray(record.rulesSnapshot)
  )
    throw new Error("Stored content integrity failure");
  const scenario = validateScenario(record.payload, { rules: validateRules(record.rulesSnapshot) });
  if (
    scenario.id !== record.scenarioId ||
    scenario.revision !== record.revision ||
    scenario.country !== record.country
  )
    throw new Error("Stored revision mismatch");
  return scenario;
}
// Explicit allowlist: never return correctAnswerId, explanation or trafficDecision before an attempt.
export function questionView(scenario: Scenario) {
  return {
    id: scenario.id,
    revision: scenario.revision,
    country: scenario.country,
    language: scenario.language,
    category: scenario.category,
    question: scenario.question,
    answers: scenario.answers,
    sceneReference: scenario.sceneReference,
  };
}
@Injectable()
export class ScenariosService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async saveDraft(body: DraftDto, authorId: string) {
    let scenario: Scenario;
    try {
      scenario = validateScenario(body.payload, { rules: UA_PDR_REFERENCES });
    } catch {
      throw new BadRequestException();
    }
    if (!["draft", "in_review"].includes(scenario.contentStatus.state))
      throw new ForbiddenException();
    if (scenario.revision !== body.expectedRevision + 1) throw new ConflictException();
    const rules = UA_PDR_REFERENCES.filter((rule) => scenario.ruleReferences.includes(rule.id));
    // Store all context rules for decisions that reference more than the displayed explanation.
    const rulesSnapshot = scenario.trafficDecision ? UA_PDR_REFERENCES : rules;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${scenario.id},0))::text`;
      const latest = await tx.scenarioRevision.findFirst({
        where: { scenarioId: scenario.id },
        orderBy: { revision: "desc" },
      });
      if ((latest?.revision ?? 0) !== body.expectedRevision) throw new ConflictException();
      const record = await tx.scenarioRevision.create({
        data: {
          scenarioId: scenario.id,
          revision: scenario.revision,
          country: scenario.country,
          payload: jsonValue(scenario),
          payloadHash: contentHash(scenario),
          rulesSnapshot: jsonValue(rulesSnapshot),
          rulesHash: contentHash(rulesSnapshot),
          authorId,
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: authorId,
          action: "scenario.revision_created",
          subject: `${scenario.id}@${scenario.revision}`,
        },
      });
      return {
        id: record.scenarioId,
        revision: record.revision,
        payloadHash: record.payloadHash,
        createdAt: record.createdAt,
      };
    });
  }
  async internalRevision(id: string, revision: number) {
    const record = await this.db.scenarioRevision.findUnique({
      where: { scenarioId_revision: { scenarioId: id, revision } },
      include: { reviews: true },
    });
    if (!record) throw new NotFoundException();
    return {
      payload: readRevision(record),
      payloadHash: record.payloadHash,
      rulesHash: record.rulesHash,
      createdAt: record.createdAt,
      reviews: record.reviews.map(reviewView),
    };
  }
  async review(id: string, revision: number, body: ReviewDto, reviewerId: string) {
    return this.db.$transaction(async (tx) => {
      const record = await tx.scenarioRevision.findUnique({
        where: { scenarioId_revision: { scenarioId: id, revision } },
      });
      if (!record) throw new NotFoundException();
      if (record.authorId === reviewerId) throw new ForbiddenException();
      readRevision(record);
      const review = await tx.review.create({
        data: { scenarioId: id, revision, reviewerId, ...body },
      });
      await tx.auditEvent.create({
        data: {
          actorId: reviewerId,
          action: `review.${body.decision}`,
          subject: `${id}@${revision}`,
        },
      });
      return reviewView(review);
    });
  }
  async eligible(id: string, revision: number): Promise<Scenario> {
    const release = await this.db.publication.findUnique({
      where: { scenarioId_revision: { scenarioId: id, revision } },
      include: { scenario: true, review: { include: { reviewer: true } } },
    });
    if (
      !release ||
      release.review.decision !== "recommend_approval" ||
      release.review.reviewerId === release.scenario.authorId ||
      release.review.reviewer.status !== "active" ||
      !["admin", "reviewer"].includes(release.review.reviewer.role)
    )
      throw new NotFoundException();
    try {
      const scenario = readRevision(release.scenario);
      if (!Array.isArray(release.scenario.rulesSnapshot)) throw new Error("Invalid rules");
      // The existing validator enforces verified normative references and blocks traffic decisions.
      return validateScenario(
        {
          ...scenario,
          contentStatus: {
            state: "published",
            reviewedBy: release.review.reviewerId,
            reviewedAt: release.review.createdAt.toISOString().slice(0, 10),
          },
        },
        { rules: validateRules(release.scenario.rulesSnapshot) },
      );
    } catch {
      throw new NotFoundException();
    }
  }
  async list(page: PaginationDto) {
    const releases = await this.db.publication.findMany({
      orderBy: [{ scenarioId: "asc" }, { revision: "desc" }],
      skip: (page.page - 1) * page.limit,
      take: page.limit + 1,
    });
    const visible = [];
    for (const release of releases.slice(0, page.limit)) {
      try {
        const scenario = await this.eligible(release.scenarioId, release.revision);
        visible.push({
          id: scenario.id,
          revision: scenario.revision,
          country: scenario.country,
          language: scenario.language,
          category: scenario.category,
        });
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
      }
    }
    // Pagination follows stored release slots, even if a revoked/invalid release is hidden.
    return {
      ...pageResult(visible, page),
      nextPage: releases.length > page.limit && page.page < 200 ? page.page + 1 : null,
      items: visible.slice(0, page.limit),
    };
  }
}

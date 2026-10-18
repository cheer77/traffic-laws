import "reflect-metadata";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { EDUCATIONAL_DEMO_SCENARIOS } from "@traffic-laws/scenarios/education-demo";
import { createApplication } from "../src/application";
import { readConfig } from "../src/config/config";
import { DatabaseService } from "../src/database/database.service";
import { AuthService, tokenHash } from "../src/auth/auth.service";
import { contentHash, jsonValue } from "../src/scenarios/scenarios.service";
import { TEST_RULE, fixtureScenario } from "./fixtures";
const runtimeUrl = process.env.API_TEST_DATABASE_URL;
const ownerUrl = process.env.API_TEST_OWNER_URL;
// Only the runner creates these URLs and an isolated container. Never reset external databases.
describe.skipIf(!runtimeUrl || !ownerUrl)("isolated PostgreSQL and HTTP", () => {
  let app: NestExpressApplication,
    owner: DatabaseService,
    runtime: DatabaseService,
    auth: AuthService,
    base: string;
  let studentToken: string,
    otherToken: string,
    adminToken: string,
    reviewerToken: string,
    studentId: string,
    authorId: string,
    reviewerId: string;
  const credentials = { email: "student@example.org", password: "test-only long passphrase" };
  const config = readConfig({
    NODE_ENV: "test",
    DATABASE_URL: runtimeUrl ?? "postgresql://unused:unused@127.0.0.1:1/unconfigured",
    CORS_ORIGINS: "http://localhost:3000",
    SWAGGER_ENABLED: "true",
  });
  const textField = (body: Record<string, unknown>, field: string) => {
    const value = body[field];
    if (typeof value !== "string") throw new Error(`Missing ${field}`);
    return value;
  };
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  async function request(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      token?: string;
      raw?: string;
      headers?: Record<string, string>;
    } = {},
  ) {
    const response = await fetch(base + path, {
      method: options.method ?? "GET",
      headers: {
        ...(options.body !== undefined || options.raw !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
      body: options.raw ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
    const body: unknown = await response.json();
    if (!isRecord(body)) throw new Error("Expected response object");
    return { status: response.status, body, headers: response.headers };
  }
  beforeAll(async () => {
    if (!runtimeUrl || !ownerUrl || !new URL(runtimeUrl).pathname.startsWith("/traffic_test_"))
      throw new Error("Unsafe test database");
    owner = new DatabaseService(readConfig({ NODE_ENV: "test", DATABASE_URL: ownerUrl }));
    ({ app } = await createApplication(config, false));
    await app.listen(0, "127.0.0.1");
    base = (await app.getUrl()) + "/api/v1";
    runtime = app.get(DatabaseService);
    auth = app.get(AuthService);
    const admin = await new AuthService(owner, config).bootstrap({
      email: "admin@example.org",
      password: "admin test-only passphrase",
    });
    authorId = admin.id;
    const reviewer = await owner.user.create({
      data: {
        email: "reviewer@example.org",
        passwordHash: (await owner.user.findUniqueOrThrow({ where: { id: authorId } }))
          .passwordHash,
        role: "reviewer",
      },
    });
    reviewerId = reviewer.id;
    adminToken = (
      await auth.login({ email: "admin@example.org", password: "admin test-only passphrase" })
    ).accessToken;
    reviewerToken = (
      await auth.login({ email: "reviewer@example.org", password: "admin test-only passphrase" })
    ).accessToken;
  });
  afterAll(async () => {
    await app?.close();
    await owner?.$disconnect();
  });
  it("connects to real PostgreSQL with a restricted runtime role", async () => {
    expect(await runtime.$queryRaw`SELECT current_user`).toEqual([
      { current_user: "traffic_runtime" },
    ]);
    expect(
      await owner.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
    ).toEqual([{ count: 1 }]);
  });
  it("serves liveness, readiness, request IDs, security headers and CORS", async () => {
    const live = await request("/health/live", { headers: { Origin: "http://localhost:3000" } });
    expect(live.status).toBe(200);
    expect(live.headers.get("x-request-id")).toMatch(/^[\da-f-]{36}$/);
    expect(live.headers.get("x-content-type-options")).toBe("nosniff");
    expect(live.headers.get("cache-control")).toBe("no-store");
    expect(live.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(
      (await request("/health/live", { headers: { Origin: "https://evil.example" } })).headers.get(
        "access-control-allow-origin",
      ),
    ).toBeNull();
    expect((await request("/health/ready")).body).toEqual({ status: "ready" });
  });
  it("registers only student accounts and normalizes email", async () => {
    const response = await request("/auth/register", {
      method: "POST",
      body: { ...credentials, email: " STUDENT@example.org " },
    });
    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ email: credentials.email, role: "student" });
    expect(response.body).not.toHaveProperty("passwordHash");
    studentId = textField(response.body, "id");
    expect(
      (
        await request("/auth/register", {
          method: "POST",
          body: { ...credentials, email: "injected@example.org", role: "admin" },
        })
      ).status,
    ).toBe(400);
    expect((await request("/auth/register", { method: "POST", body: credentials })).status).toBe(
      409,
    );
  });
  it("logs in with opaque expiring tokens and stores only token hashes", async () => {
    const response = await request("/auth/login", { method: "POST", body: credentials });
    expect(response.status).toBe(200);
    studentToken = textField(response.body, "accessToken");
    expect(studentToken).toMatch(/^[\w-]{43}$/);
    expect(response.body).toHaveProperty("expiresAt");
    const stored = await owner.session.findUniqueOrThrow({
      where: { tokenHash: tokenHash(studentToken) },
    });
    expect(JSON.stringify(stored)).not.toContain(studentToken);
    expect((await request("/users/me", { token: studentToken })).body).toMatchObject({
      id: studentId,
      role: "student",
    });
  });
  it("rejects wrong passwords and nonexistent accounts consistently", async () => {
    for (const email of [credentials.email, "absent@example.org"])
      expect(
        (
          await request("/auth/login", {
            method: "POST",
            body: { email, password: "wrong but long passphrase" },
          })
        ).status,
      ).toBe(401);
  });
  it("rejects missing auth and student access to staff routes", async () => {
    expect((await request("/internal/scenarios")).status).toBe(401);
    expect((await request("/internal/scenarios", { token: studentToken })).status).toBe(403);
    expect((await request("/internal/scenarios/x/revisions", { token: studentToken })).status).toBe(
      403,
    );
    expect((await request("/users/me")).status).toBe(401);
    expect((await request("/progress")).status).toBe(401);
    expect(
      (await request("/internal/scenarios/x/revisions/1", { token: studentToken })).status,
    ).toBe(403);
    expect(
      (
        await request("/internal/scenarios/revisions", {
          method: "POST",
          token: studentToken,
          body: {},
        })
      ).status,
    ).toBe(403);
  });
  it("validates malformed JSON, unknown fields, passwords, body size and pagination", async () => {
    expect(
      (
        await request("/auth/register", {
          method: "POST",
          body: { email: "invalid", password: "short" },
        })
      ).status,
    ).toBe(400);
    expect((await request("/auth/register", { method: "POST", raw: "{" })).status).toBe(400);
    expect(
      (
        await request("/auth/register", {
          method: "POST",
          raw: JSON.stringify({ value: "x".repeat(1600000) }),
        })
      ).status,
    ).toBe(413);
    expect((await request("/scenarios?limit=100000")).status).toBe(400);
    expect(
      (await request("/progress/attempts?userId=another", { token: studentToken })).status,
    ).toBe(400);
  });
  it("stores all current education demos as protected in_review revisions", async () => {
    for (const scenario of EDUCATIONAL_DEMO_SCENARIOS) {
      expect(scenario.contentStatus.state).toBe("in_review");
      expect(
        (
          await request("/internal/scenarios/revisions", {
            method: "POST",
            token: adminToken,
            body: { payload: scenario, expectedRevision: 0 },
          })
        ).status,
      ).toBe(201);
      expect((await request(`/scenarios/${scenario.id}/revisions/1`)).status).toBe(404);
      expect(
        (await request(`/internal/scenarios/${scenario.id}/revisions/1`, { token: reviewerToken }))
          .status,
      ).toBe(200);
    }
    expect((await request("/scenarios")).body).toMatchObject({ items: [] });
    const staffList = await request("/internal/scenarios?limit=2", { token: reviewerToken });
    expect(staffList.status).toBe(200);
    expect(staffList.body).toMatchObject({ page: 1, limit: 2, nextPage: 2 });
    expect(JSON.stringify(staffList.body)).not.toContain("correctAnswerId");
    expect(
      (await request("/internal/scenarios?status=published", { token: reviewerToken })).status,
    ).toBe(400);
    const filtered = await request(
      `/internal/scenarios?q=${EDUCATIONAL_DEMO_SCENARIOS[0].id}&status=in_review`,
      { token: reviewerToken },
    );
    expect(filtered.body).toMatchObject({ items: [{ id: EDUCATIONAL_DEMO_SCENARIOS[0].id }] });
    const history = await request(
      `/internal/scenarios/${EDUCATIONAL_DEMO_SCENARIOS[0].id}/revisions`,
      { token: reviewerToken },
    );
    expect(history.status).toBe(200);
    expect(history.body).toMatchObject({ items: [{ revision: 1, contentStatus: "in_review" }] });
  });
  it("rejects invalid scenarios and fabricated JSON publication", async () => {
    const demo = EDUCATIONAL_DEMO_SCENARIOS[0];
    for (const payload of [
      { ...demo, correctAnswerId: "missing" },
      {
        ...demo,
        contentStatus: { state: "published", reviewedBy: "admin", reviewedAt: "2026-10-17" },
      },
      { ...demo, country: "ES" },
    ])
      expect(
        (
          await request("/internal/scenarios/revisions", {
            method: "POST",
            token: adminToken,
            body: { payload, expectedRevision: 0 },
          })
        ).status,
      ).toBe(400);
    expect(
      (
        await request(`/internal/scenarios/${demo.id}/revisions/1/publish`, {
          method: "POST",
          token: adminToken,
        })
      ).status,
    ).toBe(403);
  });
  it("serializes competing revision writes and preserves old payloads", async () => {
    const demo = EDUCATIONAL_DEMO_SCENARIOS[0],
      payload = { ...demo, revision: 2 };
    const results = await Promise.all(
      [1, 2].map(() =>
        request("/internal/scenarios/revisions", {
          method: "POST",
          token: adminToken,
          body: { payload, expectedRevision: 1 },
        }),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      (
        await owner.scenarioRevision.findUniqueOrThrow({
          where: { scenarioId_revision: { scenarioId: demo.id, revision: 1 } },
        })
      ).payload,
    ).toEqual(demo);
    await expect(
      owner.scenarioRevision.update({
        where: { scenarioId_revision: { scenarioId: demo.id, revision: 1 } },
        data: { payload: jsonValue(payload) },
      }),
    ).rejects.toThrow();
  });
  it("records authenticated independent recommendations without publishing", async () => {
    const demo = EDUCATIONAL_DEMO_SCENARIOS[0],
      body = {
        decision: "recommend_approval",
        evidence: "Synthetic test recommendation, no real legal approval",
      };
    expect(
      (
        await request(`/internal/scenarios/${demo.id}/revisions/1/reviews`, {
          method: "POST",
          token: adminToken,
          body,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(`/internal/scenarios/${demo.id}/revisions/1/reviews`, {
          method: "POST",
          token: reviewerToken,
          body,
        })
      ).status,
    ).toBe(201);
    expect((await request(`/scenarios/${demo.id}/revisions/1`)).status).toBe(404);
    expect(await owner.auditEvent.count()).toBeGreaterThan(4);
    await expect(
      runtime.publication.create({
        data: {
          scenarioId: demo.id,
          revision: 1,
          reviewId: "00000000-0000-0000-0000-000000000000",
        },
      }),
    ).rejects.toThrow();
  });
  it("keeps even owner-created releases of unverified demos invisible", async () => {
    const demo = EDUCATIONAL_DEMO_SCENARIOS[0];
    const review = await owner.review.findFirstOrThrow({
      where: { scenarioId: demo.id, revision: 1 },
    });
    await owner.publication.create({
      data: { scenarioId: demo.id, revision: 1, reviewId: review.id },
    });
    expect((await request(`/scenarios/${demo.id}/revisions/1`)).status).toBe(404);
    expect(
      (
        await request("/progress/attempts", {
          method: "POST",
          token: studentToken,
          body: { scenarioId: demo.id, revision: 1, answerId: demo.correctAnswerId },
        })
      ).status,
    ).toBe(404);
  });
  it("serves only safe question fields for an isolated synthetic release", async () => {
    const fixture = fixtureScenario();
    await owner.scenarioRevision.create({
      data: {
        scenarioId: fixture.id,
        revision: 1,
        authorId,
        payload: jsonValue(fixture),
        payloadHash: contentHash(fixture),
        rulesSnapshot: jsonValue([TEST_RULE]),
        rulesHash: contentHash([TEST_RULE]),
      },
    });
    const review = await owner.review.create({
      data: {
        scenarioId: fixture.id,
        revision: 1,
        reviewerId,
        decision: "recommend_approval",
        evidence: "SYNTHETIC TEST ONLY",
      },
    });
    await owner.publication.create({
      data: { scenarioId: fixture.id, revision: 1, reviewId: review.id },
    });
    const response = await request(`/scenarios/${fixture.id}/revisions/1`);
    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty("correctAnswerId");
    expect(response.body).not.toHaveProperty("explanation");
    expect(response.body).not.toHaveProperty("trafficDecision");
    expect((await request("/scenarios")).body).toMatchObject({ items: [{ id: fixture.id }] });
  });
  it("does not duplicate lookahead releases across pages with hidden content", async () => {
    expect((await request("/scenarios?limit=1&page=1")).body).toMatchObject({
      items: [],
      nextPage: 2,
    });
    expect((await request("/scenarios?limit=1&page=2")).body).toMatchObject({
      items: [{ id: fixtureScenario().id }],
      nextPage: null,
    });
  });
  it("rejects out-of-range revision parameters before database access", async () => {
    for (const revision of ["0", "-1", "2147483648", "1.5", "999999999999999999999"])
      expect((await request(`/scenarios/fixture-question/revisions/${revision}`)).status).toBe(400);
  });
  it("scores on the server, saves attempts and returns answer feedback only after submission", async () => {
    const body = { scenarioId: fixtureScenario().id, revision: 1, answerId: "no" };
    expect(
      (
        await request("/progress/attempts", {
          method: "POST",
          token: studentToken,
          body: { ...body, correct: true },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/progress/attempts", {
          method: "POST",
          token: studentToken,
          body: { ...body, answerId: "missing" },
        })
      ).status,
    ).toBe(400);
    expect(
      (await request("/progress/attempts", { method: "POST", token: studentToken, body })).body,
    ).toMatchObject({ correct: false, correctAnswerId: "yes", revision: 1 });
    expect(
      (
        await request("/progress/attempts", {
          method: "POST",
          token: studentToken,
          body: { ...body, answerId: "yes" },
        })
      ).body,
    ).toMatchObject({ correct: true });
    expect((await request("/progress", { token: studentToken })).body).toEqual({
      attempts: 2,
      correct: 1,
      completedRevisions: 1,
    });
  });
  it("preserves exact attempt revisions after later content and enforces DB constraints", async () => {
    const fixture = fixtureScenario(2);
    await owner.scenarioRevision.create({
      data: {
        scenarioId: fixture.id,
        revision: 2,
        authorId,
        payload: jsonValue(fixture),
        payloadHash: contentHash(fixture),
        rulesSnapshot: jsonValue([TEST_RULE]),
        rulesHash: contentHash([TEST_RULE]),
      },
    });
    const attempts = await owner.attempt.findMany({ where: { userId: studentId } });
    expect(attempts).toHaveLength(2);
    expect(attempts.every((a) => a.revision === 1)).toBe(true);
    await expect(
      owner.attempt.create({
        data: {
          userId: studentId,
          scenarioId: fixture.id,
          revision: 1,
          answerId: "no",
          correct: true,
        },
      }),
    ).rejects.toThrow();
    await expect(
      owner.scenarioRevision.delete({
        where: { scenarioId_revision: { scenarioId: fixture.id, revision: 1 } },
      }),
    ).rejects.toThrow();
    await expect(
      owner.review.create({
        data: {
          scenarioId: fixture.id,
          revision: 1,
          reviewerId: authorId,
          decision: "recommend_approval",
          evidence: "self-review",
        },
      }),
    ).rejects.toThrow();
    await expect(
      owner.attempt.update({ where: { id: attempts[0].id }, data: { correct: true } }),
    ).rejects.toThrow();
  });
  it("isolates private progress by authenticated identity", async () => {
    const other = { email: "other@example.org", password: "another test-only passphrase" };
    await auth.register(other);
    otherToken = (await auth.login(other)).accessToken;
    expect((await request("/progress", { token: otherToken })).body).toEqual({
      attempts: 0,
      correct: 0,
      completedRevisions: 0,
    });
    expect((await request("/progress/attempts", { token: otherToken })).body).toMatchObject({
      items: [],
    });
    expect((await request(`/users/${studentId}/progress`, { token: otherToken })).status).toBe(404);
    const history = await request("/progress/attempts?limit=1", { token: studentToken });
    expect(history.body).toMatchObject({ nextPage: 2 });
  });
  it("revokes logout immediately and rejects expired/disabled sessions", async () => {
    expect((await request("/auth/logout", { method: "POST", token: otherToken })).status).toBe(200);
    expect((await request("/users/me", { token: otherToken })).status).toBe(401);
    const expiring = await auth.login(credentials);
    await owner.session.update({
      where: { tokenHash: tokenHash(expiring.accessToken) },
      data: { createdAt: new Date(Date.now() - 120000), expiresAt: new Date(Date.now() - 60000) },
    });
    expect((await request("/users/me", { token: expiring.accessToken })).status).toBe(401);
    await owner.user.update({ where: { id: studentId }, data: { status: "disabled" } });
    expect((await request("/users/me", { token: studentToken })).status).toBe(401);
    await owner.user.update({ where: { id: studentId }, data: { status: "active" } });
  });
  it("rechecks role changes for existing sessions", async () => {
    await owner.user.update({ where: { id: reviewerId }, data: { role: "student" } });
    expect(
      (
        await request(`/internal/scenarios/${EDUCATIONAL_DEMO_SCENARIOS[0].id}/revisions/1`, {
          token: reviewerToken,
        })
      ).status,
    ).toBe(403);
    await owner.user.update({ where: { id: reviewerId }, data: { role: "reviewer" } });
  });
  it("prevents database-level runtime privilege escalation", async () => {
    await expect(
      runtime.user.update({ where: { id: studentId }, data: { role: "admin" } }),
    ).rejects.toThrow();
    await expect(
      runtime.user.create({
        data: {
          email: "db-escalation@example.org",
          passwordHash: "not-a-credential",
          role: "admin",
        },
      }),
    ).rejects.toThrow();
    await expect(
      auth.bootstrap({
        email: "runtime-admin@example.org",
        password: "runtime test-only passphrase",
      }),
    ).rejects.toThrow();
  });
  it("refuses a second administrator bootstrap", async () => {
    await expect(
      new AuthService(owner, config).bootstrap({
        email: "second-admin@example.org",
        password: "another admin passphrase",
      }),
    ).rejects.toThrow();
  });
  it("exports OpenAPI and Swagger", async () => {
    const response = await fetch(base.replace("/api/v1", "/api/openapi.json"));
    expect(response.status).toBe(200);
    expect(await response.json()).toHaveProperty(["paths", "/api/v1/auth/login"]);
    expect((await fetch(base.replace("/api/v1", "/api/docs"))).status).toBe(200);
  });
  it("rate limits auth before password work and ignores spoofed forwarded IPs", async () => {
    const isolated = await createApplication(config, false);
    await isolated.app.listen(0, "127.0.0.1");
    try {
      const url = (await isolated.app.getUrl()) + "/api/v1/auth/login";
      for (let i = 0; i < 10; i++)
        expect(
          (
            await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-Forwarded-For": `192.0.2.${i}` },
              body: "{}",
            })
          ).status,
        ).toBe(400);
      const blocked = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(blocked.status).toBe(429);
      expect(blocked.headers.get("retry-after")).not.toBeNull();
    } finally {
      await isolated.app.close();
    }
  });
  it("reports unavailable DB readiness without exposing connection details", async () => {
    const isolated = await createApplication(
      readConfig({
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://private:secret@127.0.0.1:1/unavailable",
      }),
      false,
    );
    await isolated.app.listen(0, "127.0.0.1");
    try {
      const url = await isolated.app.getUrl();
      expect((await fetch(url + "/api/v1/health/live")).status).toBe(200);
      const ready = await fetch(url + "/api/v1/health/ready");
      expect(ready.status).toBe(503);
      expect(await ready.text()).not.toMatch(/private|secret|postgres|Prisma/);
    } finally {
      await isolated.app.close();
    }
  });
});

# Phase 6 — Backend Foundation audit

Audit date: **2026-10-18**. **Phase 6: Completed** — backend engineering, functional verification,
migration/recovery checks and the dependency security acceptance gate are satisfied. The affected
development globbing dependency was replaced with a pinned, tested stable alternative. This report does not claim security certification or authorize
an Internet launch. **Phase 5 remains In progress, unchanged. Phase 7 has not started.**

## Resumption and scope

The interrupted working tree already contained the NestJS API, Prisma schema/migration, authentication,
protected revisions/reviews, progress, seed/bootstrap tools, documentation and 21 passing real-DB
integration tests. It had not completed the final repository/security/browser audit. No existing work
was discarded. Review during continuation found and corrected:

- Seven advisory records in the initial Prisma/Swagger dependency graph. Prisma was upgraded to
  stable **7.10.1**, with a scoped Swagger `js-yaml` **5.4.1** override.
- Existing Vitest/mocker/tinypool advisories. All workspace manifests now pin stable **Vitest 4.1.11**;
  the existing stable Vite **7.3.7** transform is retained. Existing tests were preserved unchanged.
- Missing OpenAPI path-parameter schemas caused by the build’s lack of emitted decorator type metadata;
  explicit schemas and regression checks now make ID/revision operations usable in Swagger.
- A pagination lookahead bug that could duplicate a visible release after a hidden one; regression
  coverage now verifies empty-page advancement and no duplicate lookahead.
- Out-of-range path revisions, duplicate/overriding database URL parameters, and cleanup on failed
  startup. The API now validates these before use and closes its pool on startup failure.
- Excess runtime DB privileges. Runtime cannot update users or promote a registration; only session
  revocation is writable. Administrator bootstrap requires an operator connection.
- Recovery documentation lacked an executable re-grant path. `--grant-existing` now reapplies only
  restricted grants after restoration, and the recovery drill verifies restored login and progress.

The final database image is **PostgreSQL 17.11-alpine**, a stable security maintenance release;
see [upstream release notes](https://www.postgresql.org/docs/17/release-17-11.html).
The initial advisory-lock query was also corrected during first implementation to return a supported
Prisma type. These were implementation findings, not failures hidden by skipping tests.

Web/Studio product source, 3D assets, Scene Engine, scenario validators, traffic algorithms and Phase 5
content were not changed. Existing application/package manifest changes are the common Vitest security update; the root
manifest additionally runs the new dependency security regression suite. No branches, commits, pushes or cloud deployments were performed.

## Delivered architecture

`apps/api` is an independently runnable NestJS **11.2.7** modular monolith, strict TypeScript, Node 24,
REST `/api/v1`, with the existing pnpm/Turbo workflow. Port defaults to **3002** alongside Web 3000
and Studio 3001. The API bundles data-only public shared-package exports, not Studio or R3F imports.

| Module        | Implemented responsibility                                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| config/common | Fail-closed environment validation, DTO allowlists, safe errors, bounded pagination/revisions, OpenAPI contracts                               |
| database      | PostgreSQL pool via Prisma PG adapter, explicit owner/runtime split, migration and lifecycle handling                                          |
| auth          | Registration, login, logout, expiring/revocable bearer sessions, role guards, operator-only admin bootstrap                                    |
| users         | Authenticated safe own-profile projection                                                                                                      |
| scenarios     | Domain validation, immutable revisions and rule snapshots, independent review recommendations, public eligibility and safe question projection |
| progress      | Server-scored attempts against eligible exact revisions, private paginated history and basic totals                                            |
| health        | Separate process liveness and database/schema readiness                                                                                        |

Controllers handle HTTP plumbing; services implement use cases. No backend country-rule evaluator
was invented. `validateScenario` / `validateRules` remain authoritative. There is no speculative
content module, queue, Redis, billing system, microservice, Admin UI or frontend redesign.

The [API runbook](../apps/api/README.md) gives step-by-step PostgreSQL startup, migrations, generated
credentials, administrator bootstrap, test registration/login, Swagger usage, protected draft APIs,
isolated successful progress tests, environment configuration, deployment and recovery commands.

## Data and revision strategy

Users and sessions, revision identity, review/publication records, attempts and audit events are
normalized with FK/unique/index constraints. Scenario content is one immutable JSONB payload per
`(scenarioId, revision)`, with canonical SHA-256 integrity digest and an immutable validated rule
context snapshot/digest. Country and identity columns are constrained to match the payload. There
is no independently editable answer copy. A content update appends N+1 with expected previous N;
an advisory transaction lock serializes competing saves. Historical attempts retain their exact FK.

SQL supplements Prisma with identity/status checks, student-only runtime registration, immutable
revision/review/attempt/audit triggers, independent active-staff reviewer validation, exact
revision-bound publication references and authoritative attempt-result checks. `User` has created/
updated timestamps; content revisions have creation timestamps and cannot be edited in place.
The migration is append-only source; no destructive down migration or `db push` workflow is supplied.

Review recommendations are tied to the authenticated reviewer and immutable revision, with an audit
record. They prove an action occurred, not legal competence or correctness. There is no release
writer in the API or CLI. Runtime has SELECT-only access to `Publication`; the publish endpoint
always returns 403, including for administrators. Starting HTTP with publication INSERT privileges
is rejected. Current demonstrations remain `in_review`; seeded data creates no reviews or releases.
Even a DB-owner-inserted release of an unverified demo fails public eligibility.

## Authentication and security review

Passwords use asynchronous Node scrypt (N=131072, r=8, p=1, random 16-byte salt, 64-byte output),
constant-time comparison and dummy KDF work for unknown accounts. This follows the documented
[scrypt guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
Input is bounded to 15–128 characters. Public registration only creates active students, enforced
both in HTTP code and in the runtime database role's insert trigger.

Each login issues 32 random token bytes. Only SHA-256 digests are stored; sessions have absolute
expiry (default one hour), immediate logout revocation and live account/role checks. There are no
refresh tokens, JWT trust caches or hardcoded development credentials. Bootstrap serializes first
administrator creation, refuses promotion of an existing public account and requires owner access.
Browser clients should use memory or a separately designed BFF; mobile clients should use OS secure
storage. No cookie authentication is accepted, so ambient-cookie CSRF does not authorize requests.

Reviewed threats and exercised defenses:

| Threat                           | Defense / evidence                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Privilege escalation             | DTO rejects role injection; student-only SQL registration; runtime cannot UPDATE users; live role checks; owner-only bootstrap    |
| IDOR/private progress disclosure | User identity comes only from authenticated session; no user selector; cross-user history/totals tested                           |
| Forged answer result             | Answer ID is checked against authoritative saved revision; correctness computed server-side and checked by SQL                    |
| Premature answer disclosure      | Explicit question allowlist excludes answer key, explanation and traffic-decision claim                                           |
| Draft or forged publication      | No API publication authority; separate release relation; independent reviewer and shared normative validator checks               |
| SQL/request injection            | Parameterized Prisma/raw tagged queries, strict DTOs, bounded JSON and revision parameters                                        |
| Credential leakage               | Generic error envelope, no values/SQL/stack reflection; logs contain only request ID/method/status/duration; logging probe tested |
| Brute force/resource abuse       | General IP limiter plus auth IP/email budgets before KDF, body size and DB query/pool limits                                      |
| Unsafe connections/configuration | Exact CORS list, Helmet headers, TLS verification in production, duplicate URL options rejected, no trusted forwarded IP          |

The limiter is process-local and deployment is intentionally single-instance unless trusted edge
limits are supplied. Proxy IP trust must be explicitly designed before exposure. TLS to PostgreSQL
is exercised with a disposable CA and hostname/IP-verified certificate; HTTP ingress TLS remains a
deployment responsibility. This is not a penetration test, GPU test or cloud-production acceptance.

## API contracts

Swagger `/api/docs` and JSON `/api/openapi.json` are enabled in development and optionally elsewhere.
`pnpm --filter @traffic-laws/api openapi` generates a standalone spec after building without a DB.

- Auth: `POST /auth/register`, `/auth/login`, `/auth/logout`; own profile: `GET /users/me`.
- Public content: `GET /scenarios`, `/scenarios/:id/revisions/:revision`.
- Staff: `POST /internal/scenarios/revisions`, `GET /internal/scenarios/:id/revisions/:revision`,
  `POST .../reviews`; `POST .../publish` is documented as disabled.
- Private progress: `POST /progress/attempts`, `GET /progress/attempts`, `GET /progress`.
- Health: `GET /health/live`, `GET /health/ready`.

All above routes are under `/api/v1`. Success objects and bounded pagination are documented;
errors consistently use `{error:{status,message,requestId}}`. Nested scenario/scene JSON remains
validated by the existing domain packages. Correct-answer feedback is returned only after a valid
submission. Real development lists remain empty; synthetic eligible fixtures exist only in tests.

## Verification results

| Check                                                                          | Result                                                                                                                              |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                                                                   | Passed: import audit, lint, tests, typecheck, production builds, formatting                                                         |
| `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit:imports` | Each rerun explicitly for final security acceptance; passed                                                                         |
| Existing automated tests                                                       | All **179** preserved and passing under patched Vitest                                                                              |
| API unit/config/contract tests                                                 | **15 passed**                                                                                                                       |
| API real PostgreSQL/HTTP integration tests                                     | **25 passed** in an isolated generated-credential container                                                                         |
| Dependency compatibility/security regression tests                             | **8 passed**, including real Next rule behavior and bounded deep-pattern subprocesses                                               |
| Total distinct tests                                                           | **227 passed**: all previous **219** preserved plus **8** new security tests; ordinary `pnpm test` explicitly skips the 25 DB cases |
| Frozen lockfile install                                                        | Passed offline with the pinned patch; lockfile SHA-256 unchanged before/after                                                       |
| Fresh and repeated migration                                                   | Passed; one applied migration, repeated deploy is a no-op                                                                           |
| Migration integrity                                                            | Prisma drift comparison, migration status and exact SHA-256 checksum passed                                                         |
| Development and production startup                                             | Passed; production mode uses verified PostgreSQL TLS and restricted role; owner startup refused                                     |
| OpenAPI and Chrome                                                             | Spec/HTTP checks rerun and passed; earlier Phase 6 Chrome check rendered Swagger and executed readiness with HTTP 200 / `ready`     |
| Backup/recovery                                                                | All persisted rows and migration checksum compared; restored triggers checked; final recovered API check recorded below             |
| `pnpm audit --prod`                                                            | Passed, **0 advisories**                                                                                                            |
| Full `pnpm audit`                                                              | Passed, **0 advisories**, empty muted list; affected dependency removed                                                             |
| Git/links                                                                      | Passed: `git diff --check` and relative Markdown-link/path validation                                                               |

Tests cover registration/conflicts, password hashing, login/logout/expiry/disabled accounts, role
changes, unauthorized access and DB-level escalation, cross-user isolation, malformed/oversized
JSON, pagination and revision bounds, scenario validation, conflicting writes, immutable records,
self-review rejection, protected demos, forged publication, answer hiding/scoring, attempt history,
rate limiting with spoofed forwarded addresses, health/readiness and OpenAPI.

No browser redesign or renderer change occurred. Web and Studio production builds, original tests
and import boundaries passed. Fresh GPU/frame-time, mobile-device and cloud deployment checks were
not performed and are not claimed.

## Recovery evidence and limitations

The disposable runner creates a random container/database/port and generated owner/runtime secrets;
it never resets an existing developer database. After representative test writes it captures a
custom-format `pg_dump`, creates a different empty database and restores with `pg_restore
--exit-on-error --no-owner --no-privileges`. It compares every row of users, sessions, revisions,
reviews, releases, attempts and audit records, compares the applied migration checksum, and verifies
that restored immutability triggers reject writes. Runtime grants are reapplied explicitly before
starting the API on the restored database and checking login plus private learning totals.

Final PostgreSQL 17.11 recovery run: **passed**, including restored restricted-role access,
production-mode TLS startup, student login and preserved totals (2 attempts, 1 correct).

This demonstrates logical recovery with disposable data, not real-data RPO/RTO, replication,
point-in-time recovery or production failover. Operator-managed encrypted backups, retention and
key management remain deployment requirements. There is no automatic destructive rollback:
prefer forward fixes; otherwise stop writers, restore a pre-migration backup into a new database,
verify it and switch a compatible app version. Later writes may require reconciliation or be lost.

## Final security acceptance and phase status

The initial full audit reproduced **GHSA-vfj7-8cjw-p6xm / CVE-2026-93687**, the only remaining
advisory, in `braces@3.0.3`. Registry and upstream rechecks confirmed no patched stable braces
release; newer stable Next ESLint and fast-glob releases still retain the vulnerable dependency.
The current lint configuration has no untrusted-pattern path, but no risk exception was assumed.

The final remediation replaces only `@next/eslint-plugin-next@16.4.1`'s `fast-glob@3.3.1` with the
already-locked official `tinyglobby@0.2.17`. A minimal version-pinned pnpm patch sets
`expandDirectories: false` at the sole glob call to preserve literal-directory behavior. The
replacement uses existing `fdir@6.5.0` / `picomatch@4.0.7`; `braces`, `micromatch` and the original
fast-glob package are absent from the resolved lockfile. No framework/runtime version changed in
this final fix, no prerelease was added, and no advisory was suppressed.

Eight new regression tests verify the installed alias, default/explicit root discovery, glob and
array handling, actual Next navigation-rule diagnostics, and deeply nested advisory-shaped inputs.
They run in the standard test/check chain. Both final dependency audits report **zero advisories**.
The final database run again passed all **25** integration tests and the full migration/TLS/recovery
drill; Web, Studio and API production builds passed. All **219** prior tests remain passing,
with **227** total distinct passing tests including the new security checks.

The [dependency security decision](dependency-security.md) records authoritative sources, exact
versions, exposure analysis, compatibility boundaries, patch maintenance and removal conditions.
This is remediation, not owner risk acceptance. **Phase 6 is Completed** within its approved backend
foundation scope. There are no remaining Phase 6 acceptance blockers; this does not authorize a
public deployment or open a later phase.

Independent Ukrainian legal review and protected production publication remain separate existing
content gates, intentionally unsatisfied by test fixtures or review text. Email verification,
password recovery, MFA, multi-instance limiting, account privacy/retention operations and product
client screens are documented future requirements, not silently implemented Phase 7 scope.

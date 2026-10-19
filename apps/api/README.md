# Traffic Laws API — Phase 6 foundation + MVP publication increment

Independent NestJS modular monolith on port **3002**. Web (3000) and Studio (3001) are unchanged.
No educational scenario is approved for production. The three UA demonstrations remain `in_review`.
The Phase 7 Admin UI and first Web learning dashboard are in progress. Payments, mobile and
simulation are not implemented. See [`docs/AUDIT.md`](../../docs/AUDIT.md) for the current product slice.

## Start locally

Requires the repository's Node 24 / pnpm 10, Docker Desktop, and an available loopback port 5433. The recovery/TLS test runner also needs an OpenSSL CLI.
Run from the repository root. Commands below generate unique local credentials; keep them in a
local password manager. Replacing environment variables does **not** rotate an existing PostgreSQL
volume's password. Never remove that volume to fix a password on a database containing useful work.

```sh
pnpm install
export POSTGRES_PASSWORD="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
export RUNTIME_DATABASE_PASSWORD="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("hex"))')"
export MIGRATION_DATABASE_URL="postgresql://traffic_owner:${POSTGRES_PASSWORD}@127.0.0.1:5433/traffic_laws"
docker compose -f apps/api/compose.yaml up -d --wait
pnpm --filter @traffic-laws/api db:migrate
pnpm --filter @traffic-laws/api exec node scripts/runtime-role.mjs
```

Copy `apps/api/.env.example` to `apps/api/.env`; replace its runtime password placeholder with
`RUNTIME_DATABASE_PASSWORD`. Set file permissions to `600`. Keep the owner URL out of this file.
The file is ignored by Git. The default CORS allowlist admits `http://localhost:3000`; use exact
origins without trailing slashes. CORS never replaces bearer authentication.

```sh
pnpm dev:api
# In another terminal:
curl http://127.0.0.1:3002/api/v1/health/live
curl http://127.0.0.1:3002/api/v1/health/ready
```

Open [Swagger](http://127.0.0.1:3002/api/docs). The API fails startup if its database role can insert
publications. Use the restricted `traffic_runtime` role, not `traffic_owner`.
`pnpm build:api` builds deployable Node bundles; `pnpm --filter @traffic-laws/api start` runs them.
`pnpm --filter @traffic-laws/api openapi` writes `apps/api/dist/openapi.json` after a build, without
needing a database connection. Generated client/bundles are ignored by Git.

## Administrator bootstrap and development drafts

Bootstrap is an operator-only CLI, not an HTTP route. Use an owner connection in a trusted shell.
Choose a unique administrator email and a password of at least 15 characters. The password read
below is hidden and does not enter shell history. There are no default accounts or passwords.

```sh
pnpm build:api
export BOOTSTRAP_ADMIN_EMAIL='your-admin@example.org'
read -r -s BOOTSTRAP_ADMIN_PASSWORD
export BOOTSTRAP_ADMIN_PASSWORD
DATABASE_URL="$MIGRATION_DATABASE_URL" pnpm --filter @traffic-laws/api admin:bootstrap
unset BOOTSTRAP_ADMIN_PASSWORD
pnpm --filter @traffic-laws/api db:seed
```

Bootstrap serializes concurrent attempts, refuses an existing administrator, never promotes an
existing student email and writes an audit event. No HTTP role-management or password-reset API is
provided. Additional staff provisioning and administrator recovery require a trusted operator and
separately reviewed procedures; do not edit user roles through a browser client.

The development seed requires an existing administrator. It inserts only the three shared
`in_review` demonstrations, skips existing scenario IDs, refuses `NODE_ENV=production`, and never
creates approvals or publications. Runtime records are independent immutable authored snapshots;
editing the source examples does not overwrite saved revisions.

## Try authentication and scenario APIs

In Swagger, call `POST /api/v1/auth/register` with your test email and a long unique password.
Only `email` and `password` are accepted. Public registration always creates a student. Next call
`POST /api/v1/auth/login`, copy `accessToken` into **Authorize**, then call `GET /api/v1/users/me`.
Swagger does not persist authorization between reloads. Logout revokes that session immediately.
Avoid screenshots, logs and shared terminals containing the login response.

Login with the bootstrapped administrator to inspect:

- `GET /api/v1/internal/scenarios` — protected paginated revision metadata; optional `q` (ID substring) and `status` (`draft` or `in_review`) filters.
- `GET /api/v1/internal/scenarios/:id/revisions` — protected history for one scenario.
- `GET /api/v1/internal/scenarios/draft-ua-red-signal/revisions/1` — full protected draft.
- `POST /api/v1/internal/scenarios/revisions` — `{payload: <Scenario v1>, expectedRevision: 0}`
  creates an ID at revision 1. To update, submit a complete payload with revision N+1 and
  `expectedRevision: N`; the old record never changes. Concurrent/stale saves return 409.
- `POST /api/v1/internal/scenarios/:id/revisions/:revision/reviews` — a different active reviewer
  or administrator can append a recommendation, requested changes, or rejection with evidence.
  This authenticates the author of the recommendation; it does not prove their qualifications or
  the legal truth of its text.
- `POST /api/v1/internal/scenarios/:id/revisions/:revision/publish` — active admin only; validates
  the exact immutable revision for public use and requires a 10–500 character owner evidence note.
- `POST /api/v1/internal/scenarios/:id/revisions/:revision/unpublish` — active admin only; withdraws
  the exact revision and records the action.

`GET /api/v1/scenarios` returns an empty list on the real development seed. Fetching a demonstration
through a public question endpoint, or submitting a learning attempt against it, returns 404.
A JSON status, admin role or review recommendation cannot bypass that boundary.

To exercise successful learning progress without fabricating real approval, run
`pnpm test:api:integration`. Its isolated synthetic fixtures are never imported by application or
seed entrypoints. Tests submit both correct and incorrect answers, then check history and totals.
There is deliberately no production fixture/approval switch.

## Routes and contracts

All application routes use `/api/v1`. Additive fields may be added within v1; incompatible request,
response or authentication changes require a new version and migration guidance. Successful replies
are JSON objects; lists use `{items, page, limit, nextPage}`. `page` is 1–200 and `limit` is 1–50
(default 20); ordering is stable for a static dataset. Offset pages can shift when new rows arrive.
Scenario lists contain published **revisions**, not an implicit mutable "latest" alias. Pagination
advances by stored release slots, so hidden or invalid releases may produce short/empty pages.

| Method | Route after `/api/v1`                                   | Access / response                                              |
| ------ | ------------------------------------------------------- | -------------------------------------------------------------- |
| POST   | `/auth/register`                                        | Public; 201 safe student profile                               |
| POST   | `/auth/login`                                           | Public; 200 bearer token and absolute expiry                   |
| POST   | `/auth/logout`                                          | Authenticated; 200 `{revoked: true}`                           |
| GET    | `/users/me`                                             | Own safe profile; no credential/hash                           |
| GET    | `/scenarios`                                            | Public; paginated eligible revision metadata                   |
| GET    | `/scenarios/:id/revisions/:revision`                    | Public; question/options/scene only                            |
| GET    | `/internal/scenarios`                                   | Reviewer/admin; paginated revision metadata                    |
| GET    | `/internal/scenarios/:id/revisions`                     | Reviewer/admin; paginated immutable history                    |
| POST   | `/internal/scenarios/revisions`                         | Reviewer/admin; append validated revision                      |
| GET    | `/internal/scenarios/:id/revisions/:revision`           | Reviewer/admin; payload, hashes, reviews                       |
| POST   | `/internal/scenarios/:id/revisions/:revision/reviews`   | Independent reviewer/admin; append review                      |
| POST   | `/internal/scenarios/:id/revisions/:revision/publish`   | Admin; protected exact-revision owner publication              |
| POST   | `/internal/scenarios/:id/revisions/:revision/unpublish` | Admin; protected withdrawal with audit evidence                |
| GET    | `/internal/imports`                                     | Reviewer/admin; official source status and last 20 runs        |
| POST   | `/internal/imports/sync`                                | Admin; source recheck and immutable blocked-run audit          |
| POST   | `/internal/imports/publish`                             | Admin; disabled with 403 while reuse rights are unclear        |
| POST   | `/progress/attempts`                                    | Own attempt; `{scenarioId, revision, answerId}`; 201 feedback  |
| GET    | `/progress/attempts`                                    | Own paginated history                                          |
| GET    | `/progress`                                             | Own attempt count, correct count, distinct attempted revisions |
| GET    | `/health/live`                                          | Public; process health, no database query                      |
| GET    | `/health/ready`                                         | Public; queries required DB table; 503 if unavailable          |

A question response explicitly omits the correct answer, explanation, rule references and
`trafficDecision` claim. Feedback exposes the answer and explanation only after a valid attempt.
A user cannot supply `correct`, `userId`, role or a different user's progress selector. "Completed
revisions" means attempted at least once, not mastery or course completion. Attempts are append-only;
retries create separate attempts (no idempotency key in this foundation).

Errors have `{error: {status, message, requestId}}`. Status meanings: 400 invalid request/domain
validation, 401 absent/invalid/expired/revoked credentials, 403 forbidden, 404 absent/ineligible,
409 uniqueness/revision conflict, 413 excessive body, 429 rate limit, 503 unavailable dependency.
Unexpected failures return 500 with a generic message. No submitted values, SQL errors, stack
traces, credentials or connection strings are reflected. Request/response schemas and bearer
requirements are generated in OpenAPI; nested scene/traffic contracts remain owned and runtime
validated by the shared domain packages.

## Persistence and publication design

PostgreSQL tables:

- `User`: normalized unique email, salted password hash, student/reviewer/admin role, active/disabled
  state and timestamps. `Session`: SHA-256 token digest, user FK, expiry and revocation.
- `ScenarioRevision`: `(scenarioId, revision)` primary key, country, immutable validated JSON,
  immutable rule context snapshot, canonical SHA-256 hashes, author FK, creation timestamp.
  No mutable second answer/question copy exists. Indexed identity columns are constrained to agree
  with the payload. A new timestamp belongs to a new revision; revisions have no mutable `updatedAt`.
- `Review`: reviewer FK, exact revision FK, decision, evidence reference/text and timestamp.
  Database triggers reject students and disabled reviewers. An admin may record explicit owner
  approval of their own revision; the ordinary review endpoint still rejects author self-review.
- `Publication`: separate exact revision/review FKs and release timestamp. Runtime has **SELECT only**
  at the table level. It can execute only the owner publication/withdrawal security-definer
  functions, which re-check the active admin and append audit records. A release is an editorial
  decision and does not establish independent legal validity.
- `Attempt`: user and exact revision FKs, submitted answer, server result and completion timestamp.
  SQL additionally rejects nonexistent answer IDs, un-released revisions and incorrect scoring.
- `AuditEvent`: immutable actor, action, subject and timestamp for bootstrap, revisions and reviews.
- `ImportRun`: immutable source revision, rights state, counters and outcome for each official-bank
  check. Runtime may read and insert runs, but cannot update or delete them.
  It deliberately excludes passwords, tokens, emails and free-form request bodies.

Prisma supplies typed relational operations and migrations; versioned nested scenario/scene data
stays JSONB rather than duplicating the shared domain model in dozens of editable tables. SQL adds
checks/triggers and append-only protection not expressible in Prisma. FKs preserve historical
attempts. Rule snapshots pin the exact context used to validate a revision, even after a package
update. Domain validators are reused; traffic algorithms and Scene Definition are untouched.

Eligibility requires a release tied to an active admin, matching revision, intact hashes, a valid
domain payload and sourced rule context. `verified` remains reserved for separately verified rules;
owner publication may use sourced `unverified` research without relabelling it. The DB owner remains
a trusted operational principal outside application-role protection.

## Authentication and security decisions

Passwords use Node's asynchronous scrypt: N=131072, r=8, p=1, 16 random salt bytes and 64 derived
bytes. Comparison is constant time. Unknown-email login performs the same KDF; errors are generic.
Each login generates 32 random token bytes; only its SHA-256 digest is stored. Sessions expire
absolutely after 3600 seconds by default (configurable 60–86400) and are revocable. No JWT claims,
refresh tokens or rotation protocol are needed: expiration requires login again. Roles and account
status are read from the database on every authenticated request. Concurrent sessions are allowed.

Future browser clients should retain the token in memory, or use a separately designed same-origin
BFF with HttpOnly cookies and CSRF defenses. Do not store tokens in localStorage or URL parameters.
Mobile clients should use OS secure storage. This API authenticates only an explicit Authorization
header and sets no authentication cookies; ambient-cookie CSRF does not apply. HTTPS is required
at the production ingress. Email verification, forgotten-password recovery, MFA and account
management are not implemented; this is not an Internet launch authorization.

Strict DTO allowlists, shared domain validation, JSON body limit 1500 KB, Helmet, explicit CORS,
parameterized queries and safe exception filtering are enabled. Rate limits are 120 requests/minute
per IP, plus 10 auth requests/minute per IP and 10 auth requests/15 minutes per normalized email.
Both registration and login consume those budgets; successful logins do not bypass them. Liveness
and readiness bypass the general limiter. Limiters are in-memory and reset on restart: deploy a
single API instance with trusted edge limiting until shared limiting is separately implemented.
No forwarded IP headers are trusted. Behind a proxy this deliberately limits by proxy IP; configure
an exact trusted proxy topology and edge policy before exposing the service. Never set blanket trust.

The runtime role can insert only active students, cannot update users, and can update only a session’s revocation timestamp. It has no schema creation, DDL, direct publication write, revision update, review update,
attempt update or audit update rights. It receives only EXECUTE on the two audited publication
transition functions. The migration owner is separate. The API checks publication INSERT privilege
at startup and refuses an owner connection. Password/session retention and
privacy deletion workflows need approved requirements before public onboarding.

## Environment and operations

| Variable                         | Required/default                  | Meaning                                                    |
| -------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                   | Required                          | Runtime PostgreSQL connection with user/password/database  |
| `MIGRATION_DATABASE_URL`         | Operator commands                 | Owner connection for Prisma migrations/provisioning        |
| `NODE_ENV`                       | `development`                     | Only development/test/production accepted                  |
| `HOST`                           | `127.0.0.1`                       | 127.0.0.1, ::1 or 0.0.0.0                                  |
| `PORT`                           | `3002`                            | Integer 1–65535                                            |
| `CORS_ORIGINS`                   | Empty (no cross-origin allowance) | Comma-separated exact allowed origins; HTTPS in production |
| `SESSION_TTL_SECONDS`            | `3600`                            | 60–86400                                                   |
| `SWAGGER_ENABLED`                | True only in development          | Explicit true/false override                               |
| `POSTGRES_PASSWORD`              | Compose only                      | Generated local owner credential                           |
| `RUNTIME_DATABASE_PASSWORD`      | Provisioning only                 | Generated runtime credential, minimum 32 chars             |
| `BOOTSTRAP_ADMIN_EMAIL/PASSWORD` | Bootstrap only                    | Operator-provided initial credentials                      |

Production requires `sslmode=verify-full` on the database URL and an appropriately trusted CA.
It must run behind TLS, with restricted ingress, an external secret store, a single API instance or
shared edge limits, resource limits and a managed backup schedule. Those deployment controls were
not deployed here. Graceful shutdown closes the pool. Query timeout is 5 seconds; connection timeout
3 seconds; pool max 10. Structured request logs contain only generated request ID, method, HTTP
status and elapsed milliseconds. They exclude URLs, IPs, bodies, headers and user identities. Monitor
5xx/429 rates and readiness; error-detail tracing is intentionally absent from this initial logger.

## Migrations, checks and recovery

```sh
pnpm --filter @traffic-laws/api db:generate
pnpm --filter @traffic-laws/api db:migrate
pnpm --filter @traffic-laws/api db:status
pnpm test:api:integration
pnpm check
```

`db:migrate` uses `prisma migrate deploy`; do not use `db push` or edit applied migration files.
The first migration supports an empty PostgreSQL 17 database. For a later change, create a new
migration on a disposable local database, inspect SQL, test from empty and existing states, check
checksums/drift, and deploy with the owner credential before switching application versions.
SQL triggers/checks must be reviewed separately because Prisma does not model all their semantics.
A deployment artifact requires the generated client bundled into `dist`, Node 24 and the locked
production dependencies. It does not require a Next.js server. Back up before applying migrations.

The integration runner always creates a uniquely named ephemeral container with generated
credentials and a random loopback port. It ignores existing DATABASE_URL for its test database,
uses no host data volume, and removes only its own container in `finally`. It verifies migration
idempotence, Prisma schema drift, exact SQL checksum, real HTTP/DB behavior, development and production-mode TLS
startup, safe startup refusal, OpenAPI, seed idempotency and recovery. Ordinary `pnpm test` runs
unit/contract tests and explicitly skips DB tests; the separate integration command is required.

Exact demonstrated recovery: create fixture data; `pg_dump --format=custom --no-owner
--no-privileges`; create a **different empty database**; `pg_restore --exit-on-error --no-owner
--no-privileges`; compare every user, session, revision, review, publication, attempt and audit row,
compare migration checksum, assert restored immutability triggers still reject writes, reapply the restricted runtime grants,
then start the production-mode API on the restored database and verify login and learning totals.
The runner performs all of this without writing credentials or backup files into the repository.

For a manual local drill after making your own test data:

```sh
# Keep this dump private: it includes account and learning data.
umask 077
docker compose -f apps/api/compose.yaml exec -T postgres pg_dump -U traffic_owner -d traffic_laws --format=custom --no-owner --no-privileges > /tmp/traffic-laws-private.dump
# Use a NEW database name; createdb safely fails if it already exists.
docker compose -f apps/api/compose.yaml exec -T postgres createdb -U traffic_owner traffic_laws_restore
docker compose -f apps/api/compose.yaml exec -T postgres pg_restore -U traffic_owner -d traffic_laws_restore --exit-on-error --no-owner --no-privileges < /tmp/traffic-laws-private.dump
```

Inspect row counts, representative revision hashes, attempt history, `_prisma_migrations` and
triggers before considering a cutover. Dumps intentionally omit roles/grants. On the same local cluster, reapply the existing restricted role to the new database:

```sh
MIGRATION_DATABASE_URL="${MIGRATION_DATABASE_URL%/traffic_laws}/traffic_laws_restore" pnpm --filter @traffic-laws/api exec node scripts/runtime-role.mjs --grant-existing
```

On a new cluster, use the initial role-provisioning command with a new generated password instead.
Point a temporary API process at the restored database with runtime credentials and verify login
and own progress. Do not run the API as its owner. The automated
drill verifies data/schema restoration, not a production failover or point-in-time recovery.
Encrypt off-host backups, retain keys separately and measure restore time on real data before launch.
Dispose of the manual private dump under your data policy after the drill.

There is no destructive automatic down migration. Prefer a reviewed forward fix. For rollback,
stop writers, restore the pre-migration backup to a new database, verify it, restore least-privilege
roles, point a compatible previous app build at it and then resume traffic. Post-backup writes
require reconciliation and can be lost. Never claim a lossless rollback by merely reverting code.

## Security verification status

The final runtime dependency audit has no known advisories. Stable Prisma 7.10.1 and the scoped
Swagger `js-yaml` 5.4.1 override fix the initial findings. Vitest is 4.1.11 throughout the workspace,
with the existing stable Vite 7.3.7 retained for transforms. PostgreSQL is pinned to 17.11-alpine.
The full development audit still reports `braces` 3.0.3 through the existing ESLint/Next tooling,
with no published fixed release. See [the current audit](../../docs/AUDIT.md) and
[testing guide](../../docs/TESTING.md) for the
unresolved security gate; it has not been suppressed or represented as a passing full audit.

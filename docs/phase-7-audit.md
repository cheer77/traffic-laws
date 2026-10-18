# Phase 7 — Admin Dashboard audit

**Status: In progress.** Phase 5 and Phase 6 statuses are unchanged. Phase 8 has not started.

## Implemented

- `apps/admin` is an independent Ukrainian Next.js application on port 3003. Routes: `/login`, `/`, `/scenarios`, `/scenarios/new`, `/scenarios/:id/:revision`, `/account`, `/forbidden`.
- Login exchanges credentials with NestJS on the server. The revocable bearer stays in an HttpOnly, SameSite Strict cookie with a fixed path and API expiry; production cookies require HTTPS. Logout revokes the API session and clears the browser cookie. Protected pages check `/users/me` on every request. Students and disabled accounts are denied.
- Server actions require same-origin `Origin`/`Host`; no browser-side bearer, role claim, or direct database access. NestJS role checks and independent-review rules remain authoritative. A missing, revoked or expired session redirects to login. If API revocation fails during logout, Admin clears the local cookie and warns that remote revocation was not confirmed.
- Overview and list show actual staff-only revision metadata. The API filters by scenario ID substring and draft status before pagination; the UI preserves filters across pages. Detail shows the exact immutable payload, answer marked by the author, explanation, source status, review history, revision history, and technical decision diagnostics where available.
- Draft editor accepts Scenario v1 JSON, validates with the shared scenario package and current UA references, and appends using `expectedRevision`. Stale writes receive a conflict response. Review forms submit one of the API's three decisions with evidence. Self-review is hidden in UI and rejected by the API.
- Scene snapshots load the existing `@traffic-laws/scene-engine/react` renderer lazily. No Studio or geometry code is copied. The preview does not claim legal certainty.
- Admin validates scene data again at the preview boundary. Missing scenes show no canvas; malformed scenes show a safe error and do not enter the 3D renderer or decision evaluator.
- API gained `GET /internal/scenarios` and `GET /internal/scenarios/:id/revisions`, both staff-only, validated/paginated and in OpenAPI. Exact revision response now includes `authorId` for UI self-review handling. No schema migration or new infrastructure was needed.
- Publication remains unavailable and the NestJS publish endpoint still always returns 403. User management is limited to the current safe profile; no role editor exists.

## Acceptance verification

- `pnpm test` passes 210 unit/security tests across the workspace. Admin contributes eight tests for origin gating, cookie/session action handling and valid/missing/invalid scene data. `pnpm test:admin:integration` passes 25 real NestJS/PostgreSQL tests and eight Chrome/Playwright tests against production Admin over disposable local HTTPS, followed by the API recovery drill. The browser suite exercises both staff roles, student/disabled rejection, anonymous access, forged Origin, revocation, Secure/HttpOnly/Strict cookie attributes, list filters, valid WebGL preview, missing preview, draft validation, immutable revisions, stale writes, review recommendation and forbidden publication. API integration additionally covers absolute session expiry, role changes, self-review, pagination, concurrent expected-revision writes, immutable records and sensitive-data projections. Failed remote revocation is covered at the Admin action boundary.
- The eight Admin HTTP contracts, bearer requirements, query fields and absent publication success response are checked against generated NestJS OpenAPI on every integrated run. The API OpenAPI now documents staff query parameters and review fields. Hand-maintained TypeScript contracts remain proportionate to this small adapter; shared Scenario and Scene validators own the nested data. Generated client code would add a second source of nested types without improving these checks.
- The full workspace lint, typecheck, test and build pass. Web and Studio build successfully; the API boots under production TLS and development settings in the integration runner. The browser test uses isolated test credentials and a disposable database. No Studio implementation or legal engine was copied into Admin.
- `pnpm check` includes import, lint, test, typecheck, build and format gates. Both `pnpm audit` and `pnpm audit --prod` report no known vulnerabilities.

Phase 7 stays **In progress**: the roadmap's protected legal approval/publication path and broader backend-backed operational workflows are not delivered. Current UA references lack independent legal confirmation, so no scenario can be marked legally approved or published. No Phase 5/6 status or Phase 8 scope changes were made.

## Run locally

Follow [API bootstrap and seed](../apps/api/README.md), then run `pnpm dev:admin` and open `http://localhost:3003`. `API_INTERNAL_URL` selects the server-side NestJS origin (default `http://127.0.0.1:3002`). Use the administrator credentials established by the operator-only bootstrap. No default password or account is embedded in Admin.

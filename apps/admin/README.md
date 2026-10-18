# Admin Dashboard

Phase 7 staff application (`pnpm dev:admin`, port 3003). Set `API_INTERNAL_URL` to the server-side NestJS origin; it defaults to `http://127.0.0.1:3002`. Bootstrap an administrator as described in the [API guide](../api/README.md). No browser-side API credential is configured.

The Admin stores the revocable API bearer in an HttpOnly, SameSite Strict cookie, marked Secure in production. Production requires HTTPS. Every protected page checks the current profile; protected actions check the request origin, and NestJS enforces the final role, revision, review and publication rules. Logout deletes the local cookie even if remote revocation fails, and reports that failure. A reviewer recommendation does not publish content. Active administrators have an explicit, evidence-bearing publish/withdraw control for one immutable revision; runtime credentials still have no direct Publication table write permission.

`/imports` shows the official HSC MVS source and its immutable import journal. Reviewers can inspect
it; only administrators can recheck the source. Question and answer PDFs are not converted through
OCR, and bulk publication remains disabled until reuse rights are explicitly confirmed.

`pnpm test:admin:integration` from the repository root creates a disposable PostgreSQL 17 database, runs the real API integration suite, builds API and Admin, checks eight Admin OpenAPI contracts, then runs Chrome/Playwright against production Admin through a temporary local HTTPS proxy. It also runs the API recovery drill and removes test data and the container. The test requires Docker, Chrome, OpenSSL and a working local loopback interface. Do not point this test at a developer database.

Admin unit tests run under `pnpm --filter @traffic-laws/admin test`. The browser test uses only isolated test credentials and data. The small server-side API adapter remains hand typed and shared Scenario/Scene validators own nested data. `scripts/check-contract.mjs` compares required fields, authentication, query arguments and protected publication against generated NestJS OpenAPI on every integrated run.

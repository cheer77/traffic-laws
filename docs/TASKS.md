# Tasks

Only owner-approved tasks should be implemented. This list describes the nearest known work; it is
not blanket authorization to start every item.

## P0 — content integrity and security

### Verify the official question pilot

- Confirm each imported question/option against the source PDF and exact page.
- Independently confirm answer indices against the matching official answer table.
- Record edition/amendment applicability and permitted-use basis for text/images.
- Keep unresolved records unscored and all current 3D candidates marked `needs_review`.

Done when ten records have review evidence tied to immutable source hashes and no UI claims more than
that evidence supports.

### Review credentials

- Rotate the locally stored Gemini key if it is still valid or has been exposed elsewhere.
- Keep environment files ignored and verify no secret is tracked or logged.
- Do not treat possession of the key as evidence that the adapter or reconstruction is operational.

Done when the owner confirms credential disposition and repository secret checks remain clean.

### Connect Google Gemini Vision to `VisionAdapter`

**Implementation status:** local server-only adapter, structured-output validation, one-request
limit, cache and ticket-1 CLI are implemented. The adapter uses `generateContent` with
`gemini-3.8-flash`, matching the independently successful direct API method and model. Unsupported
nullable `type` arrays and the zero-temperature override were removed from the structured request;
the next single attempt passed parameter validation but received HTTP 503 `UNAVAILABLE`. No ticket
was recognized and no Scene Definition was produced.

- Read `GEMINI_API_KEY` only through a secure server-side/local tooling boundary; never expose it to
  client bundles, logs, fixtures or committed files.
- Analyze one real official 2D ticket through the existing `VisionAdapter` contract.
- Parse and validate the response as structured JSON; reject free-form or schema-invalid output.
- Pass the validated result into the existing reconstruction pipeline rather than duplicating it.
- Cache results by stable source/model/prompt identity to conserve API quota without hiding revisions.
- Assign `needs_review` whenever the model output is ambiguous, incomplete or conflicts with source
  evidence.

Done when one real ticket completes the secured adapter → validated JSON → reconstruction-pipeline
flow with deterministic cache coverage and conservative review status. Retry only after provider
availability is confirmed, using `--force` to bypass the cached failure. This does not make automatic
3D creation complete or the resulting scene verified.

### Preserve production authorization

- Keep UI Preview development-only and loopback-only.
- Add/retain regressions proving Preview cannot activate in production or on a non-loopback host.
- Ensure Admin/Web mutations still depend on server-side API authorization outside Preview.

Done when unit/security checks pass and an approved acceptance run verifies the real login flow.

## P1 — 2D/3D review workflow

### Establish scene parity review

- Use the project `scene-review` Skill for each candidate reconstruction.
- Compare roads, lane count/direction, controls, participants, poses and intended trajectories.
- Record missing assets and unresolved visual or normative facts.
- Reuse registry assets; add an asset only when a real gap is proven.

Done when each candidate has a review record and only accepted scenes expose a 3D presentation.

### Define governed 2D media

- Specify provenance, license/reuse status, hashes, dimensions, alt text and revision binding.
- Keep original material separate from authored adaptations.
- Add at least one owner-accepted 2D ticket and parity tests.

Done when Web/Admin/API contracts and storage ownership are explicit and tested.

## P2 — product completion

- Add protected Admin user listing before any approved role/status operations.
- Add privacy-preserving product analytics and truthful Admin reporting.
- Add an inactive subscriptions surface only after plan/provider scope is approved.
- Decide whether deployed Studio needs authentication or collaborative server storage.
- Add Web registration → school → answer → progress E2E and explicit mobile viewport acceptance.

Each item needs its own task, relevant API contract and acceptance criteria.

## Later

- Create a `ticket-to-scene` Skill to orchestrate ticket analysis, Studio asset search, supported asset
  creation, scene assembly and final `scene-review` validation. Do not create it until the underlying
  Gemini/reconstruction workflow and authorization boundaries are proven.
- Expand rules coverage in small sourced slices with positive and counterexample tests.
- Introduce production CI/CD, observability, release policy and measurable 3D budgets.
- Evaluate Mobile and additional countries only after explicit market approval.

# Architecture

## Repository

The repository is a pnpm Workspaces + Turborepo monorepo with four applications and shared packages.
Turborepo orchestrates tasks; it is not a runtime service.

| Area                     | Responsibility                                                | Status                           |
| ------------------------ | ------------------------------------------------------------- | -------------------------------- |
| `apps/web`               | Ukrainian Landing, auth and unified Online School             | Implemented, evolving            |
| `apps/studio`            | 3D Asset Library and Scene Studio/Composer                    | Implemented                      |
| `apps/admin`             | Authenticated staff content/import workflows                  | In progress                      |
| `apps/api`               | NestJS API and PostgreSQL persistence                         | Implemented foundation, evolving |
| `packages/assets-3d`     | Reusable procedural assets, resources and registry            | Implemented                      |
| `packages/scene-engine`  | Scene Definition v1, validation, presets and renderer         | Implemented                      |
| `packages/country-rules` | UA references, semantic situation model and bounded evaluator | Implemented foundation           |
| `packages/scenarios`     | Versioned educational content and scene bindings              | Implemented foundation           |
| `packages/ui-preview`    | Typed local fixtures and Preview gate                         | Implemented                      |

`apps/mobile`, `simulation-engine`, `educational-content` and a separate `scene-composer` package do
not exist. Composer remains inside Studio because there is no second editor consumer.

## Dependency direction

- Applications may consume public package exports; packages never import applications.
- Applications do not import one another's internals.
- `country-rules` has no rendering dependency.
- `scenarios` may consume `country-rules` and the data-only Scene Engine contract.
- Scene Engine root exports stay data-oriented; R3F rendering is under `/react`.
- `assets-3d` owns model geometry/resources. Studio and renderers reference stable registry IDs.
- API reuses shared validators and never reimplements legal algorithms.

`pnpm audit:imports` enforces the important import boundaries.

## Web

`apps/web` contains the public Landing, registration/login and the unified `/school` experience.
Production data flows through Next.js server code to the API. Bearer credentials are stored only in
HttpOnly, SameSite Strict cookies, Secure in production. Correct answers are withheld until the API
scores an authenticated attempt.

In local UI Preview, `/school` uses typed fixtures including the current PDF-imported pilot. Preview
does not imply publication or normative/3D verification.

## Studio, assets and scenes

Studio owns the authoring interface, Composer operations, view/debug state and temporary localStorage
workspace. Portable backups are validated Scene Definition JSON. Failed imports preserve the current
draft and report an error.

Scene Definition v1 uses metres, Euler XYZ radians, positive uniform scales, unique instance IDs and
stable asset IDs. It describes renderable state, not questions, correct answers, legal priority,
physics or payments. Unknown versions fail; migrations must be explicit.

The shared renderer interprets validated scenes without changing their semantics. Process-lifetime
resource caches and geometry budgets are documented in package-specific technical documentation.

## Rules and scenarios

`country-rules` stores Ukrainian normative research records and review metadata. Its deterministic
evaluator handles only documented narrow cases and refuses missing, contradictory or unsupported
conditions. `scenarios` stores question content, answers, explanations and optional validated scene
snapshots/bindings. Authored bindings distinguish observed, authored and unresolved evidence.

An educational answer, normative verification and visual scene fidelity are separate concerns.
See [`traffic-rules-engine-design.md`](traffic-rules-engine-design.md) and
[`phase-5-legal-review-checklist.md`](phase-5-legal-review-checklist.md).

## API and persistence

`apps/api` is a NestJS modular monolith on port 3002. PostgreSQL/Prisma store users, hashed revocable
sessions, immutable scenario revisions, rule snapshots, reviews, attempts, audit events, import runs
and publication relations. Updates append revisions with expected-revision concurrency.

Public registration creates students. Staff may create revisions and review recommendations. Active
administrators can publish or withdraw an exact immutable revision through audited database functions;
the restricted runtime role cannot write the publication table directly. Publication never changes
source verification metadata. Operational details are in [`apps/api/README.md`](../apps/api/README.md).

## Admin

Admin runs on port 3003. Server components/actions call API endpoints server-side. Every protected
render resolves the current API profile; API role guards remain authoritative. Mutations require a
same-origin request. Admin currently supports content listing/creation/revision workflows, review,
scene preview, publication/withdrawal and the official-source import view. Broader user, analytics,
subscription and platform-management areas remain open.

## Official PDF pipeline and vision

The local importer reads owner-supplied PDFs with PyMuPDF, extracts the supported question layout and
writes deterministic records/images. It does not call a network model. Automatic answer-table OCR is
not delivered; current answer evidence is explicitly marked as visual transcription.

The Web workspace contains a local server-only Gemini adapter for the existing `VisionAdapter`
boundary. It validates structured output, resolves registered assets through the existing
reconstruction pipeline and caches results outside Git. It is CLI tooling, is never imported by the
browser, and has not yet produced an accepted real-ticket reconstruction. Details and limitations are
in [`official-ticket-pipeline.md`](official-ticket-pipeline.md).

## UI Preview security boundary

Preview is enabled only when `NODE_ENV=development`, the host is loopback and it is not explicitly
disabled with `UI_PREVIEW=false`. Web/Admin keep normal cookie/API paths when the gate is closed.
Preview mutations are simulated and never write PostgreSQL or create publications. Production builds
must not accept Preview as an authorization path.

## Deployment and future boundaries

Studio remains static-export compatible. Web/Admin are Next.js applications and API deploys
independently with PostgreSQL. Production deployment, protected Studio access, Mobile, generalized
simulation, monetization and international rules require separately approved work.

# Product Roadmap

## Product vision

The product is a scalable educational platform for preparing for road-rules examinations on Web,
iOS, and Android. Its defining capability is interactive study of road situations through a reusable
3D engine rather than a collection of page-specific scenes.

The first and only active market is Ukraine, and the initial product language is Ukrainian. Spain,
Germany, and other countries are possible future markets. They will require separate legal review,
rulesets, localization, and examination content; none of that content is implemented today.

Status labels in this document have strict meanings:

- **Completed** — implemented and verified in the repository.
- **Planned** — architectural direction only; it must not be treated as existing functionality.
- **Future** — a product possibility without an approved implementation phase.

## Current Project Status

- **Phase 1 — Completed.** The audit and monorepo foundation are finished.
- The existing 3D Studio was moved intact to `apps/studio`.
- All 54 automated tests passed according to the Phase 1 audit.
- **Phase 2 — Completed.** Application boundaries and the minimal user-facing Web shell are in place.
- `apps/web` and `apps/studio` run and build independently; applications may not import each
  other's internal files.
- Backend, Admin, product learning features, and Mobile are not implemented.
- **Phase 3 — Architectural foundation completed.** `packages/assets-3d` is consumed by Studio and a development-only Web check. Asset expansion is ongoing; desktop browser smoke testing and before/after scene metrics are recorded in the audit.
- Evidence and limitations: [`phase-3-audit.md`](phase-3-audit.md).
- Detailed evidence is recorded in [`phase-1-audit.md`](phase-1-audit.md).

## Architecture strategy

The repository uses pnpm Workspaces and Turborepo. Applications should depend on focused shared
packages, while legal rules, educational content, simulation, rendering, and presentation remain
separate. A package is created only when its boundary and consumers are real.

### Implemented now

| Path                 | Status      | Responsibility                                   |
| -------------------- | ----------- | ------------------------------------------------ |
| `apps/web`           | Implemented | Minimal Ukrainian user-platform shell            |
| `apps/studio`        | Implemented | Existing 3D Asset Library and Scene Studio       |
| `tooling`            | Implemented | Shared TypeScript and ESLint configuration       |
| `scripts`            | Implemented | Repository validation utilities                  |
| `packages/assets-3d` | Implemented | Shared procedural models, resources and registry |

### Planned applications

| Path          | Status  | Intended responsibility                                             |
| ------------- | ------- | ------------------------------------------------------------------- |
| `apps/admin`  | Planned | Content, users, payments, countries, assets, access, and operations |
| `apps/api`    | Planned | NestJS backend and stable application APIs                          |
| `apps/mobile` | Future  | Expo / React Native applications for iOS and Android                |

### Shared packages: implemented and planned

| Path                           | Status      | Intended responsibility                                          |
| ------------------------------ | ----------- | ---------------------------------------------------------------- |
| `packages/assets-3d`           | Implemented | Optimized, versioned 3D models and asset metadata                |
| `packages/scene-engine`        | Planned     | Shared rendering primitives and runtime scene infrastructure     |
| `packages/scene-composer`      | Planned     | Deterministic assembly of scenes from validated configuration    |
| `packages/simulation-engine`   | Planned     | Vehicle movement, trajectories, timing, and collision prevention |
| `packages/country-rules`       | Planned     | Country-specific rulesets behind a common legal contract         |
| `packages/scenarios`           | Planned     | Educational situations, tickets, answers, and explanations       |
| `packages/educational-content` | Planned     | Lessons, images, 2D tickets, localization, and translations      |

These names describe target boundaries, not permission to create every package at once. Extraction
must follow a concrete use case, dependency review, and the currently approved phase.

## Delivery phases

### Phase 1 — Audit & Monorepo Foundation — Completed

**Goal:** preserve the existing Studio while establishing a safe and understandable monorepo base.

**Main tasks:** audit dependencies and architecture; move Studio to `apps/studio`; configure pnpm,
Turborepo, strict TypeScript, ESLint, Prettier, root commands, and foundational documentation.

**Result:** one working Studio application in a verified workspace, with existing source and visual
behavior preserved and no speculative applications added.

**Done criteria:** clean workspace structure; reproducible install; lint, typecheck, 54 tests, build,
and Studio startup pass; migration and limitations documented.

**Dependencies:** none. This is the foundation for every later phase.

### Phase 2 — Applications Separation — Completed

**Goal:** define clear application boundaries before product feature development begins.

**Main tasks:** approve responsibilities and dependency directions for future `web`, `admin`, and
`api`; define contracts with Studio; establish environment and configuration conventions; decide
which application is created first based on validated product needs.

**Result:** documented application architecture and an explicitly approved minimal `apps/web` shell,
without product features or duplicated Studio code. Web runs on port 3000 and Studio on port 3001.

**Done criteria:** ownership and dependency rules are documented; development/build commands remain
simple; Studio remains unchanged; an automated audit confirms that no application imports another
application's internals.

**Dependencies:** Phase 1 completion and an approved product boundary for each new application.

### Phase 3 — 3D Asset Library — Architectural foundation completed; expansion ongoing

**Architectural delivery:** 21 real registry entries, measured local bounds, shared resources, typed Studio adapters, searchable Studio index, isolated development-only Web consumer, and automated boundary/geometry checks. Desktop Chrome visual smoke tests and scene counters passed; see [evidence and measurement limits](phase-3-audit.md). This does not authorize Phase 4.

**Goal:** turn proven Studio assets into a governed, reusable catalog without degrading quality.

**Main tasks:** define asset metadata, categories, coordinates, scale, materials, licensing, previews,
versioning, geometry budgets, and validation; extract `packages/assets-3d` only when consumers exist;
keep Studio as the authoring and inspection environment.

**Result:** a searchable, validated asset library for vehicles, roads, signs, environments, and
characters, consumed through stable contracts.

**Done criteria:** assets have identifiers and metadata; visual regression and performance budgets
pass; no duplicate asset ownership; Studio can inspect every supported asset.

**Dependencies:** Phase 2 boundaries and the preserved Studio asset implementation.

### Phase 4 — Scene Engine & Scene Composer — Planned

**Goal:** render and assemble reusable road scenes from validated, versioned configuration.

**Main tasks:** separate rendering primitives into `scene-engine`; define a JSON schema and composer;
support deterministic placement, cameras, lighting profiles, roads, intersections, signs, and assets;
establish serialization, migrations, error reporting, and performance tests.

**Result:** the same scene definition can be rendered consistently by supported applications without
embedding educational or country-specific rules in the renderer.

**Done criteria:** schemas validate; reference scenes round-trip; rendering matches Studio baselines;
invalid configuration fails clearly; CPU/GPU budgets and browser tests pass.

**Dependencies:** Phase 3 asset contracts and Phase 2 application boundaries.

### Phase 5 — Scenarios & Country Rules Foundation — Planned

**Goal:** represent Ukrainian road rules and educational scenarios independently from presentation.

**Main tasks:** define country/ruleset identity, sources and effective dates; model questions, answers,
explanations, maneuvers, and scenario versions; connect scene configuration without coupling rules to
Three.js; validate Ukrainian material for legal use and traceability.

**Result:** deterministic, testable Ukrainian rules and scenarios that can drive both 2D and 3D
learning experiences while leaving room for future country adapters.

**Done criteria:** every rule has provenance; scenario schemas and validators pass; UI and 3D consume
the same maneuver truth; country-specific tests cover legal decisions; no foreign content is mixed in.

**Dependencies:** Phase 4 scene contracts and approved Ukrainian educational sources.

### Phase 6 — Backend Foundation — Planned

**Goal:** provide a secure NestJS backend for users, content, progress, access, and integrations.

**Main tasks:** create `apps/api`; define modules, API contracts, validation, authentication,
authorization, persistence strategy, migrations, observability, backups, privacy, and rate limits;
support versioned content and progress synchronization. Prisma is considered only after persistence
requirements are approved.

**Result:** a deployable API with clear domain boundaries and stable contracts for Web, Admin, and
future Mobile clients.

**Done criteria:** security review passes; migrations and rollback are tested; contracts are documented;
integration tests cover critical paths; logs exclude secrets and sensitive data; backup recovery is
demonstrated.

**Dependencies:** Phase 2 service boundaries and Phase 5 domain contracts. Backend capabilities are
delivered incrementally; Phase 7 may begin when its required authenticated contracts are stable,
without waiting for all server-side business logic to be implemented.

### Phase 7 — Admin Dashboard — Planned

**Goal:** provide controlled workflows for managing educational content and platform operations.

**Main tasks:** create `apps/admin`; define roles and permissions; build reviewed publishing workflows
for lessons, tickets, scenarios, assets, countries, SEO, and integrations; add user, subscription,
payment, analytics, monitoring, and audit-log views only as backend capabilities become available.

**Result:** authorized staff can manage versioned content safely, with preview, validation, approval,
and traceable changes.

**Done criteria:** least-privilege access works; drafts and publishing are distinct; destructive actions
are protected; audit events are recorded; Studio/Composer previews use production contracts.

**Dependencies:** Phases 4–6 and the authenticated API slices required by each Admin workflow. Admin
development proceeds incrementally with Phase 6 capabilities and must not invent a temporary
production backend or wait for unrelated backend business logic.

### Phase 8 — CI/CD, Testing & Architecture Quality — Planned

**Goal:** make delivery repeatable and enforce architectural and quality constraints automatically.

**Main tasks:** add CI pipelines, frozen installs, caching, unit/integration/end-to-end tests, browser
WebGL smoke tests, visual regression, security and dependency checks, deployment environments,
observability, release/version policy, architecture rules, and recovery procedures.

**Result:** every application and package can be verified and released predictably with measurable
quality, performance, and security gates.

**Done criteria:** protected checks cover all workspace projects; deployments are reproducible;
critical rollback and recovery are tested; 3D performance baselines are enforced; ownership and
architecture violations fail CI.

**Dependencies:** all earlier boundaries. Basic CI should be introduced incrementally before Phase 8;
this phase completes and hardens the platform-wide system.

## Future product scope

Everything in this section is **Planned** or **Future**, unless explicitly identified as part of the
existing Studio.

### 3D library

The existing Studio is the starting point for a governed library of cars, motorcycles, pedestrians,
buildings, nature, road signs, traffic lights, roads, intersections, railway crossings, and emergency
or special-purpose vehicles. Each asset will need stable identity, scale, orientation, materials,
license, preview, compatibility, and performance metadata.

### Scene Composer

The planned composer will build road situations automatically from validated JSON configuration and
ready-made components. Configuration will describe intent and placement; it will not contain ad hoc
rendering code. Schemas, version migrations, deterministic output, meaningful validation errors, and
preview parity are required before it becomes a content-production dependency.

### Learning experience

Planned learning features include Ukrainian road-rules theory, legally permitted examination
materials, 2D and 3D tickets, detailed explanations, progress tracking, practice modes, and mock exams.
Content provenance, effective dates, review, accessibility, and Ukrainian-language quality are release
requirements rather than later cleanup.

#### 2D and 3D Content Strategy

- Not every road-rules ticket needs a dedicated 3D scene.
- Simple questions use text, images, and 2D illustrations.
- Complex road situations use interactive 3D when spatial context materially improves learning.
- One 3D location can support dozens or hundreds of different scenario configurations.
- The Scene Composer assembles 3D scenes from reusable Asset Library components.
- Examination questions, images, explanations, and 3D configurations are stored separately.
- A ticket can support 2D, 3D, or both modes without duplicating its authoritative answer logic.
- Every answer and explanation must match verified Ukrainian road rules and permitted sources.
- Future country rulesets reuse the common 3D engine rather than requiring it to be rewritten.

For example, one four-way intersection can be reused across many tickets by changing the vehicles,
road signs, priorities, and directions of travel in its configuration. The location remains the same;
the educational situation and its verified answer change independently.

### Users

Planned account capabilities include registration, a personal dashboard, learning history, statistics,
cross-device progress, and recommendations. Personalization must be explainable, privacy-conscious,
and separable from the authoritative correctness of road-rule answers.

### Monetization

Possible monetization includes free access, Premium features, subscriptions, and courses. Pricing,
entitlements, refunds, payment providers, taxes, and regional availability require separate product,
legal, and security approval. No monetization implementation exists today.

### Admin

The planned Admin surface covers analytics, users, payments, subscriptions, educational content,
3D assets, countries, SEO, integrations, monitoring, access control, and audit logs. Each area depends
on explicit permissions and backend contracts; listing it here does not approve implementation.

### Mobile

Future iOS and Android applications are expected to use Expo / React Native, a shared backend, and
reusable domain logic where platform constraints allow it. Mobile rendering strategy, offline support,
store compliance, and device performance must be validated before `apps/mobile` is created.

### International expansion

Each country will have a separate ruleset, localization, legal provenance, effective dates, and
examination content while reusing the common 3D engine and neutral scenario primitives. Expansion to
Spain, Germany, or another country begins only after explicit market approval; the Ukrainian product
must not carry speculative foreign rules.

## Roadmap governance

- Only the explicitly approved current phase may be implemented.
- A phase starts only after its scope, owner, dependencies, and acceptance criteria are confirmed.
- Planned paths and features are not evidence of existing code.
- Architectural extraction requires a concrete consumer and tests, not roadmap wording alone.
- Any change to phase status must update this document and the relevant architecture documentation.
- Security, legal-content verification, accessibility, performance, and rollback are part of done.

See [`architecture.md`](architecture.md), [`folder-structure.md`](folder-structure.md), and
[`development-guide.md`](development-guide.md) for the current repository rather than the future-state
design.

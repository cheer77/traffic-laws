<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project instructions

## Purpose and current scope

- Build an internationally extensible road-rules education platform with interactive 3D scenes.
- Ukraine and the Ukrainian language are the only current market and content scope.
- Spain, Germany, and other countries are future possibilities, not implemented markets.
- Complete only the currently approved roadmap phase; never start a later phase implicitly.
- The current phase and planned architecture are defined in [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Current repository

- This is a pnpm Workspaces + Turborepo monorepo.
- `apps/web` is the minimal user-facing Next.js application; product features are not implemented yet.
- `apps/studio` is the existing Next.js 3D Asset Library and Scene Studio.
- `apps/api` is the independent NestJS/PostgreSQL backend foundation on port 3002; see `apps/api/README.md`.
- `packages/assets-3d` owns shared procedural models, resources, and the asset registry.
- `packages/scene-engine` owns validated versioned scene data, presets and independent rendering; Studio and a development-only Web check consume it.
- Scene Composer operations, storage and UI stay inside Studio; there is no separate `scene-composer` package. Create other packages only for proven reuse.
- `tooling` owns shared TypeScript and ESLint configuration.
- `scripts` contains repository-level validation utilities.
- Do not imply that planned apps or packages already exist.
- Architecture details: [`docs/architecture.md`](docs/architecture.md).
- Folder map: [`docs/folder-structure.md`](docs/folder-structure.md).
- Local workflow: [`docs/development-guide.md`](docs/development-guide.md).

## Technology baseline

- Node.js 24 LTS and pnpm 10.
- Next.js 16 App Router, React 19, strict TypeScript.
- Three.js, React Three Fiber, Drei, Zustand, Tailwind CSS.
- Vitest for the current automated test suite.
- Turborepo orchestrates root development and verification commands.
- NestJS 11, Prisma 7 and PostgreSQL 17 implement `apps/api`; use the pinned stable versions.
- Check installed versions and compatibility before changing dependencies.
- Do not use beta, canary, or experimental releases without explicit approval.

## Naming and layout

- Use clear English names; avoid unexplained abbreviations.
- Directories and non-component files use `kebab-case` unless an existing local convention differs.
- React components and component files use `PascalCase`.
- Hooks use `useCamelCase`; functions and variables use `camelCase`.
- Types, interfaces, enums, and classes use `PascalCase`.
- Constants shared as immutable configuration use `UPPER_SNAKE_CASE`.
- Tests stay next to the unit they verify and use `*.test.ts` or `*.test.tsx`.
- Keep application-specific code inside its app; shared packages require a real second consumer.

## TypeScript, React, and Next.js

- Keep TypeScript strict; do not bypass errors with `any`, unsafe casts, or ignored diagnostics.
- Prefer explicit domain types and discriminated unions over loosely shaped objects.
- Validate untrusted input at system boundaries.
- Keep React components focused; move reusable non-visual logic into typed functions or hooks.
- Avoid unnecessary effects, duplicated derived state, and broad client components.
- Follow App Router server/client boundaries and add `"use client"` only when required.
- Preserve static-export compatibility in Studio unless the approved phase changes that requirement.
- Read the installed Next.js documentation described in the generated block above before Next.js work.

## NestJS rules

- Phase 6 explicitly creates `apps/api`; keep it a modular monolith.
- Keep controllers thin, business logic in services/use cases, and infrastructure behind clear boundaries.
- Validate DTOs at API boundaries and expose intentional response contracts.
- Do not share database entities directly with UI or 3D packages.
- Do not introduce further backend infrastructure without an approved requirement.

## 3D and simulation rules

- Preserve the existing Studio appearance and behavior unless a task explicitly changes them.
- Do not rewrite models, cameras, lighting, controls, or environment as incidental cleanup.
- Keep business rules, scene rendering, simulation, and UI state separated.
- The scene engine must not contain country-specific legal decisions.
- A future country-rules module must not depend on Three.js or React.
- Reuse geometries, materials, textures, and instancing where appropriate.
- Dispose dynamically owned GPU resources; document intentionally process-lifetime caches.
- Avoid per-frame allocations and React state updates inside render loops.
- Keep CPU cost, GPU cost, draw calls, triangle counts, and memory use visible in design decisions.
- Preserve camera framing and controls when changing unrelated code.
- Verify model orientation, scale, coordinates, and asset ownership before reuse.
- External assets require clear licensing and a documented optimization path.

## Product and domain boundaries

- UI presents information; it must not become the source of truth for traffic rules.
- Road-rule logic must be deterministic, testable, and independent from rendering.
- Scene configuration describes a scene; rendering interprets it without silently changing semantics.
- Simulation owns movement and trajectories, not educational copy or payment state.
- Ukrainian content must be traceable to legally permitted, authoritative sources.
- Do not add content for other countries before that market is approved.
- Prefer simple boundaries now over speculative abstractions for future regions.

## Performance, quality, and security

- Measure before and after performance-sensitive 3D changes.
- Treat regressions in frame time, memory, geometry budgets, or interaction as defects.
- Never expose secrets, tokens, personal data, or private environment values to the client or logs.
- Do not commit `.env` files, generated builds, caches, or local editor files.
- Minimize new dependencies and review their maintenance, license, and install scripts.
- Avoid destructive migrations; provide a reversible path for material file or data moves.
- Keep accessibility, responsive behavior, and Ukrainian text quality intact.

## Required verification

- Add or update tests for changed behavior and regression-prone logic.
- Run the smallest relevant checks during iteration.
- Before handoff, run `pnpm check` unless the task is documentation-only.
- Documentation-only changes require `pnpm format:check` and link/path validation.
- For 3D changes, also verify scene tests, asset reports, and visual/browser behavior when available.
- Never claim browser, GPU, mobile, or production verification that was not actually performed.
- Update documentation when architecture, commands, boundaries, or operational assumptions change.

## Context Efficiency & Documentation

- Before starting a task, read this `AGENTS.md` and determine the current development phase.
- Load only documentation files and sections directly relevant to the task; do not read all project documentation by default.
- Use `docs/ROADMAP.md` to confirm the current phase, its boundaries, and dependencies, but do not reread the full roadmap for every small change.
- Do not scan the entire repository for a task scoped to one module; begin with the smallest necessary code area and expand only when evidence requires it.
- Keep handoff reports concise: state what changed, which checks ran, and which problems or limitations remain instead of repeating long architecture descriptions.
- Reuse existing components, types, and utilities; do not create duplicate functionality.
- For multi-step work, record durable decisions in the relevant documentation instead of relying only on chat history.
- Context efficiency never overrides required tests, validation, security checks, or build verification.

## Git workflow

- Check `git status` before editing and preserve unrelated user changes.
- Never replace the repository, delete Git history, or run destructive reset/checkout commands.
- Do not stage, commit, amend, rebase, push, or create branches unless explicitly requested.
- Keep changes scoped to the approved task and make file moves visible and reviewable.
- Do not delete untracked files unless their ownership and purpose are confirmed.
- Report checks run, checks skipped, and known limitations at handoff.

## Roadmap discipline

- Phase 1, Audit & Monorepo Foundation, is complete.
- Phase 2, Applications Separation, is complete.
- Phase 3 architectural foundation is complete; asset expansion is ongoing. Phase 4 is complete. Phase 5 has unverified official-source records, engine-linked study drafts and a bounded deterministic evaluator, but human legal review, broader maneuver truth and protected publication remain open; see `docs/phase-5-audit.md`. Phase 6 backend foundation is separately authorized; see `docs/phase-6-audit.md`. Admin, Mobile, simulation, and product learning UI remain Planned.
- Before implementation, confirm the active phase in [`docs/ROADMAP.md`](docs/ROADMAP.md).
- If a request crosses phase boundaries, document the conflict and ask for explicit direction.
- Do not turn roadmap examples into production code without an approved implementation task.

## Scene authoring boundaries

- Validate untrusted JSON with `@traffic-laws/scene-engine` before rendering or replacing a draft.
- JSON v1 uses meters, Euler XYZ radians and uniform positive scales; UI converts degrees explicitly.
- Use stable registry asset IDs and unique instance IDs. Keep questions, answers, physics and legal rules outside scene data.
- Preserve the urban preset and collection batching. Unknown schema versions require explicit migration, never silent coercion.
- Root engine exports stay data-only; heavy R3F exports live under `/react`. Never import Studio or editor dependencies into the engine or production Web.
- localStorage is a temporary per-browser workspace; portable backups use validated JSON. Preserve the current draft on failed loads and report storage errors.
- Run scene/asset parity tests and comparable browser measurements for renderer changes.

## Phase 5 content boundary

- `packages/country-rules` contains UA-only normative references and verification metadata, without rendering dependencies. An unverified record is not a verified legal claim.
- `packages/scenarios` owns versioned questions, answers, explanations and validated optional Scene Definition snapshots. The demo examples are drafts and must never enter a production content feed.
- A locally recorded review and `publishScenario` enforce structural publication gates, but do not authenticate editors or prove legal correctness. Only separately reviewed, sourced content can advance to publication.
- Official-text research records under `country-rules/ua-pdr-references` remain `unverified` until competent independent human review. The traffic-situation model describes authored facts and candidates; `country-rules/traffic-rules-engine` computes only the documented narrow cases and keeps technical completeness distinct from normative confirmation. Priority-dependent tickets cannot advance to local verified/published status; production publication additionally needs protected approval tied to immutable revisions.

## Phase 6 backend boundary

- API reuses shared domain validators; never change legal algorithms or promote unverified references to make persistence tests pass.
- Scenario revisions, rule snapshots, reviews, attempts and audit records are immutable. Updates append a revision with an expected previous revision.
- Runtime database credentials must be separate from migration-owner credentials and cannot write Publication. The publish HTTP endpoint is disabled for all roles.
- Review recommendations are authenticated evidence of an action, not proof of legal approval. Production publication remains a separately approved Backend/Admin workflow.
- Keep synthetic approved fixtures inside isolated tests; development seed imports only in_review demonstrations.
- Bearer sessions store token hashes, expire absolutely and revoke on logout. Do not log tokens, passwords, emails, request bodies or connection strings.
- Run `pnpm test:api:integration` for backend behavior/schema changes in addition to `pnpm check`; it owns a disposable Docker database and recovery drill. Never point destructive tests at a developer database.
- Do not start Phase 7 or change Phase 5 status as part of backend work.

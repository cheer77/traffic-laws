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
- `apps/studio` is the only implemented application: the existing Next.js 3D Asset Library and Scene Studio.
- `packages` currently contains no implemented shared package; create one only for proven reuse.
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
- NestJS is planned for `apps/api`; it is not installed or implemented yet.
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

## Future NestJS rules

- Apply these only after the roadmap phase explicitly creates `apps/api`.
- Keep controllers thin, business logic in services/use cases, and infrastructure behind clear boundaries.
- Validate DTOs at API boundaries and expose intentional response contracts.
- Do not share database entities directly with UI or 3D packages.
- Do not install NestJS, Prisma, or backend infrastructure before its approved phase.

## 3D and simulation rules

- Preserve the existing Studio appearance and behavior unless a task explicitly changes them.
- Do not rewrite models, cameras, lighting, controls, or environment as incidental cleanup.
- Keep business rules, scene rendering, simulation, and UI state separated.
- A future scene engine must not contain country-specific legal decisions.
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

## Git workflow

- Check `git status` before editing and preserve unrelated user changes.
- Never replace the repository, delete Git history, or run destructive reset/checkout commands.
- Do not stage, commit, amend, rebase, push, or create branches unless explicitly requested.
- Keep changes scoped to the approved task and make file moves visible and reviewable.
- Do not delete untracked files unless their ownership and purpose are confirmed.
- Report checks run, checks skipped, and known limitations at handoff.

## Roadmap discipline

- Phase 1, Audit & Monorepo Foundation, is complete.
- Phase 2 has not started.
- New applications, backend, shared engines, and product features remain Planned.
- Before implementation, confirm the active phase in [`docs/ROADMAP.md`](docs/ROADMAP.md).
- If a request crosses phase boundaries, document the conflict and ask for explicit direction.
- Do not turn roadmap examples into production code without an approved implementation task.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

## Product and stack

- Build a Ukrainian-language road-rules learning platform with reusable 2D/3D content.
- Current stack: Node.js 24, pnpm 10, Turborepo, Next.js 16, React 19, strict TypeScript,
  Three.js/R3F/Drei/Zustand/Tailwind, Vitest, NestJS 11, Prisma 7 and PostgreSQL 17.
- Ukraine is the only implemented market. Do not add foreign rules or a new roadmap phase implicitly.
- Confirm current status in `docs/ROADMAP.md`; use `docs/AUDIT.md` for the factual snapshot.

## Boundaries

- `apps/web`: Landing and Online School. `apps/studio`: separate 3D editor. `apps/admin`:
  staff workflows. `apps/api`: modular NestJS backend. All four already exist.
- Shared code needs a real second consumer. Applications never import one another's internals.
- `assets-3d` owns reusable assets; `scene-engine` owns validated scene data and rendering;
  Composer remains inside Studio; `country-rules` never depends on React or Three.js.
- Scene data does not own legal truth, answers, payments or UI state. Simulation owns motion,
  not educational copy or legal decisions.

## Code and content

- Keep TypeScript strict. Do not use `any`, unsafe casts or ignored diagnostics.
- Validate untrusted input at boundaries. Preserve App Router server/client separation.
- Preserve Studio appearance, cameras, lighting and controls unless the task explicitly changes them.
- Reuse geometries, materials and assets; avoid per-frame allocations; dispose owned GPU resources.
- Ukrainian claims require traceable permitted sources. `unverified` never means legally confirmed.
- Do not present an unreviewed 3D adaptation as an exact reconstruction of an official image.
- Validate imported Scene Definition JSON before storage or rendering; unknown versions need migration.
- Admin/Web access API server-side. Tokens remain HttpOnly, SameSite Strict and Secure in production.
- UI Preview is development + loopback only and must never bypass production authorization.
- Never expose secrets, credentials, personal data, source PDFs or sensitive request bodies.

## Workflow

Task → inspect relevant current code → short plan → implementation → focused tests → diff review →
owner manual acceptance → commit. Do not create branches, commit or push unless explicitly requested.
Do not run browser automation, Playwright or expensive visual tooling without permission. Do not
repeat a repository-wide audit for a small scoped task.

Check `git status` before editing and preserve unrelated changes. Read only relevant documentation.
Update architecture, commands or operational documentation when their assumptions change.

## Verification

- Add or update tests for changed behavior; run the smallest relevant checks while iterating.
- Before handoff run `pnpm check`, except documentation-only changes: run `pnpm format:check`,
  documentation link/path validation and `git diff --check`.
- API/schema changes also require `pnpm test:api:integration` against its disposable database.
- 3D changes require relevant scene/asset tests and measurable budget review. Browser/GPU claims
  require actual approved browser verification.
- Report checks run, skipped checks and known limitations accurately.

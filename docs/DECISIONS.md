# Technical Decisions

## Application and package boundaries

- Keep Web, Studio, Admin and API as separate applications.
- Keep Composer operations/UI inside Studio until a second editor consumer exists.
- Share 3D assets and rendering contracts, not application internals.
- Keep legal decisions independent of React, Three.js and scene rendering.

## Scene data

- Scene Definition v1 is validated, versioned data using metres, Euler XYZ radians and positive
  uniform scale.
- Unknown versions fail instead of being coerced. Future versions require explicit migration.
- Questions, answers, physics, legal priority and UI state stay outside scene data.
- Studio localStorage is a temporary per-browser workspace; validated JSON is the portable format.

## Content and publication

- Official extraction, answer evidence, legal interpretation, visual reconstruction and publication
  are separate gates.
- Immutable revisions use expected-revision concurrency.
- Publication targets one exact revision and is audited; it does not modify verification metadata.
- The API runtime role cannot directly write Publication; narrow database functions enforce transitions.

## Authentication and Preview

- Web/Admin keep bearer sessions in HttpOnly, SameSite Strict cookies, Secure in production.
- Protected pages resolve the API profile; API authorization remains authoritative.
- UI Preview is permitted only in development on loopback hosts. Preview writes are simulated and
  cannot become PostgreSQL publications.

## Official PDFs and vision

- Source PDFs remain local, ignored and unmodified.
- PyMuPDF is local developer tooling for the supported importer, not an application runtime dependency.
- Current answer evidence is explicit visual transcription, not automatic OCR.
- No Gemini integration exists. Future vision assistance needs a separately approved adapter,
  evaluation criteria, secret handling and mandatory human review.

## Performance and dependencies

- Reuse geometries, materials, textures and registry assets; avoid per-frame allocations/state updates.
- Measure before and after performance-sensitive 3D work and retain reproducible budget checks.
- Minimize dependencies and use pinned stable releases. Do not adopt beta/canary releases implicitly.
- The scoped Next ESLint globbing remediation and maintenance conditions remain documented in
  [`dependency-security.md`](dependency-security.md).

## Development workflow

Task → relevant code analysis → short plan → implementation → focused tests → diff review → owner
manual acceptance → commit. Codex does not create branches, commit, push or run expensive browser
automation unless explicitly requested.

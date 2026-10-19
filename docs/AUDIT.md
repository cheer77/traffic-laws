# Project Audit

**Snapshot:** 2026-10-19. This document records the current repository state, not future intent.

## Executive status

Traffic Laws is an active pnpm/Turborepo monorepo with four real applications. The architecture
foundation, shared 3D assets, Scene Engine/Composer and backend foundation exist. The Ukrainian Web
school and a meaningful Admin/API MVP slice exist. Content review, accurate 2D/3D reconstruction,
broader rules coverage and production hardening remain incomplete.

## Implemented

### Web

- Ukrainian Landing, registration/login and unified `/school` route.
- Server-side API integration with HttpOnly session cookie outside Preview.
- Local UI Preview with imported official-question pilot and authored examples.
- Shared Scene Engine rendering where a validated scene snapshot exists.

### Studio and 3D

- Separate Next.js Studio on port 3001.
- Searchable reusable asset registry and procedural assets.
- Scene Composer, object editing, JSON v1 import/export and local drafts/snapshots.
- Shared Scene Engine validation, urban preset and R3F renderer.

### Rules and scenarios

- UA-only source-reference records and review metadata.
- Versioned scenario validation and optional scene snapshots/bindings.
- Bounded deterministic evaluator for selected signal and priority cases.
- Explicit observed/authored/unresolved evidence and refusal of unsupported decisions.

### API and Admin

- NestJS/PostgreSQL auth with hashed revocable sessions and role guards.
- Immutable scenario revisions, rule snapshots, reviews, attempts and audit records.
- Audited exact-revision publication/withdrawal through restricted database functions.
- Admin listing, creation, editing, review, scene preview, publication and import surfaces.
- Official-source import module and run history.

### Official PDF pilot

- Local importer supports the current selected PDF structure.
- Ten Section 16.1 questions and embedded images are extracted with hashes/provenance.
- Source PDFs remain ignored local inputs.
- Current answer evidence is assistant visual transcription, not reliable OCR or legal review.

## In progress

- Phase 5: content/source review, wider maneuver truth and bounded evaluator expansion.
- Phase 7: Admin/product completeness, user operations, analytics and production acceptance.
- Asset-library expansion and governed 2D-media contract.
- Owner review and publication of a small trustworthy content set.

## Planned only

- Accurate automatic 3D generation from 2D.
- A successfully accepted Gemini Vision analysis and automatic reconstruction of a real ticket.
- General simulation/motion engine.
- Collaborative/protected Studio storage.
- Mobile, monetization and international markets.
- Complete PDR coverage and arbitrary official-PDF/OCR support.

## Verified boundaries and risks

- Landing and Online School belong to `apps/web`; Studio is a separate editor.
- Admin and API exist and must not be described as future applications.
- UI Preview has a code-level development/loopback gate and simulated mutations; production auth must
  continue to be tested whenever this boundary changes.
- 3D assets are shared and should be reused before new geometry is introduced.
- Scene snapshots do not prove legal facts or fidelity to an official illustration.
- Current imported 3D candidates are displayed as 2D and remain `needs_review`; there are no verified
  automatic reconstructions.
- A local server-only Gemini adapter, validated cache boundary and ticket-1 CLI now exist. The live
  pilot returned no accepted analysis, so this is infrastructure rather than a completed 2D-to-3D
  capability. The ignored credential value is not documented or tracked.
- Historical audit test counts are stale by nature and are no longer used as current acceptance proof.

## Documentation result

Documentation now has one source for each concern:

- `README.md`: setup and entry points.
- `PRD.md`: product requirements and truthfulness constraints.
- `ARCHITECTURE.md`: factual system and security boundaries.
- `ROADMAP.md`: phase status and direction.
- `TASKS.md`: nearest known work and done criteria.
- `DESIGN.md`: agreed UI/UX principles.
- `DECISIONS.md`: durable technical decisions.
- `TESTING.md`: verification matrix.
- `AUDIT.md`: current factual snapshot.

Detailed technical specifications remain beside their domain: official PDF pipeline, rules-engine
design/legal checklist, dependency security, Scene Engine and 3D asset/model documentation.

## Remaining inconsistencies or decisions

1. The official question/answer edition and reuse permissions still need owner review.
2. The local Gemini credential still needs normal owner lifecycle management; the adapter's presence
   is not evidence of a successful or accurate reconstruction.
3. Production deployment and protected Studio access are not documented as completed because no such
   verification exists.
4. Browser, GPU and mobile acceptance must be rerun for future relevant changes; historical reports
   were intentionally removed from the primary documentation set.
5. `apps/admin` and `apps/api` README files remain intentionally detailed operational references and
   should be updated with their code when those modules change.

# Product Roadmap

## Direction

Build a Ukrainian road-rules learning product that keeps legal truth, educational content, reusable
2D/3D presentation and application security separate. Future markets may reuse neutral infrastructure,
but no non-UA content is authorized.

## Status summary

| Phase                        | Status                                  | Current result                                                   |
| ---------------------------- | --------------------------------------- | ---------------------------------------------------------------- |
| 1. Monorepo foundation       | Completed                               | pnpm/Turborepo, strict tooling and repository boundaries         |
| 2. Application separation    | Completed                               | Web and Studio boundaries established                            |
| 3. 3D Asset Library          | Foundation completed; expansion ongoing | Shared registry and reusable procedural assets                   |
| 4. Scene Engine and Composer | Completed                               | Scene Definition v1, shared renderer and Studio authoring        |
| 5. UA scenarios and rules    | In progress                             | Bounded evaluator and sourced drafts; broader truth/review open  |
| 6. Backend foundation        | Completed                               | NestJS/PostgreSQL auth, revisions, attempts and audit controls   |
| 7. Admin and product MVP     | In progress                             | Admin workflows, publication, Web school and PDF pilot delivered |
| 8. Delivery hardening        | Planned                                 | CI/CD, broader E2E, observability and production readiness       |

## Delivered foundations

### Asset and scene platform

- Shared 3D asset registry with reusable resources and performance-oriented ownership.
- Scene Definition v1 validation and independent rendering.
- Studio Composer with editing, JSON import/export and local drafts/snapshots.
- One urban preset. Automated scene generation and simulation are not delivered.

### Rules and educational content

- UA-only normative reference records with explicit verification metadata.
- Versioned scenarios, scene snapshots and evidence-labelled bindings.
- Deterministic evaluator for a deliberately narrow set of signal/priority cases.
- Unverified references and authored scene facts remain visibly distinct from confirmed truth.

### Backend, Admin and Web

- Revocable session auth, immutable revisions, private attempts and audited publication controls.
- Admin creation/edit/review/preview/publication workflows and official import view.
- Ukrainian Landing and unified Online School.
- Local UI Preview with a production-safe gate.
- PDF extraction pilot for ten Section 16.1 questions; all current 3D candidates remain unverified.

## Current phase: product and content hardening

The active work remains within Phases 5 and 7. Priorities are:

1. Validate provenance, reuse rights, answer evidence and Ukrainian content quality.
2. Review 2D/3D parity before exposing any reconstructed scene as trustworthy.
3. Expand the bounded rules model only in sourced, tested slices.
4. Finish essential Admin/user/product workflows required by the owner-approved MVP.
5. Add production-oriented verification without weakening authorization or auditability.

Detailed next actions and done criteria are in [`TASKS.md`](TASKS.md).

## Future, not implemented

- Reliable OCR for arbitrary answer tables.
- Successful acceptance of vision-assisted scene understanding on real tickets; the local adapter
  foundation exists, but the first pilot produced no accepted analysis.
- Automatic accurate 2D-to-3D reconstruction and scene publication.
- General movement/trajectory simulation.
- Protected collaborative Studio storage.
- Complete PDR/rules coverage.
- User administration, analytics and production subscriptions.
- Mobile applications.
- Spain, Germany or other country markets.

## Governance

- A planned feature or path is not evidence of implementation.
- Do not start a new phase without explicit scope and acceptance criteria.
- Architecture extraction needs a proven second consumer.
- Legal review, source permissions, accessibility, security, performance and rollback are part of done.
- Update this roadmap, `ARCHITECTURE.md`, `TASKS.md` and `AUDIT.md` when factual status changes.

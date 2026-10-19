# MVP Phase 1 UI audit

**Status: completed (2026-10-18).** This product
phase is distinct from the completed technical **Phase 1 — Audit & Monorepo Foundation**.

## Scope delivered

The authenticated ticket route `/school/tickets/:id/:revision` is the reference surface for the
Traffic Laws design system. Desktop uses three columns: a scrollable published-ticket navigator,
the media/text learning canvas, and the question/answer panel. At tablet widths the ticket list
moves into an accessible modal sheet; at mobile widths media and question content stack without
page-level horizontal scrolling.

Only API-provided published revisions are listed. A text-only ticket gets an explicit text state;
a ticket with a validated Scene Definition snapshot lazy-loads the existing Scene Engine. The
repository still has no governed 2D-media contract, so the UI does not invent a 2D tab or asset.
The current API supports exactly one selected answer. Scoring, the correct answer, explanation and
rule references remain server-side until the existing attempt action succeeds.

## Design system

The Web application now contains a deliberately small shadcn-style component layer under
`apps/web/src/components/ui`: `Button`, `Card`, `Badge`, `Skeleton`, and a Radix Dialog-based
`Sheet`. It uses `class-variance-authority`, `clsx`, `tailwind-merge`, Radix Slot/Dialog and Lucide
icons. No full component catalog or shared monorepo UI package was introduced because Admin has not
yet adopted these components.

The semantic CSS tokens cover primary action, background, surface, subtle surface, border, primary
and secondary text, focus, success, warning and danger. The existing public landing palette remains
compatible, while the school uses clearer focus rings, accessible text-plus-icon feedback, restrained
shadows and consistent 10/16/24 px radii.

## States and responsive behavior

- Route loading uses a three-zone skeleton that collapses to a single column on smaller screens.
- The existing route error boundary and authentication redirects remain unchanged.
- The catalog retains its honest no-published-tickets state.
- The attempt form disables selection and submission while pending and after accepted feedback.
- Correct/incorrect results use icon, heading and copy in addition to color.
- When another published revision exists, successful feedback offers a next-ticket action.
- The mobile Sheet uses Radix focus management, Escape dismissal and an explicit close control.

## Verification

`pnpm check` passed, covering import boundaries, ESLint, the full non-database test suite,
TypeScript, Web/Admin/API/Studio builds and formatting. The Web production build also passed
independently. Both `pnpm audit --prod` and the full `pnpm audit` reported no known vulnerabilities.
Chrome visual acceptance used the development-only `/dev/school-ui` harness: the
desktop three-column workspace rendered correctly, 768 × 900 and 390 × 844 switched to the mobile
Sheet, and both responsive viewports reported `scrollWidth === clientWidth`. The harness returns
404 in production and never calls the API or publishes its illustrative content.

## Known limits

- No 2D contract or licensed 2D ticket exists; only text and validated 3D snapshots are supported.
- The API contract is single-answer, so multi-select UI is intentionally not simulated.
- The list endpoint is bounded to 50 published revisions; API-backed catalog pagination/search is a
  later ticket-catalog enhancement.
- The design tokens are documented and suitable for Landing/Admin, but this phase does not redesign
  those applications or Studio.

## Owner-approved Online School visual refresh (2026-10-18)

The ticket workspace now uses one ticket sidebar beneath a horizontal school header. The layout,
spacing, type, cards, colors and response panel follow the supplied owner reference. The existing
Scene Engine snapshot renders in the central card with mouse orbit and zoom controls. The 2D tab
is hidden because these tickets have no matching 2D material. Search and session-local completion
filters work in UI Preview; answer selection, scoring feedback and adjacent-ticket navigation were
checked in Chrome. The current authored demos remain three review-pending draft tickets, so their
legal text, low-poly scene assets and available media cannot match the reference image's 184 tickets,
photorealistic render, camera thumbnails or video.

# Unified online school

The owner's restoration brief explicitly authorizes this bounded frontend-only simulation prototype.
The owner subsequently approved this trainer as the sole school UI at `/school`, including a shared
2D/3D workspace. The local prototype now uses ten questions from the supplied official Section 16.1
PDF through the [local import pipeline](official-ticket-pipeline.md). The five authored 3D drafts
are retained in source but are not exposed as verified reconstructions. This does not authorize
public redistribution of the source illustrations, backend work, or changes to Studio/Admin.

## Run

```sh
pnpm --filter @traffic-laws/web dev --hostname 127.0.0.1
```

Open <http://localhost:3000/school>. Only Web is needed in UI Preview: no API, database, account, or
password. Preview requires development, a loopback Host and `UI_PREVIEW` not set to `false`. Both the
layout and page resolve the existing student-access gate. Outside Preview, normal cookie/API
authentication is required; authenticated users see a content-not-ready message rather than the
unverified local examples. No demonstration records enter a production content feed. The former
`/dev/trainer`, `/dev/school-ui`, `/school/tickets` and ticket-detail pages are removed, not aliases.
Scenario switching occurs entirely inside `/school`.

## Current content gate

`TRAINING_SCENARIOS` is now built from the validated `official-tickets/imported.json` projection.
All ten records are `needs_review`; the school shows original 2D and no active 3D toggle.
The disconnected vision adapter cannot promote a scene, and missing answer evidence disables scoring.
The retained `AUTHORED_TRAINING_DRAFTS` and their motion tests document previous authored work;
they are not automatic output or proof of visual parity. The rendering descriptions below describe
those retained drafts, not an available verified 3D feature in the current school pilot.

## Retained authored scope

The first ten questions of Section 16.1 retain the Ukrainian wording, answer options and answer-table
indices from the supplied PDFs. Every ticket shows the original embedded JPEG extracted without
recompression. Questions 1, 4, 5, 6 and 8 additionally have separate validated Scene Definitions and
Web reconstruction layouts measured from their corresponding 2D references. Playback is unlocked
after checking an answer so the authored movement does not reveal the answer beforehand.

Each 3D ticket defines its own road widths, markings, stop lines, signal set, vehicle placement and
reference camera. Camera modes include the reference view, near-vertical top view, elevated
vehicle-follow view and orbit. Zoom and reset remain available. The vehicle-follow camera is a chase
view, not an interior driving simulation.

The existing Web Button, colors and typography are reused. No design-reference image accompanied the
brief, so exact visual-reference parity remains unassessed. Responsive CSS places the question below
the scene at intermediate widths and stacks all panels on narrow screens.

## Shared 2D / 3D workspace

The 2D mode displays the original illustration embedded in the supplied official PDF. It is the visual
reference and is never presented as an image authored by this project. The 3D mode is explicitly
labelled as a learning reconstruction, not an official illustration. Tickets without an authored scene
do not show a 3D switch. Switching views retains the selected answer, selected vehicle and playback
settings; camera controls appear only in 3D.

Removed UI: the old school dashboard/list/detail screens, two dev preview pages, `AttemptForm`,
`TicketNavigation`, and `TicketMedia`. Their import consumers were checked before removal. The
Web preview adapter now supplies identity only; duplicate mocked ticket/progress endpoints were
removed. Shared preview fixtures remain untouched because Admin uses them. Generic scene viewers,
API/authentication actions, domain types and ticket-position logic/tests are retained. Landing
learning links now all target `/school`. Historical UI audit documents describe the earlier delivery.

## Boundaries and motion

Implementation is app-local under `apps/web/src/features/trainer`. Models and light housings come from
`assets-3d`; validation, scene traversal and lighting come from `scene-engine`. The Web renderer
interprets the intersection object with a ticket-specific procedural road layout so the five scenes do
not fall back to the shared urban intersection appearance. Shared packages and the Studio preset are
not modified. Vehicle orientation is local +Z forward; world +Z is south.

The pure motion sampler uses absolute scenario time, smoothstep acceleration/deceleration and analytic
straight/quarter-circle/straight paths. Circle joins preserve position and tangent. Cars approach the
stop line during the first three seconds, stop with their front bumper behind it, then follow authored
release times. Conflicting paths have separate intervals; opposing straight paths run concurrently.
Every car ends at 30 metres from the center, clear of the junction and still on the road. This is a deterministic animation
plan, not universal physics or a general traffic simulation. Long background frame gaps are clamped
so returning to the tab does not jump cars across the intersection.

For tickets 5 and 6, movement starts from the position shown in the reference, stops at the internal
stop line, waits for the target signal and then continues. Ticket 8 releases the red vehicle before the
blue vehicle and changes the signal phase. These are deterministic authored demonstrations of the
official answer, not a general traffic simulation or an independent legal evaluator.

## Rendering and verification limits

Canvas renders on demand while idle and continuously while playing or moving the camera. Playback
poses update Three objects directly, without per-frame React state updates. Shared assets retain their
existing process-lifetime caches and collection batching. App-owned route geometries, label textures
and OrbitControls are disposed on unmount. One 1024px shadow map and DPR capped at 1.5 bound rendering
cost; automatic GPU-based quality adaptation is not implemented.

Unit tests sample all authored schedules at 100 Hz using conservative oriented vehicle footprints,
check speed continuity, stop-line entry signals, stop dwell, exit positions, turn tangency, lane
placement, supported rule relations, answer checking and playback timing. Sampling is a regression
check for these fixed plans, not a continuous collision proof or a general collision-avoidance system.

Per the owner's tool restrictions, browser automation, screenshots, GPU/FPS measurements and actual
mobile interaction checks are not performed. Visual appearance, camera feel, touch behavior and real
rendering performance require the owner's manual review at the local URL.

### Initial trainer verification (2026-10-19, before route consolidation)

- `pnpm check` passed (including shared asset measurements/boundaries, Scene Engine tests and all
  application builds; unchanged Turbo tasks reused cache).
- After the final exit-position and chase-camera zoom adjustments, Web tests (16, including 13 new
  trainer tests), ESLint, TypeScript and production build passed again. The full monorepo check was
  not repeated.
- HTTP checks: development `/dev/trainer` returned 200; a temporary production server returned 404
  for the same route. The temporary production server was stopped; the existing development server
  remains on port 3000.
- Formatting and `git diff --check` passed. Backend integration tests were not run: backend behavior
  and schema were unchanged.

### Unified school verification (2026-10-19)

- `pnpm check` passed after resolving a Next Link lint diagnostic; unchanged tasks used Turbo cache.
  Web has 25 passing tests, including six SVG/trajectory parity tests and three Preview gate tests.
  The final Web production build also passed after retaining the footer registration link.
- Terminal HTTP checks: `/school` returned 200 locally with the trainer; the former trainer, UI preview,
  ticket list and ticket detail URLs all returned 404. A non-loopback Host returned 307 to login.
- A production server with `UI_PREVIEW=true` returned 307 to `/login?next=/school`, without trainer
  content. The removed trainer path returned 404. The temporary production server was stopped.
- Formatting and diff whitespace checks passed. No browser automation, actual GPU/touch validation,
  or backend integration tests were performed. Authenticated production-content acceptance awaits
  a separately approved reviewed-content integration; this change intentionally does not publish drafts.

### Official-reference reconstruction verification (2026-10-19)

- `pnpm check` passed after replacing the shared visible intersection with five ticket-specific Web
  layouts. Web has 14 passing tests, including exact answer indices, source-image SHA-256 checks,
  Scene Definition validation, expected per-ticket object sets and distinct reference cameras.
- The production build retains `/school` as the only school route. The three `/dev/*` routes are
  documented technical consumers of shared packages, return `notFound()` outside development and
  were not reclassified as school interfaces.
- Browser automation, screenshots and GPU inspection were not performed by instruction. Camera
  framing and visual similarity still require manual review at the local URL.

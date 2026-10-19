# Unified online school

The owner's restoration brief explicitly authorizes this bounded frontend-only simulation prototype.
The owner subsequently approved this trainer as the sole school UI at `/school`, including a shared
2D/3D workspace. This does not authorize production publication of the five unverified examples,
backend work, or changes to Studio/Admin.

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

## Delivered scope

Five Ukrainian authored examples share one four-way intersection: right-hand priority, main versus
secondary road, left turn against oncoming traffic on main green, green/red signals, and simultaneous
opposite straight-through traffic followed by a third car in the next signal phase. Search, selection,
ordered answers, choice answers, scoring, explanations, replay and session-only completion are local.
Playback is unlocked after checking an answer so the solution is not revealed beforehand.

Camera modes: isometric, near-vertical top view, elevated vehicle-follow view and orbit. Zoom and reset
are available. Touch orbit/zoom uses OrbitControls; HTML car buttons provide keyboard and touch selection
alongside 3D picking. The vehicle-follow camera is a chase view, not an interior driving simulation.

The existing Web Button, colors and typography are reused. No design-reference image accompanied the
brief, so exact visual-reference parity remains unassessed. Responsive CSS places the question below
the scene at intermediate widths and stacks all panels on narrow screens.

## Shared 2D / 3D workspace

The 2D mode is an interactive SVG drawing, not a screenshot or an official exam image. It uses the
same scenario objects, `sampleMotion`, `routePose`, `signalAt` and mutable playback clock as 3D.
Road/stop-line/crosswalk dimensions use the existing road constants. SVG maps world x/z to x/y and
negates the Three yaw angle. Both modes support car selection, playback, pause, replay and speed.
Only the mounted renderer advances time, and each cleans up its frame callbacks when unmounted.
Switching views retains the answer, selection, speed and elapsed time. Camera controls are shown
only in 3D; camera mode/zoom settings survive switching views. Manual orbit position is not persisted.

Removed UI: the old school dashboard/list/detail screens, two dev preview pages, `AttemptForm`,
`TicketNavigation`, and `TicketMedia`. Their import consumers were checked before removal. The
Web preview adapter now supplies identity only; duplicate mocked ticket/progress endpoints were
removed. Shared preview fixtures remain untouched because Admin uses them. Generic scene viewers,
API/authentication actions, domain types and ticket-position logic/tests are retained. Landing
learning links now all target `/school`. Historical UI audit documents describe the earlier delivery.

## Boundaries and motion

Implementation is app-local under `apps/web/src/features/trainer`. Models, road markings, trees,
signs and light housings come from `assets-3d`; lighting comes from `scene-engine/react`. Shared
packages and the Studio preset are not modified. Vehicle orientation is local +Z forward; world +Z
is south. Lane centers and stop positions use the existing road geometry constants.

The pure motion sampler uses absolute scenario time, smoothstep acceleration/deceleration and analytic
straight/quarter-circle/straight paths. Circle joins preserve position and tangent. Cars approach the
stop line during the first three seconds, stop with their front bumper behind it, then follow authored
release times. Conflicting paths have separate intervals; opposing straight paths run concurrently.
Every car ends at 30 metres from the center, clear of the junction and still on the road. This is a deterministic animation
plan, not universal physics or a general traffic simulation. Long background frame gaps are clamped
so returning to the tab does not jump cars across the intersection.

The signal-change examples have a yellow interval, all-red clearance and a subsequent perpendicular
green. A left-turn example holds main green for both opposing directions throughout.

`TrafficSituation` and `analyzeTrafficSituation` are reused to validate the initial authored conditions
and test the supported yield relations. They are not replaced by a new legal engine. Initial red
admission changes later only according to the authored signal schedule. All normative source records
remain **unverified**; in particular the shared engine reports the simultaneous candidate as unknown
because independent legal review is missing. Geometric separation is tested independently and is not
presented as legal verification. The official site could not be retrieved during this implementation;
links point to the existing official-reference records. Human content review remains outstanding.

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

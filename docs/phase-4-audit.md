# Phase 4 — Scene Engine & Scene Composer

## Scope and authorization

Phase 4 was explicitly authorized by the attached implementation task on 2026-10-17. At task
start the roadmap and AGENTS.md still marked it Planned; this authorization supersedes that
restriction for Phase 4 only. Phase 5, backend, Admin, Mobile, rules, questions, physics and
movement simulation remain unimplemented and unapproved.

## Architecture

- `packages/assets-3d` continues to own all 21 models and GPU resources. No asset geometry,
  material, texture, model orientation, or environment batching was modified.
- New `packages/scene-engine` has two public entry points. The root contains data, types,
  strict runtime validation, JSON serialization and preset factories without React/Three imports.
  `/react` contains `SceneRenderer`, `SceneInstance`, `SceneModel`, and `SceneEnvironment`.
- Studio owns the composer in `src/lib/composer`, `src/stores/useComposerStore.ts`, and
  `src/components/composer`. Pure immutable operations are separate from UI and storage.
  A separate `scene-composer` package is intentionally deferred: it has only one current consumer.
- Existing `useStudioStore` still owns camera, layer diagnostics, asset Preview and metrics.
  Composer state owns the document, saved snapshots, mode and transform tool. UI state is absent
  from exported scene JSON. Existing legacy asset adapters remain for isolated model Preview
  and regression comparison; the editable city renders exclusively through `scene-engine`.
- Web's development-only `/dev/scene-engine` is a real independent engine consumer. Its gated
  dynamic import excludes the scene renderer from production, where the route returns 404.
  No Drei, Zustand, transform controls or Studio dependency was added to Web.
- Installed Next.js lazy-loading and static-export guides were read. Studio keeps static export.
  No third-party dependency versions changed; only workspace links and existing peer/test tooling
  were added for the new package. Runtime validation is implemented without an extra dependency.

## Scene JSON and migrations

A version 1 document contains `schemaVersion`, `id`, `name`, `country: "UA"`,
`environment: { preset: "urban" }`, and `objects`. Every instance has a unique `instanceId`,
registered `assetId`, explicit `transform: { position, rotation, scale }`, and `properties`.
Positions are meters, rotations are radians in Euler XYZ order, +Y is up and +Z is vehicle forward.
The Inspector displays degrees but serializes radians. Display rounding does not rewrite data
unless the user changes a field.

Only `headlights: boolean` on vehicles and `signal: "red" | "yellow" | "green" | "off"` on
traffic lights are allowed static properties. Defaults when omitted are headlights on and red.
Unknown keys are errors rather than silently discarded future semantics. Geometry, UI selection,
camera, animation previews, layer visibility, and debug overrides are not serialized.
`SceneEnvironment` supplies the urban day profile; full-scene Preview uses canonical lighting and
static properties, while editor light controls remain temporary diagnostics.

The validator reconstructs data and checks IDs, assets, country, preset, version, tuple lengths,
finite values and limits. Limits are 200 objects, 1 MB UTF-8 import, coordinates ±100 m, rotations
±2π, and uniform positive scale 0.5–2. Road, vegetation and furniture collections have fixed scale 1.
Collections remain complete batches; adding another collection duplicates the whole set.
These limits bound input, not a promise of a fixed GPU budget for arbitrary scenes.

`parseSceneJSON` validates before any state replacement. A failed import or edit preserves the
last valid scene. `serializeScene` validates and emits canonical key order. Version 1 round-trips
without losing placements or static properties. There is no historical schema to migrate yet:
unknown versions explicitly fail. Future versions must add a version dispatcher and a tested
old-to-new migration before changing accepted input; never reinterpret old fields silently.

## Presets and extension

`src/urban-intersection.json` preserves the existing city's 26 placements using the registry's
stable IDs. `SCENE_PRESETS` currently contains only `urban-intersection`. No T-junction,
roundabout, railway crossing or country road is advertised as implemented.

To add a type of scene:

1. Implement and register missing geometry in `assets-3d`, with measurements, resource ownership,
   licensing and optimization checks. Reuse existing geometry whenever it already fits.
2. Add a version 1 JSON definition in `scene-engine/src`; choose registered asset IDs and explicit
   world transforms. Add it to `SCENE_PRESETS` and `createScene`. If a genuinely different
   environment profile is needed, extend the environment union, validator and renderer together.
3. Test validation, isolated factory results, JSON round-trip, render placements and budgets.
4. The Studio preset list reads `SCENE_PRESETS`; the editor's object tools do not need rewriting.
   Verify the new preset in Web's dev consumer and Studio at matching quality/camera settings.

To author another situation with current assets: create a scene from the urban preset, keep or
remove its instances, add vehicles/signs/lights from the library, edit transforms and static signals,
then save or export JSON. Geometry is referenced, never embedded in the file.

Future educational questions should reference an immutable scene ID/revision or a validated scene
snapshot from a separate scenarios module. Answers, explanations, rule provenance, legal decisions
and movement trajectories must stay outside this definition and renderer. This phase adds none
of those future systems.

## Editor and storage

Run `pnpm dev:studio` and open http://localhost:3001.

- **Сцени** lists local saved scenes and creates a fresh urban scene with a new ID.
- **Редактор** selects by click or instance dropdown. **Переміщення** and **Поворот** enable the
  Drei gizmo; numeric Inspector fields edit position/rotation, uniform scale, headlights and signal.
  Duplicate adds a unique ID with a +3 m X offset (bounded at +100 m). Delete removes an instance.
  Reset transform sets origin/zero rotation/unit scale; restore preset resets the entire layout.
  **Фокус на об’єкті** uses actual rendered bounds. OrbitControls is disabled during a drag;
  transforms are committed to Zustand on release, not each frame.
- **Бібліотека 3D** retains searchable isolated Preview. Model names open Preview and **+ Додати**
  inserts an instance and returns to the editor. **Повернутися до сцени** restores the document
  and editor selection. Mode navigation stays visible when the panel scrolls.
- **Перегляд** renders all configured objects and their saved properties without selection rings,
  gizmos, layer hiding, animation tests or debug helpers. Camera controls remain available.

**Зберегти сцену** stores a named snapshot (same ID updates it); **Export JSON** downloads a portable
copy. **Import JSON** checks file size, JSON and schema before requesting replacement of unsaved
work. New scene, restore preset and opening a saved scene also warn before replacing unsaved edits.
Safe mode changes preserve the same in-memory document.

A versioned `traffic-laws.scene-composer.v1` localStorage record stores the working draft and up to
20 snapshots. Hydration happens only after mounting. Subsequent committed edits and saves write
synchronously, including the latest gesture on release. Storage corruption or denied/quota errors
show a message, preserve the working state and disable automatic overwrites; JSON remains usable.
If storage is unavailable, leaving/reloading warns. Saved scene removal never removes the working
draft. This is temporary, browser/origin-specific storage, with no publishing, cross-device sync,
concurrent-tab conflict resolution or collaboration. Keep exported backups.

## Validation and performance constraints

Vehicle world AABBs use actual registry bounds and full position/rotation/scale matrices. The
Inspector reports overlaps as advisory only. Rotated AABBs can produce false positives; this is
neither precise collision detection nor proof of a correct traffic situation. No physics was added.

Assets retain their existing module-lifetime caches and `dispose={null}` ownership. Selection
rings have a bounded Studio cache (four possible geometries, one material) and do not clone asset
resources. Transform controls and debug helpers own/dispose temporary resources. The canvas stays
on demand and pauses when hidden. No React state or document writes occur every animation frame.

## Verification

All required checks passed on 2026-10-17. Desktop smoke tests are not a
statistical benchmark or GPU timer query; mobile GPU and production deployment are outside this
verification. Undo/Redo is not implemented; use saved snapshots/JSON or restore the preset.

### Automated checks

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check`, and
`pnpm audit:imports` passed. All 101 existing tests remain, plus 38 new tests: 139 total
(25 assets, 26 engine, 88 Studio). The asset report and per-asset geometry measurements pass.
The added renderer comparison matches geometry/material identity, world matrices, visibility
and shadow flags against the original adapters. JSON boundaries, malformed versions/assets,
IDs, transforms, CRUD, saved snapshots, storage corruption/quota, navigation and round-trip
behavior are tested. Documentation links and `git diff --check` pass.

| Scene measure                                  |            Before |     After |
| ---------------------------------------------- | ----------------: | --------: |
| Mesh                                           |               271 |       271 |
| Triangles including instances                  |            57,930 |    57,930 |
| InstancedMesh                                  |                12 |        12 |
| WebGL draw calls, reference view               |               241 |       241 |
| Visible triangles, renderer panel              |             57.0k |     57.0k |
| GPU geometries / textures, idle reference view |           150 / 2 |   150 / 2 |
| FPS, short wheel-animation sample              |                50 |        50 |
| Frame interval, same sample                    |           20.0 ms |   20.0 ms |
| Studio static build bytes, uncompressed        |         1,949,206 | 2,006,272 |
| Web static build bytes, uncompressed           | 938,271 (Phase 3) |   942,355 |

Build byte counts include all static files, not initial-route transfer or gzip; content hashes and
minor UI-only edits can change them. Editor gizmos add temporary draw calls/geometries when enabled;
these counters describe the same original preset with the select tool. Arbitrary extra instances
increase geometry submissions and need their own scene-specific budgets.

### Browser evidence

Chrome compared the saved pre-change static export on port 3104 and final Studio export on 3105.
The final comparison used matching DOM viewports **1909×779**, Medium quality, original isometric
camera, all layers and vehicles visible, and wheel animation on the selected original sedan.
Both displayed 50 FPS / 20.0 ms and the resource counters above. Geometry, lighting and framing
visually match; this is a short smoke sample, not a sustained performance distribution.

The following flows were actually exercised:

- Library → isolated sedan Preview → **Повернутися до сцени**.
- Add sedan → edit X to 4 m and Y rotation to 90° → focus → drag the X gizmo. Position changed
  to approximately 4.705 m while the camera gesture was suppressed; then X was restored to 4 m.
- Save locally and **Export JSON**. The downloaded file contained 27 objects, including the new
  sedan at `[4,0,0]`, rotation `[0,π/2,0]`, and unit scale.
- Import that exported file through Chrome's native file picker; **JSON завантажено** appeared.
  The extension chooser lacked local-file permission, so the native picker was used without
  changing extension permissions. Reload restored the draft; the new object's 4 m / 90° values
  were visible in the Inspector.
- Restore original preset; inspect the final full-scene **Перегляд** without editor helpers.
- Enter a zero scale in the final Inspector: a clear validation error appeared, the field returned
  to 1, and scene data stayed unchanged.
- Web development `/dev/scene-engine` visibly rendered the full city without Studio and without
  console errors. Production `/dev/scene-engine` and `/dev/assets-3d` returned HTTP 404.
  Production Web client chunks contain no WebGLRenderer/TransformControls/scene asset signatures.

No production deployment, mobile GPU benchmark, long-duration stress test or collaboration test
was performed. The project remains on Phase 4; no Phase 5 implementation, Git commit or push was made.

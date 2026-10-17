# Scene Engine

`@traffic-laws/scene-engine` renders versioned scene data using the public `assets-3d` registry.
It has no dependency on Studio, Zustand, Drei, Next.js, traffic rules, questions, or storage.
Studio and the development-only Web route `/dev/scene-engine` are its two consumers.

```tsx
import { parseSceneJSON, serializeScene, createScene } from "@traffic-laws/scene-engine";
import { SceneEnvironment, SceneRenderer } from "@traffic-laws/scene-engine/react";

const scene = parseSceneJSON(serializeScene(createScene("urban-intersection")));
// Inside a React Three Fiber Canvas:
<>
  <SceneEnvironment />
  <SceneRenderer scene={scene} />
</>;
```

The root export is data-only: types, runtime validation, JSON, metadata and preset factories.
`/react` loads renderers. The caller validates at trust boundaries before rendering; errors are
`SceneValidationError` messages suitable for the current Ukrainian UI. The renderer never mutates
or repairs a definition. `SceneEnvironment` is the original urban lighting/background/fog profile;
its optional overrides are viewport diagnostics, not serialized scene properties.

Version 1 stores meters, right-handed Y-up coordinates, Euler XYZ rotations in radians, and
uniform scales. Vehicles point along +Z. Limits: 200 instances; 1 MB JSON; coordinates ±100 m;
rotations ±2π; scale 0.5–2, or exactly 1 for roads and authored environment collections.
`properties.headlights` is permitted for vehicles and `properties.signal` for traffic lights.
Absent properties mean headlights on and traffic signal red. Unknown fields, assets, environments,
countries, duplicate IDs and invalid numeric values are rejected. Only UA is implemented.

`createScene()` returns a fresh validated urban intersection: 26 instances of 21 assets. New
configurations may vary any objects without tying them to an educational question. `SCENE_PRESETS`
lists only geometries that exist. Future schema versions require explicit, tested migrations;
changing `schemaVersion` alone is not migration. Unsupported versions are currently rejected.

Models, geometry, materials, labels and batched scenery remain owned by `assets-3d`. Selection,
controls, local persistence and editing operations belong to Studio. Rendering callbacks allow
Studio to add selection and diagnostic behavior without making the engine import editor code.

Full architecture, authoring instructions and verification: [Phase 4 audit](../../docs/phase-4-audit.md).

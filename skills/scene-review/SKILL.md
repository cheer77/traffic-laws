---
name: scene-review
description: Review a road-question 2D reference against an authored 3D scene, checking geometry, controls, participants, trajectories, rule assumptions and evidence before the scene is presented as an accurate reconstruction.
---

# Scene Review

Use this skill for a requested 2D/3D parity or traffic-scene correctness review. It reviews evidence;
it does not silently edit scenes, declare legal approval or publish content.

## Inputs

Identify the exact question/source revision, 2D reference, Scene Definition revision, scenario binding,
answer evidence and applicable rule references. If a decision-relevant input is missing, mark that
part unresolved instead of inferring it from appearance.

Validate untrusted Scene Definition data with `@traffic-laws/scene-engine`. Resolve every asset through
the shared registry. Preserve source PDFs and original images.

## Review

Compare the 2D source and 3D scene systematically:

1. Road topology: approaches, carriageways, lane count, direction, markings, intersections and scale.
2. Controls: sign identity/orientation/applicability, traffic-light head/state/assignment, stop lines
   and any regulator or priority-road assumptions.
3. Participants: vehicle/pedestrian type, count, lane, position, heading, active/inactive status and
   visibility of every potentially decision-relevant participant.
4. Maneuvers: intended direction, lane changes, turn path, endpoints, crossing/conflict areas and
   timing/order assumptions. Do not treat a static path overlay as simulated motion.
5. Presentation: camera framing, occlusion and whether the learner can see the evidence needed to
   answer without the 3D view introducing misleading objects.
6. Domain parity: question, answer, explanation, scenario binding and bounded evaluator must refer to
   the same facts. Keep legal correctness separate from geometric similarity.
7. Asset reuse and budgets: prefer existing registry assets and record a concrete gap before proposing
   a new one. Flag avoidable duplication or material/geometry ownership problems.

## Evidence labels

Classify each relevant fact as:

- `matched`: directly supported by both source and scene;
- `authored`: intentionally added but not observable in the source;
- `mismatch`: source and scene conflict;
- `unresolved`: evidence is missing, ambiguous or outside the current schema/evaluator;
- `out-of-scope`: visible but explicitly proven irrelevant to the question.

An author declaration alone cannot turn an invisible legal condition into `matched`. A successful
schema/test result proves structural validity, not source fidelity or legal correctness.

## Output

Return a concise review containing:

- revisions and evidence inspected;
- blocking mismatches and unresolved decision-relevant facts;
- non-blocking visual differences;
- asset gaps or reuse findings;
- separate conclusions for structural validity, 2D/3D fidelity and normative confirmation;
- one disposition: `reject`, `revise`, `accept as labelled adaptation`, or `ready for owner review`.

Never use `verified`, `exact reconstruction` or equivalent language unless the recorded evidence and
authorized human review explicitly support it. Do not run browser/GPU tooling or mutate/publish content
without task-specific permission.

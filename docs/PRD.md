# Product Requirements

## Product

РУХ / Traffic Laws is a Ukrainian-language education platform for learning road rules through
officially sourced questions, explanations and reusable 2D/3D representations. The current market
is Ukraine. International expansion is a future option, not implemented scope.

One of the product's key competitive advantages is the planned automatic reconstruction of official
Ukrainian 2D road-rules tickets as maximally accurate 3D scenes. The system should analyze the source
image, identify and reuse suitable Studio assets, create missing supported 3D objects when necessary,
assemble the scene and verify its correspondence with the original before it can be accepted.

## Users and surfaces

- Learners use the Landing and Online School in `apps/web`.
- Content staff use `apps/admin` for authenticated content and import workflows.
- 3D authors use the separate `apps/studio` editor.
- `apps/api` provides authentication, immutable content revisions, publication records and attempts.

The user-facing interface is Ukrainian. Internal code and stable identifiers use clear English names.

## Current product requirements

1. Official questions are imported from locally supplied PDF files with stable identifiers,
   document/image hashes, page provenance and preserved option ordering.
2. Correct answers come from recorded source evidence, not inference from the rules engine.
3. Every normative claim retains its source, edition/effective context and review status.
4. Web shows only content eligible under the backend publication contract outside local Preview.
5. Answers remain server-side until submission; attempts and progress are private.
6. A ticket may use text, original 2D material, validated 3D or a combination when supported.
7. 3D assets are reused through the shared registry and Scene Engine.
8. An authored 3D adaptation must be labelled as an adaptation until its relevant lanes, controls,
   participants and intended trajectories have been reviewed against the source.
9. Local UI Preview must stay development-only and loopback-only and cannot weaken production auth.
10. Accessibility, responsive Ukrainian UI and honest empty/error/loading states are release criteria.

## 2D and 3D strategy

Not every question needs 3D. Use text or the original 2D illustration when spatial reconstruction
does not improve learning. Reuse one validated location for multiple situations by changing scenario
configuration rather than duplicating assets or legal truth.

Automatic creation of accurate 3D scenes from 2D official illustrations is a key product goal and
competitive advantage, but it is not delivered. The intended pipeline analyzes roads, lanes, signs,
signals, participants, poses and trajectories; searches the Studio registry for reusable assets;
creates only supported missing objects; assembles validated Scene Definition data; and checks the 3D
result against the original 2D ticket. The current importer extracts PDF text and images and marks
candidates. A local server-only Gemini adapter now connects to the existing reconstruction boundary,
but its first live pilot did not return a usable analysis and no automatic reconstruction is
delivered. Vision output must remain structured, reviewable and unable to silently publish or assert
legal or visual accuracy.

## Content and legal quality

- Official-source extraction, answer-key verification, legal interpretation, 3D reconstruction and
  editorial publication are separate gates.
- A successful parser or automated test does not prove legal correctness.
- Owner publication is an editorial release action and does not turn `unverified` normative metadata
  into independent verification.
- Exact official text/images require a documented permitted-use basis before redistribution.
- The bounded rules evaluator returns unknown/unsupported for facts it cannot determine.

## Out of current scope

- Foreign markets and foreign rulesets.
- Mobile applications.
- Production billing and subscriptions.
- General-purpose traffic simulation.
- Fully automatic OCR of the answer table.
- Automatic, exact and publication-ready 2D-to-3D reconstruction.
- Unapproved new infrastructure or packages.

## Product acceptance

A release increment is acceptable when its source and review status are explicit, shared contracts
validate, production authorization remains intact, relevant automated checks pass, and the owner has
completed manual acceptance. Current gaps are tracked in [`TASKS.md`](TASKS.md).

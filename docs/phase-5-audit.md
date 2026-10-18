# Phase 5 — Scenarios & Country Rules Foundation

> **2026-10-18 owner-policy update:** this historical audit originally treated an independent
> external specialist as a mandatory product gate. The owner has removed that business requirement.
> Protected owner publication is now implemented, while `unverified` normative metadata remains
> unchanged and technical tests still do not prove legal correctness. See [the MVP audit](mvp-audit.md).

## Acceptance status

**Engineering foundation completed; overall Phase 5 In progress.** The unchanged Roadmap requires Ukrainian material to be validated for legal use. Eight regulatory research records remain `unverified` and all three educational tickets remain `in_review`: no independent competent Ukrainian reviewer has confirmed provision scope, exceptions, answers or authored 3D conditions. Tests and browser checks cannot supply that approval. Phase 6 has not started.

| Acceptance area                  | Evidence                                                                                                                                                                                                                    | Result                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Engineering foundation           | Versioned validators; bounded deterministic decisions; one result consumed by answer UI, 3D feedback and scenario validation; explicit scene binding and evidence labels; safe diagnostics; automated and Chrome acceptance | Completed for the supported scope                                |
| Independent domain acceptance    | No competent independent reviewer/evidence for eight records or three drafts                                                                                                                                                | Pending; blocks overall completion and real tickets              |
| Future production infrastructure | Authenticated review, immutable approval, persistence and protected publishing                                                                                                                                              | Deferred to Backend/Admin phases; outside Phase 5 implementation |

The Roadmap's original done criteria have **not** been weakened. The development gallery now demonstrates that UI and 3D use one maneuver result, but it is a technical preview, not a production ticket feed or legally approved answer bank.

## Official Ukrainian source and provenance

The [Verkhovna Rada PDR page](https://zakon.rada.gov.ua/laws/show/1306-2001-%D0%BF) was opened and the provisions below inspected on **2026-10-17**. It identified Resolution No. 1306 of 2001-10-10 as current, with complete-document edition **2026-04-09**, basis Resolution 427-2026-п. A later repeat full-page fetch timed out; the official search index still identified that edition as current. `editionDate` is not the effective date of each provision. `retrievedAt` is research provenance, not expert approval.

| Record           | Exact provision        | Research topic                        | Status       |
| ---------------- | ---------------------- | ------------------------------------- | ------------ |
| `ua-pdr-8.7.3-a` | 8.7.3 а                | Green signal                          | `unverified` |
| `ua-pdr-8.7.3-e` | 8.7.3 е                | Red signal                            | `unverified` |
| `ua-pdr-8.7.3-g` | 8.7.3 ґ                | Yellow signal                         | `unverified` |
| `ua-pdr-8.11`    | 8.11                   | Yellow-light stopping exception       | `unverified` |
| `ua-pdr-16.1`    | 16.1                   | Regulated / unregulated intersection  | `unverified` |
| `ua-pdr-16.6`    | 16.6                   | Left turn / U-turn on main green      | `unverified` |
| `ua-pdr-16.11`   | 16.11                  | Secondary versus main road            | `unverified` |
| `ua-pdr-16.12`   | 16.12, first paragraph | Equivalent roads / traffic from right | `unverified` |

Each record has the official URL, section, edition and retrieval dates, Ukrainian summary and explicit status in `packages/country-rules/src/ua-pdr-references.ts`. Short paraphrases and links are stored, not a copied question bank. The [independent reviewer checklist](phase-5-legal-review-checklist.md) traces every provision to supported conditions, exceptions, engine tests and dependent drafts. Source inspection does not verify the legal interpretation.

## Shared decision and 3D binding

`@traffic-laws/country-rules/traffic-rules-engine` remains independent from React and Three.js. It returns admission, directed yield obligations, pairwise priority, geometric path overlap, authored time overlap, candidate simultaneous movement, applied provisions, diagnostics, `technicalCertainty` and review-gated `certainty`. Admission is not priority; shared-zone overlap is not a collision prediction. Yellow exceptions, regulators, trams, active pedestrians, special signal sections, roundabouts, turning main roads, blocked exits and other unimplemented conditions remain unsupported or unresolved. Empty signal observations are not treated as off. Contradictory control or road classes are diagnosed; STOP does not silently imply its unimplemented mandatory-stop rule.

`@traffic-laws/scenarios/scenario-decision` builds one typed `SharedScenarioDecision` from the engine result and validated situation. Scenario validation checks its structured claim, correct answer, rule trace and scene findings. The development question UI and 3D overlay receive the **same evaluated object**. The overlay adapter only maps its participant IDs and authored path coordinates to neutral rings, route strips and endpoint markers. Orange means selected/potential conflict, never legally allowed. Source records remain unverified, so all three displayed overall decisions are `unsupported` for legal use even where the bounded technical calculation is determinate. A candidate concurrent movement is never shown as confirmed safe.

Additive `trafficDecision.sceneBinding` v1 is owned by scenarios, leaving Scene Definition v1 and old ticket JSON compatible. Its strict validator requires a real road instance, one road link per semantic lane, explicit author classification of every visible vehicle/character as active or inactive, and explicit out-of-scope classification for every visible sign/light not bound to the situation. It rejects missing, duplicate and overlapping IDs. Signal indication/asset and sign asset/approach/pose are checked against Scene Definition; priority-sign class cannot contradict an authored main/secondary lane. The preset-specific check also compares vehicle heading and authored path start/exit. Observed pose facts, author-declared applicability/activity/control/width/timing, and unresolved facts are reported separately. Nothing in a static scene proves legal applicability, actual intent, timing or inactivity.

| Demo flow                  | Shared decision and visible 3D result                                                                                                                                               | Still authored / needs reviewer                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `draft-ua-red-signal`      | South sedan + `red` south signal; intended straight route marked, provisional `prohibited` admission; draft answer/8.7.3 е trace agree                                              | Main signal mode, lane control, inactive others, regulator, free exit and route timing/width                    |
| `draft-ua-left-turn-green` | South sedan turns left; north SUV goes straight; both green; pairwise `turning → oncoming` yield and intersecting routes shown; selecting either vehicle changes only its highlight | Actual turn/arrival, signal-to-lane applicability, inactive others, widths/timing and exceptions                |
| `draft-ua-secondary-road`  | South sedan / west ambulance, bound yield/main signs, off signals; `secondary → main` yield and crossing routes shown                                                               | Road classification and non-turning main road, sign applicability, inactive others, widths/timing and free exit |

The old text-only tickets still work without engine data. Missing `sceneBinding` in older traffic drafts remains JSON-compatible but reports unresolved scene evidence. All three new demos keep `in_review`, and priority-dependent tickets cannot be marked verified/published through the local validator. Editable local metadata is not authentication; trusted revision-bound approval is future infrastructure.

Studio Composer, the urban scene preset, asset geometry/materials, lighting, cameras and shared renderer were not changed. The app-only static overlay adds at most seven small meshes in these examples, with no animation-frame state updates; R3F disposes its mounted JSX geometry/materials. The historical 271-mesh, 57,930-triangle, 12-InstancedMesh, 241-draw-call and short ~50 FPS figures remain historical Phase 4 baselines. No comparable GPU/frame-time benchmark was performed for the overlay.

## Verification and remaining action

The original **172 tests** were preserved; **179 tests pass**: assets 25, scene engine 26, Studio 88, country rules 22, scenarios 17 and Web 1. New regressions cover incomplete/overlapping participant and control-device classifications, lane/road and signal/sign applicability, shared decisions for all three demos, snapshot/JSON compatibility, source-edition mismatch, contradictory road classes, unsupported STOP semantics, and overlay correspondence. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm check` and `pnpm audit:imports` passed.

Chrome on `localhost:3000/dev/scenarios` displayed all three 3D scenes and authored routes, checked their draft answers, showed unverified diagnostics, and changed the left-turn highlight when the oncoming participant was selected. Reload restored the gallery. Chrome opened the existing Studio Composer with the user's local 27-object draft intact. A separate production build on loopback returned **HTTP 404** for `/dev/scenarios`. Browser visibility is not legal review or a GPU performance measurement.

**Next responsible action:** an independent Ukrainian specialist must re-open the official current edition and review all eight provisions plus each answer, explanation, authored scene binding and visual interpretation; record evidence tied to immutable revisions. Backend/Admin can later enforce that approval before any production publication. Until then Phase 5 remains **In progress** and no draft is safe to publish as a real ticket.

# Country rules

`@traffic-laws/country-rules` stores Ukrainian (`UA`) rule references as data. The root export has no React, Three.js, or scene dependency. `validateRule` rejects unknown fields, unsupported schema versions, non-UA countries, and incomplete verification records. `validateRules` also rejects duplicate IDs. `parseRuleJSON` and `serializeRule` validate at the JSON boundary.

An unverified entry may have `source: null`; it must never be presented as a verified legal rule. A source may record `editionDate`, `effectiveDate` when specifically known, and `retrievedAt`. These are different dates. A verified entry needs an HTTPS normative source, its exact section, checked date, reviewer name, and evidence URL. The validator cannot prove legal correctness.

`/ua-pdr-references` holds six exact provisions inspected in the official current PDR edition on 2026-10-17. All remain `unverified` pending competent human review. `/traffic-situation` contains a strict, rendering-independent model of intersection facts, maneuvers, signs, signals, paths, conflicts and simultaneous-movement candidates. It computes no priority. Authored `allowed`/`prohibited` maneuver permissions require verified rule references, so the included research records cannot be used to grant movement permission.

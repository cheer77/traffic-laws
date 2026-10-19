# Local official-ticket pipeline

## Scope and actual result

The owner's 2026-10-19 brief authorizes local import without Backend/Admin changes. The owner
explicitly chose to leave the vision adapter disconnected. This is an incomplete reconstruction
pipeline with working PDF extraction and school integration, not automatic image understanding.
No production publication or legal-source status changes are implied.

Ten real questions, **Section 16.1 №1–10**, are imported from question PDF pages **173–176**.
All ten have original embedded JPEGs, exact text modulo PDF line-break whitespace, option ordering,
question/section IDs, document and image SHA-256 hashes, page coordinates and per-stage results.
All ten are **3D candidates**, currently displayed as **2D only** and marked **needs_review**.
There are **zero verified 3D scenes and zero new assets**. Five existing authored reconstructions
remain in source and regression tests; the school no longer treats their presence as verification.

## Run locally

Python with PyMuPDF is required. The session used an existing PyMuPDF 2.0 virtual environment;
no dependency was added to the frontend. If necessary, provision developer tooling separately:

```sh
python3 -m venv .venv-official-tickets
.venv-official-tickets/bin/pip install -r scripts/official-tickets/requirements.txt
TRAFFIC_PDF_PYTHON=.venv-official-tickets/bin/python pnpm import:official
TRAFFIC_PDF_PYTHON=.venv-official-tickets/bin/python pnpm test:official-pdf
pnpm --filter @traffic-laws/web dev --hostname 127.0.0.1
```

Open `/school` in existing local UI Preview. Production authentication/publication is unchanged.
PyMuPDF is AGPL/commercial dual licensed; this repository uses it as local developer tooling.
The importer accesses local files only and does not invoke a model or network service.

Retry one ticket without losing the others:

```sh
TRAFFIC_PDF_PYTHON=.venv-official-tickets/bin/python pnpm import:official --ticket 4
```

First-ticket extraction demonstration, leaving the main set intact:

```sh
.venv-official-tickets/bin/python scripts/official-tickets/import-tickets.py \
  --limit 1 --output /tmp/official-ticket-one.json --images /tmp/official-ticket-one-images
```

The public URL prefix in extracted records is `/official-import/`; custom `--images` output is for
inspection, not an automatically mounted public directory. Other selections can use `--section`,
`--start-page`, `--end-page`, `--limit` and a separately checked `--answer-evidence` file. Page ranges
must include the section heading and complete selected questions. This parser supports this PDF's
single-column numbered question/option layout, not arbitrary scanned question banks or vector-only
illustrations. It does not OCR question pages. Missing sections fail without replacing the manifest.
Multiple embedded images in one question require association review.

## Extraction and answers

`scripts/official-tickets/import-tickets.py` orders text lines and embedded image blocks by page
coordinates. Section and question anchors determine image ownership; there is no per-ticket image
index map. Images are written without recompression under content hashes. Question IDs are stable,
full imports replace the chosen set, and `--ticket` merges only that record. Retries against changed
PDF hashes are rejected. The JSON manifest is replaced atomically and has no volatile timestamps.
Repeated imports reuse image paths; obsolete images are not automatically deleted.

The answer PDF has no text layer. A local Apple Vision OCR experiment failed; **automatic answer-table
recognition is not delivered**. `scripts/official-tickets/answer-evidence.json` contains the ten answers
visually transcribed by the assistant from rendered answer page 4, clearly marked
`assistant_visual_transcription`, bound to both source PDF hashes. This is neither OCR nor independent
human/legal review. Unknown, duplicate, out-of-range or mismatched key entries produce a null answer
and `answer_unresolved`; they cannot be scored in school. A new selection needs matching evidence
or a future reliable OCR-table adapter. Never infer the key from traffic rules.

The current classifier considers question vocabulary and the presence of an extracted illustration.
It deliberately reports `candidate-3d` or `undetermined`, not semantic understanding of the image.
There is no claim that a keyword classifier replaces vision. No-image questions retain 2D/text.
All explanatory legal text remains pending independent review, rather than generated from the key.

## Reconstruction boundary

`apps/web/src/features/official-tickets/pipeline.ts` provides `VisionAdapter`, `parseImageAnalysis`,
`reconstruct` and `exportStudioDraft`. The adapter receives source text/options and the reference image;
its default implementation reports `vision_adapter_not_connected`. It has no paid API or hidden
model dependency. `ImageAnalysis` carries image-bound observations with confidence and normalized
bounding boxes, explicit unknowns, requested asset IDs, camera and an optional Scene Definition.
Unknown fields/code, invalid values, mismatched question/image IDs and malformed proposals are
rejected. Three.js never executes generated instructions.

A supplied analysis resolves requested IDs against the real registry. Unsupported assets produce
explicit blockers; no substitute intersection is inserted. Existing-engine validation checks object
IDs, transforms, properties and asset support. Structural checks compare observed vehicle IDs/count,
position, orientation and signal values. These checks cannot establish correct interpretation of a
source image, lane topology, sign direction, camera composition or legal meaning. Consequently even
a structurally valid proposal remains a draft requiring independent visual review and a verified
explanation. There is intentionally no model-controlled `ready` switch.

Stage reports include `analyzing`, `assets_ready`, `scene_built`, `validation`, `needs_review` and
`failed`, skipping unreached stages. The PDF manifest records extraction/classification and the
current disconnected-analysis blocker. Future adapter results are returned as typed reports; a
persistent reconstruction runner/review workflow is not yet implemented. `exportStudioDraft` emits
only validated Scene Definition JSON suitable for Studio's existing JSON import, separate from its
analysis report. No real scene export is available for this pilot because analysis is blocked.

## Remaining work

- Connect a vision adapter only after owner approval; analyze geometry, all road users, arrows,
  signs, signal sections, lane directions and camera from the actual image. Do not hand-author ten
  substitutes and label them automatic.
- Implement reliable table OCR with cell/section association and independent source checking;
  retain null answers when uncertain.
- Extend the existing asset/Scene Definition contracts for supported parametric roads, markings,
  colors, signs and extra light sections; implement reusable persistent asset recipes and Studio
  listing. V1 only has fixed registry assets, transforms, headlights and simple signal state.
  Runtime asset creation/persistence is **not implemented**; requests for absent assets stay blocked.
- Persist adapter results/reviews and revisions; add semantic geometry/sign/lane comparisons,
  calibrated camera rendering and independent visual acceptance. No fixed-camera render or image
  similarity check was performed, and no 1:1 match is claimed.
- Review the source edition, reuse basis and authoritative explanatory provisions independently.
  Answer-table transcription is not a verified PDR explanation or publication authorization.

## Verification

The first ticket was extracted alone, then the same importer produced all ten. Python regressions
exercise source-bound answer evidence, conservative classification, real-PDF import, byte-identical
single-ticket retries, image reuse and absent-answer blocking. Vitest checks all ten texts/options
against existing transcriptions, image bytes, invalid/unbound inputs, school gating, adapter failures,
unsupported assets, structural mismatch detection and Studio-format draft export with synthetic data.
Synthetic proposal tests do not claim reconstruction of a real ticket.

Browser, Chrome, Playwright, Puppeteer, GPU, mobile and visual scene checks are intentionally not run
under the owner's restrictions. PDF page/image inspection is independent of browser verification.

Session checks passed: `pnpm check` (import boundaries, ESLint, unit tests, TypeScript, all app
builds and formatting), three Python import regressions, and `git diff --check`. API database
integration tests were not run because no Backend/schema behavior changed; their normal unit-suite
skips remain. Browser interaction and 2D/3D switching were not exercised.

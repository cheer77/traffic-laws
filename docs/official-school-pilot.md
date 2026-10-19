# Official Ukrainian question pilot

## Authorized scope

The owner requested replacing the five authored school examples with a pilot of ten real, current
Ukrainian exam questions, using 2D where sufficient and Studio-authored scenes where 3D helps.
The working assumption is ten individual category-B questions, not ten full exam sessions.
The existing `/school` UI and safe local Preview boundary remain the target. No production content
approval, Backend/Admin changes, or promotion of unverified legal references is implied.

## Current implementation — 2026-10-19

The supplied local PDFs unblock extraction. The reusable importer now supplies ten Section 16.1
questions to local `/school`; all 3D is blocked pending analysis and independent verification.
The scanned answer key currently uses an explicitly recorded assistant visual transcription, not
successful automatic OCR. See [pipeline commands, evidence and remaining work](official-ticket-pipeline.md).
The acquisition failure below is historical; it does not describe the local files now available.

## Source discovery — 2026-10-19

The [official GSC MVS question page](https://hsc.gov.ua/index/poslugi/vidacha-posvidchennya-vodiya/pitannya-ta-ispit-z-pdr/)
currently links questions and answers under order **29.10.2025 No. 225**:

- [Questions PDF](https://hsc.gov.ua/wp-content/uploads/2025/11/POLOTNO-NAKAZ_04_09_2025%20%281%29.pdf)
- [Answer table PDF](https://hsc.gov.ua/wp-content/uploads/2025/11/Numer_-vidpovidej-do-nakazu.pdf)
- [Amendment order No. 225](https://hsc.gov.ua/wp-content/uploads/2025/11/nakaz-GSTS-MVS-29.10.2025-225.pdf)

The question filename contains September's date although the page identifies the November-uploaded
file with October's amendment. Inspect the actual question content and amendment before asserting
that a selected record incorporates all applicable changes. A retrieval date is not an edition date
or legal approval. Do not substitute an older answer table found in search results.

**Blocked source acquisition:** direct terminal downloads returned HTTP 403 Access Denied. The web
reader rejected the 43,624,958-byte question PDF as too large; the answer/order PDF tools did not
provide readable content. No question text, answer keys or illustrations were imported, and no ten-question
set has been claimed as verified. The existing five examples remain authored demonstrations.
Obtain the official question and answer PDFs (and amendment if the compilation is ambiguous) as
attachments or through another legitimately accessible official source before implementing records.

## Acceptance requirements

- Preserve exact Ukrainian question text and option ordering, original section/question identifiers,
  PDF page numbers, official answer indices, source URLs, document edition and retrieval date.
- Check every selected answer against the matching official answer table, not an inferred traffic rule.
- Check applicable current PDR provisions separately; source extraction and legal interpretation are
  distinct checks. Existing rule-review metadata remains unchanged.
- Record provenance and permitted-use basis for copied text/images before redistribution; do not
  assume a third-party preparation site's explanations or illustrations are official assets.
- Prefer the original 2D illustration where sufficient. A text-only question does not need an invented
  intersection. Clearly label any reconstructed diagram as an authored adaptation.
- Use a typed per-question presentation: text, original 2D, or validated Scene Definition JSON plus
  original-reference material. Only expose a 3D option when a matching scene actually exists.
- Author 3D through the Studio scene format, with stable asset IDs and importable/exportable JSON;
  the school consumes the same validated snapshot using Scene Engine. Do not falsely claim scenes
  were created through Studio's UI when browser automation is prohibited.
- Match every decision-relevant vehicle, lane, sign, light and intended maneuver to the official
  illustration. Do not force all ten questions into the current four-way intersection or invent motion
  when a question only tests sign recognition or a static condition.
- Keep official question/answer provenance separate from our explanatory text, 3D adaptation and
  animation review. Authoring an adaptation does not make it an official examination image.
- Add source/answer/presentation parity regressions, run relevant unit checks and `pnpm check` after
  implementation. Actual visual acceptance remains the owner's manual check; no browser automation.

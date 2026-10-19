# Design Principles

## Language and tone

- User-facing UI is Ukrainian.
- Use clear educational language and distinguish official material, authored explanation and adaptation.
- Never imply legal or visual certainty beyond recorded evidence.

## Learning experience

- Keep the question, media/context and answers easy to scan.
- Use text or original 2D when 3D does not add spatial understanding.
- Show 3D only when a matching validated snapshot exists; label unreviewed adaptations explicitly.
- Correct/incorrect feedback uses text and iconography, not color alone.
- Preserve answer order and keep the correct answer hidden until a successful submission.

## States and accessibility

- Provide honest loading, empty, error, forbidden and unauthenticated states.
- Keyboard focus must be visible. Dialogs/sheets need managed focus, Escape dismissal and a clear close control.
- Mobile/tablet layouts must avoid horizontal page scrolling and keep primary actions reachable.
- 3D is progressive enhancement; text/explanation and critical controls remain usable without it.
- Provide meaningful alt text for governed 2D media and labels for 3D controls/status.

## Visual system

Use a small consistent token set for primary action, background, surface, subtle surface, border,
primary/secondary text, focus, success, warning and danger. Prefer restrained shadows, consistent
spacing and radii, and reusable local components. Create a shared UI package only after a second real
consumer adopts the same component contract.

## Application character

- Web prioritizes learning and trust.
- Admin prioritizes traceability, validation and safe actions over visual polish.
- Studio retains its specialist editor layout and camera/control behavior unless explicitly redesigned.
- Preview/demo banners must be unmistakable and must not resemble production approval.

## Manual acceptance

The owner checks Ukrainian copy, responsive hierarchy, source/adaptation labelling and visual parity.
Browser, WebGL or mobile acceptance is recorded only when the corresponding approved check was run.

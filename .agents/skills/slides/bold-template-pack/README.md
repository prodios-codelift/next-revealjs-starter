# Bold Template Pack

This pack brings the `beautiful-html-templates` design systems into the
`frontend-slides` skill without making them the default for every deck.

## What To Read

1. Read `bold-template-pack/selection-index.json` first.
2. Shortlist candidates from metadata only:
   - `mood`
   - `tone`
   - `best_for`
   - `avoid_for`
   - `formality`
   - `density`
   - `scheme`
3. For title-slide previews, read only the relevant candidate `preview.md`
   files.
4. After the user chooses a bold template, read exactly that one template's
   full `design.md`.
5. Do not read every `design.md` in the pack.
6. Do not read or copy `template.html` from the source template library unless a
   selected `design.md` is missing a critical implementation detail.

The full source metadata index is not bundled in the user-facing skill. Normal
generation should use `selection-index.json` only.

## How To Use In Frontend Slides

Preview mix: follow the three directions in [../SKILL.md](../SKILL.md) (**Mode: previews**) — A Expected (a preset), B Elevated (a bold template), C Memorable (a second bold template or a custom design) — chosen by fit to the brief first, then checked for real difference in palette, light/dark and typeface character.

If the wildcard is custom, it must follow Frontend Slides' no-slop aesthetics:
distinctive typography, a committed palette, a recognizable layout system, a
context-specific visual idea, fixed 16:9 stage behavior, and no visible process
labels such as "custom", "wildcard", "template", or "preview".

## Implementation Contract

`design.md` is the design-system reference. Treat it as a style recipe, not as
content to copy. `preview.md` is only a lightweight style card for generating
the three title-slide options.

Preview slides must be real title slides for the user's deck. Do not render
template names, option labels, file names, paths, `preview.md`, "generated
from", or user requirement notes on the slide itself.

When generating final slides:

- Output is reveal.js code in this Next.js app, following [../reveal-template.md](../reveal-template.md).
- `src/deck/reveal-base.css` is already loaded; do not copy it. Translate the template with [../design-to-reveal.md](../design-to-reveal.md).
- Generate every deck as a fixed 1920×1080 stage scaled uniformly to the
  viewport. This applies even if the source template was originally
  viewport-fluid.
- Treat `vw`, `vh`, and `clamp()` values in a source `design.md` as design
  proportions to translate into fixed 1920×1080 stage coordinates.
- Preserve the selected template's fonts, palette, decorative vocabulary,
  spacing rhythm, and component grammar.
- Keep the user's actual slide content primary. The template style should shape
  presentation, not override message or structure.
- Verify rendered output for both text overflow and panel overlap. A card can
  pass `scrollHeight` checks while still being covered by another grid panel.

# Translating a Bold Template to reveal.js

Every `bold-template-pack/templates/<slug>/design.md` was written for a standalone HTML deck with a `deck-stage.js` scaler, and some for viewport-fluid layouts. Treat `design.md` as a style recipe: keep its fonts, palette, decorative vocabulary, spacing rhythm and component grammar; change only the runtime.

## Runtime Mapping

| design.md says | Do this here |
| --- | --- |
| `deck-stage.js`, "stage scaler", `translateX` strip of slides | Nothing — reveal.js is the stage (`width: 1920, height: 1080, margin: 0`) |
| `.slide` element | `<Slide>` (renders `<section>`); put the template's slide classes on `className` |
| `.slide.active` / `.visible` / `.is-active` | `section.present` |
| `[data-anim]` entrance attributes, IntersectionObserver reveals | `.enter*` classes keyed off `section.present`, or `<Fragment>` for presenter-stepped reveals (see [animation-patterns.md](animation-patterns.md)) |
| Zero-duration / "instant cut" transitions | `config={{ transition: "none" }}` |
| Nav dots, page counter, progress bar chrome | reveal `controls`, `progress`, `slideNumber` config options; style them under the scope class (`.reveal.deck-theme .controls`, `.progress`, `.slide-number`) |
| `100vw × 100vh` slide, `vw`/`vh`/`clamp()` sizes | Convert to px at 1920×1080: `1vw = 19.2px`, `1vh = 10.8px`; for `clamp(min, fluid, max)` use the fluid value at 1920×1080, clamped |
| `:root { --token: … }` | Same tokens on `.reveal.deck-theme` (or `.reveal.preview-x`) |
| `<link>` to Google Fonts / Fontshare | `next/font/google` in `fonts.ts`; closest Google font if the original is Fontshare-only |
| Page background / body colour | Slide surface on `.slides section`; letterbox on `--stage-bg` |
| Speaker-notes markup | `<Slide notes="…">` |
| Keyboard / touch handlers | Nothing — reveal handles navigation |
| Edit-mode toggles, localStorage | Drop — not part of this app |

## Steps

1. Read the selected template's `design.md` once, fully.
2. Write tokens (colours, type scale, spacing) on the scope class.
3. Write the slide surface and typography rules.
4. For each layout the outline needs (title, section, content, quote, comparison, stats, closing), write one layout class, following the template's component grammar. Design layouts the template doesn't cover from its own vocabulary — don't import patterns from another style.
5. Use `template.html` from the source library only if `design.md` is missing a critical implementation detail.
6. Run the checks in SKILL.md; fix overflow by splitting slides, not by shrinking type below the template's scale.

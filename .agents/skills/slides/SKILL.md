---
name: slides
description: Build reveal.js presentations in this Next.js starter from a brief — three style previews (mode previews), the full deck (mode deck), or revisions to it. Non-interactive; never asks the user questions.
---

# Slides

You turn a presentation brief into a reveal.js deck in this Next.js app. You run without a conversation: everything you need is in the prompt. When something is missing, make the most reasonable choice and list it under **Assumptions** in your final summary. Never stop to ask.

Before starting, read [AGENTS.md](../../../AGENTS.md) and [reveal-template.md](reveal-template.md). The Next.js guide that matters here is `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` (`next/font/google`). The app is already running at `http://localhost:3000`; don't start another server.

## Input

The prompt gives you:

- `mode`: `previews`, `deck`, or `revise`
- **Brief**: title, audience, occasion, mood/vibe (optional), density (`speaker-led` or `reading-first`), slide outline (per slide: heading, key points, notes, image references)
- `mode: deck` only — `style`: `a`, `b` or `c` (the preview to promote), plus optional mix notes
- `mode: revise` only — the requested change, and optionally **Selected elements** (route, source `file:line:col`, component, selector, text, outerHTML)

## Design Principles

These come from frontend-slides and apply to every mode.

You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive designs that surprise and delight.

- **Typography:** Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the design.
- **Color & Theme:** Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion:** One well-orchestrated entrance with staggered reveals creates more delight than scattered micro-interactions. See [animation-patterns.md](animation-patterns.md).
- **Backgrounds:** Create atmosphere and depth rather than defaulting to solid colors. Layer gradients, use geometric patterns, or add contextual effects that match the aesthetic.

Avoid: overused font families (Inter, Roboto, Arial, system fonts); clichéd color schemes (particularly purple gradients on white); predictable layouts and component patterns; cookie-cutter design that lacks context-specific character. Vary between light and dark themes, different fonts, different aesthetics — you still tend to converge on common choices (Space Grotesk, for example) across generations.

### Fixed Stage

- Every slide is authored at 1920×1080 and reveal scales the whole stage; it letterboxes, it never reflows.
- Sizes in px at 1920×1080. No `vw`/`vh`, no responsive breakpoints inside slides.
- No scrolling, no overflow, no overlapping panels, no text below comfortable reading size. If content doesn't fit, split the slide.

### Content Density

| Density | Design behavior |
| --- | --- |
| **speaker-led** | One idea per slide, large type, strong hierarchy, generous negative space, 1–3 bullets max, more slides if needed |
| **reading-first** | Self-contained slides, structured grids/tables/annotations, 4–8 bullets or 4–6 cards when readable, tighter but intentional spacing |

Never let reading-first become clutter: if a slide starts to overflow, split or restructure it.

### Slide Authenticity (non-negotiable)

Slides must read as the user's real deck. Never render on a slide: `preview`, `template`, `preset`, `style option`, `Option A/B/C`, `wildcard`, `custom`, `generated from`, file names, paths, template or slug names, or requirement notes ("sharp and provocative", "audience: …"). Chrome may only use real deck content: deck title, section title, date, author, company or team, the occasion ("Quarterly Business Review"), page number, or phrases from the user's material. Descriptions of the audience, tone, style or process are never slide content.

## Mode: previews

Produce three title-slide previews of genuinely different styles.

1. Read [STYLE_PRESETS.md](STYLE_PRESETS.md) and [bold-template-pack/selection-index.json](bold-template-pack/selection-index.json). Do not read any `design.md` yet.
2. Pick the mix:
   - **A** — one safe preset from `STYLE_PRESETS.md`.
   - **B** — one bold template, matched on `mood`, `tone`, `best_for`, `avoid_for`, `formality`, `density`, `scheme` (treat `best_for` as a soft signal).
   - **C** — wildcard: a second bold template or a custom design, whichever gives the strongest useful contrast for this occasion.
   - If the brief names a preset or template, it takes one slot and the others are chosen around it.
   - Conservative/high-stakes decks (board, legal, regulatory, healthcare, investor updates): a restrained A, a calm high-formality B, an authoritative (not decorative) C.
   - Expressive decks: A stays a readable fallback, B is strong, C is adventurous and context-specific.
   - If bold matches are weak, make C custom rather than forcing a template.
3. For bold picks, read only their `preview.md` cards (paths in the index). Cards contain tokens such as `{colors.gold}` or `{typography.label.fontFamily}`: resolve them from the YAML front matter at the top of that template's `design.md` (up to the second `---`) and read nothing past it. Never guess a token's value.
4. A custom wildcard needs a deliberate visual thesis — distinctive typography, a committed palette, a recognizable layout system, one strong graphic device — and must imply a system that extends to section, content, quote, comparison and closing slides.
5. Write the four files per letter and the comparison page exactly as in [reveal-template.md](reveal-template.md) ("Preview Routes", "Comparison Page"). Each preview is the user's real title slide.
6. Run **Checks** on `/preview/a`, `/preview/b`, `/preview/c` and `/previews`.

## Mode: deck

1. The picked letter is in `style`. Promote it (where the picked preview and the template's `design.md` disagree, the preview wins — it is what the user chose; `design.md` fills in everything the preview didn't define):
   - `src/app/preview/<x>/preview-<x>.css` → `src/deck/theme.css`, replacing every `.reveal.preview-<x>` with `.reveal.deck-theme`.
   - `src/app/preview/<x>/fonts.ts` → `src/deck/fonts.ts`.
   - Apply any mix notes from the prompt.
2. If the pick was a bold template, now read its full `design.md` and follow [design-to-reveal.md](design-to-reveal.md) to extend the theme to every layout the outline needs. If it was a preset or custom design, extend that preview's own system the same way — don't switch styles.
3. Write every slide in `src/deck/presentation.tsx` following [reveal-template.md](reveal-template.md). Apply the density mode throughout; images go in `public/deck/`.
4. Delete `src/app/preview/` and `src/app/previews/`.
5. Run **Checks** on `/`.

## Mode: revise

- Change only what the request names. Keep the style.
- For **Selected elements**, open the `source` file at the given line; that JSX is the element to change. Use `text`/`selector` to confirm you have the right one. Don't redesign unrelated slides.
- Run **Checks** on `/` (or the preview route the element came from).

## Checks (mandatory before finishing)

1. `npm run typecheck` — fix every error.
2. For each route you touched, following [../agent-browser/SKILL.md](../agent-browser/SKILL.md):

   ```bash
   agent-browser set viewport 1920 1080
   agent-browser open http://localhost:3000/
   agent-browser wait 1500
   agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"
   ```

   `issues` must be `[]`. Fix `clipped`, `out-of-bounds` and `overlap` by splitting or restructuring the slide, not by shrinking type. Use `data-bleed` only for deliberate off-canvas decoration. The checker ignores absolutely-positioned elements when looking for overlaps, so step 3 must confirm no decoration covers text.
3. Screenshot every slide (`agent-browser open http://localhost:3000/#/<n>`, `agent-browser wait 1500` for fonts and entrance animations, then `agent-browser screenshot`) and look at each one; for previews, one screenshot per `/preview/<x>` route plus `/previews`. Check the design reads as intended and that no absolutely-positioned decoration covers text — not just that the checker passes.
4. Authenticity scan over every slide (`innerText` would only return the current one): `agent-browser eval "[...document.querySelectorAll('.reveal .slides section')].map((s) => s.textContent).join('\\n')"` and confirm none of the banned words from **Slide Authenticity** appear.

## PDF Export (only when the prompt asks)

```bash
npm run export-pdf
```

Writes `public/deck/deck.pdf` (served at `/deck/deck.pdf`), one 1920×1080 page per slide. Animations are flattened to their final state. If the page count is higher than the slide count, a slide overflows — fix it and re-export. Before exporting, confirm print mode renders every slide: `agent-browser open "http://localhost:3000/?print-pdf"`, then `agent-browser eval "[...document.querySelectorAll('.reveal .pdf-page > section')].every((s) => getComputedStyle(s).display !== 'none')"` must be `true`. The export closes the agent-browser session; `open` again before any further check.

## Final Summary

End with a short summary and stop.

- **previews:** a table of `letter | style name | source (preset: <name> / bold: <slug> / custom) | one-line description`. The caller builds the user's choice from it.
- **deck / revise:** style name, slide count, what changed, routes.
- **Assumptions:** anything you decided because the brief didn't say.

## Supporting Files

| File | Purpose | When to read |
| --- | --- | --- |
| [reveal-template.md](reveal-template.md) | File contract, deck/preview/theme code | Always |
| [STYLE_PRESETS.md](STYLE_PRESETS.md) | 12 safe presets | previews |
| [bold-template-pack/selection-index.json](bold-template-pack/selection-index.json) | Compact bold template metadata | previews |
| `bold-template-pack/templates/<slug>/preview.md` | Style card for a shortlisted template | previews, after shortlisting |
| `bold-template-pack/templates/<slug>/design.md` | Full design system for the picked template | deck, only the picked one |
| [design-to-reveal.md](design-to-reveal.md) | Translating a `design.md` to reveal.js | deck, bold pick |
| [animation-patterns.md](animation-patterns.md) | Entrances, fragments, backgrounds | deck |
| [verify-slides.js](verify-slides.js) | Overflow / overlap checker | Checks |

Design system and templates adapted from [frontend-slides](https://github.com/zarazhangrui/frontend-slides) (MIT, see [LICENSE-frontend-slides](LICENSE-frontend-slides)).

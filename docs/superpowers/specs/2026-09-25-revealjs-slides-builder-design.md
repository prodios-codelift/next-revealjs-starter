# reveal.js Slides Builder Starter — Design

Date: 2026-09-25
Status: Draft for review
Scope: sub-project 1 of 2 (this repo only). Sub-project 2 — the prodios-autopilot `presentation` session, parent skill, `setup_presentation_app` / `build_presentation` tools and sandbox snapshot — gets its own spec.

## Goal

Turn `next-revealjs-starter` into the sandbox starter that prodios-autopilot provisions for presentation sessions, the same way `next-shadcn-starter` backs wireframes. A non-interactive builder agent reads an agent-agnostic skill in the repo, receives a brief, and produces either three style previews or a full reveal.js deck that renders in the autopilot artefact iframe.

The design system comes from [frontend-slides](https://github.com/zarazhangrui/frontend-slides) (style presets, bold template pack, density rules, anti-slop aesthetics). Its output target changes from one self-contained HTML file to React/reveal.js code in this Next.js app.

## Decisions (agreed)

| Decision | Choice |
| --- | --- |
| Output shape | One deck per repo (one sandbox per session) |
| Style library | All: 12 presets + 34 bold templates |
| Previews | Next routes in the app, shown in the autopilot iframe |
| Extras | PDF export only (no PPTX conversion, no deploy, no edit mode) |
| Skill location | `.agents/skills/slides/SKILL.md` — plain markdown, no agent-specific features |
| Interaction | Builder never asks the user anything; the autopilot parent session owns all questions |
| Package manager | npm (`package-lock.json`), matching `next-shadcn-starter` and the sandbox's hardcoded `npm install` / `npm run dev` |
| Verification | `agent-browser` skill (same as `next-shadcn-starter`), no Playwright dependency |

## Responsibility split

frontend-slides' `SKILL.md` is interactive (content discovery → previews → user picks → generate). In autopilot the builder runs as a child session to idle and cannot talk to the user, so:

- **Parent (sub-project 2):** gathers content, asks density (speaker-led vs reading-first), triggers a preview build, asks the user to pick via `ask_questions`, triggers a deck build, handles revisions.
- **Builder (this spec):** turns a brief into code. Two modes, `previews` and `deck`, selected by the prompt.

## 1. Builder skill — `.agents/skills/slides/`

```
.agents/skills/slides/
  SKILL.md                  # entry point: input contract, modes, rules, done criteria
  STYLE_PRESETS.md          # copied from frontend-slides, unchanged
  animation-patterns.md     # copied; entrance effects re-expressed as reveal Fragments / .present selectors where they differ
  reveal-template.md        # NEW: file contract + JSX patterns (replaces html-template.md)
  reveal-base.css           # NEW: reference copy of src/deck/reveal-base.css (replaces viewport-base.css)
  design-to-reveal.md       # NEW: how to translate a bold design.md into reveal
  verify-slides.js          # NEW: in-page overflow/overlap check, run via agent-browser eval
  bold-template-pack/
    README.md               # copied; "single HTML file" contract lines rewritten for reveal
    selection-index.json    # copied
    templates/<slug>/preview.md, design.md   # copied (deck-stage.js dropped)
```

### SKILL.md input contract

The builder prompt contains:

- `mode`: `previews` or `deck`
- Brief: title, audience, occasion, mood/vibe (optional), density (`speaker-led` | `reading-first`), slide outline (per slide: heading, key points, notes, image refs)
- `mode: deck` only: `style` — `a`, `b`, or `c` (a preview to promote) plus optional mix notes
- Revisions: a change description, optionally selected elements (same shape as `build_wireframe_app` elements)

### Kept from frontend-slides

Design Aesthetics, Content Density Modes, preview mix rules (1 safe preset, ≥1 bold template, 1 wildcard), bold template selection rules, custom wildcard rules, preview authenticity rules (no internal labels on slides), progressive loading of the bold pack (index → `preview.md` for shortlisted → one `design.md` only after a pick).

### Removed

Phases 0–1 and 2.1 (interaction), Mode C, PPTX conversion, Vercel deploy, single-file/inline-everything rules, `viewport-base.css` inclusion rule, `deck-stage.js`.

### Mapping frontend-slides runtime → reveal

| frontend-slides | reveal.js here |
| --- | --- |
| 1920×1080 stage + JS scaler (`viewport-base.css`, `deck-stage.js`) | `config={{ width: 1920, height: 1080, margin: 0 }}` — reveal scales uniformly and letterboxes |
| `.active` / `.visible` slide switching | reveal's `.present` / `.past` / `.future` |
| `data-anim` / `.reveal` entrance classes | `<Fragment animation="…">`, or keyframes keyed off `section.present` |
| Keyboard/touch/nav dots | reveal `controls`, `progress`, keyboard, touch |
| Speaker notes | `<Slide notes="…">` |
| Fonts via `<link>` | `next/font/google` in `layout.tsx`, exposed as CSS variables |

## 2. Deck runtime contract

- Add `reveal.js` as a dependency (it is the peer of `@revealjs/react`, currently missing).
- `src/app/page.tsx` renders `<Presentation />`.
- `src/deck/presentation.tsx` — `'use client'`. Imports `reveal.js/reveal.css`, `./reveal-base.css`, `./theme.css`. Renders `<Deck className="deck-theme" config={{ width: 1920, height: 1080, margin: 0, hash: true, transition }}>` (transition taken from the chosen style) with one `<Slide>` per outline entry.
- `src/deck/reveal-base.css` — shipped with the starter, never edited by the builder: no-overflow guards on `section`, `prefers-reduced-motion` overrides, resets reveal's default theme typography so `theme.css` starts clean.
- `src/deck/theme.css` — the chosen style, every selector scoped under `.deck-theme`.
- Images in `public/deck/`.
- **Builder write boundary:** `src/deck/**`, `src/app/page.tsx`, `src/app/preview/**`, `src/app/previews/page.tsx`, the font imports in `src/app/layout.tsx`, `public/deck/**`. Nothing else.

The starter ships a minimal placeholder deck (title slide + one content slide) using `reveal-base.css` and a neutral `theme.css`, so a fresh sandbox renders something and `npm run build` passes.

## 3. Previews

`mode: previews` produces:

- `src/app/preview/{a,b,c}/page.tsx` — each a one-slide reveal deck (the user's real title slide) with `className="preview-{a,b,c}"` and its own `preview-{a,b,c}.css`, scoped under that class. Scoping is required because App Router keeps imported CSS loaded across client navigations; unscoped preview styles would bleed into each other.
- `src/app/previews/page.tsx` — a comparison page: three 16:9 `<iframe>`s of `/preview/a|b|c` in a grid, each captioned with the style name. Iframes give exact reveal rendering (reveal scales itself to the frame). Captions are page chrome outside the slides, so the authenticity rule still holds.

The builder's final summary lists, per letter, the style name and source (preset / bold template slug / custom) so the parent can build the `ask_questions` options.

`mode: deck`:

1. Promote `preview-{style}.css` → `src/deck/theme.css`, rewriting the scope class to `.deck-theme`. If the pick was a bold template, now read its full `design.md` and extend the theme to cover section, content, quote, comparison, and closing layouts.
2. Write the full deck in `src/deck/presentation.tsx`.
3. Delete `src/app/preview/`, `src/app/previews/`, and the unused preview CSS.

## 4. autopilot preview bridge

Ported verbatim from `next-shadcn-starter`:

- `src/lib/wireframe-rpc.ts` — `WireframePreviewClientRpc` (channel `prodios:wireframe-preview-rpc`, capabilities `route-navigation`, `element-picker`).
- `src/lib/element-picker.ts`.
- `src/components/wireframe-preview-bridge.tsx`, mounted in `src/app/layout.tsx` **inside `<Suspense>`** (it calls `useSearchParams()`; unwrapped, `next build` fails prerendering `/` and `/_not-found` — verified, this is a latent bug in `next-shadcn-starter`, whose sandbox only ever runs `next dev`).
- `next.config.ts`: `devIndicators: false`, `allowedDevOrigins` from `DEV_ORIGINS`.

With `hash: true`, reveal updates `#/<n>` on every slide change; the bridge already publishes `hashchange`, so the autopilot address bar tracks the current slide and navigating to `/#/5` jumps to it.

### Element picker source mapping (fixed here)

Verified broken in `next-shadcn-starter` (Next 16.3.5, Turbopack, React 19): the picker reads `data-inspector-relative-path/line/column` attributes, falling back to fiber `_debugSource` / `__source`. No attributes are emitted, and React 19 removed `_debugSource`, so every pick yields `sourceFile: null`. autopilot then serialises an empty `source:` and `build_wireframe_app` rejects the element ("Each selected element needs a route and source").

The picker was written for [`@react-dev-inspector/babel-plugin`](https://www.npmjs.com/package/@react-dev-inspector/babel-plugin), which stamps exactly those attributes on JSX but was never wired in. Next 16's Turbopack runs Babel automatically when a Babel config file exists (SWC still does Next's own transforms). Fix, picker code unchanged:

```js
// babel.config.js
module.exports = (api) => ({
  plugins: [
    ['@babel/plugin-syntax-typescript', { isTSX: true }],
    ...(api.env('development') ? ['@react-dev-inspector/babel-plugin'] : []),
  ],
});
```

- devDependencies: `@react-dev-inspector/babel-plugin`, `@babel/plugin-syntax-typescript`.
- The syntax plugin must be present in every env; without it Babel cannot parse TSX and `next build` fails.
- Spike result (throwaway, on a clone of `next-shadcn-starter`): attributes appear on server- and client-rendered elements with correct locations (`src/app/page.tsx:4:6` for the `<h1>` on line 4); production output contains no inspector attributes.
- To verify during implementation: attributes stamped on component JSX (`<Slide>`, `<Fragment>`, `<Deck>`) become props — `Slide` accepts `data-*`, so they should reach its `<section>`; confirm the others don't warn or break.

The same two-line change can be upstreamed to `next-shadcn-starter` (together with the Suspense fix) separately; it is not part of this spec.

## 5. Verification and export

`AGENTS.md` gains a "Before finishing" section mirroring `next-shadcn-starter`: run `npm run typecheck`; for visual changes follow the `agent-browser` skill against `http://localhost:3000`.

The slides skill adds a mandatory check: for each slide, navigate to `/#/<n>` (or `/preview/<x>`), run `verify-slides.js` via `agent-browser eval`, and screenshot. `verify-slides.js` reports, for the present slide, any element whose `scrollHeight`/`scrollWidth` exceeds its box and any pair of sibling panels whose rects intersect. Non-empty report → fix and re-check. This replaces frontend-slides' screenshot-based overflow/overlap check.

PDF export: open `/?print-pdf` with `agent-browser` and save a PDF at 1920×1080 per page. Documented in `SKILL.md` as an on-request step. If `agent-browser` has no PDF command, fall back to a `scripts/export-pdf.mjs` using Playwright as a devDependency — decided during implementation, noted in the plan.

Repo housekeeping: `agent-browser` added via `skills-lock.json` like `next-shadcn-starter`; `typecheck` script added; `bun.lock` replaced by `package-lock.json`.

## 6. Testing

- `npm run typecheck` and `npm run build` pass on the placeholder deck.
- Bridge: the placeholder deck in an iframe on another origin answers `getLocation` and reports hash changes (manual check, or a small harness page).
- Element picker: in `next dev`, picking a heading inside a slide returns `sourceFile: "src/deck/presentation.tsx"` with the correct line; `next build` output has no `data-inspector-*` attributes.
- Dry run of the skill with a sample brief, driven by any agent pointed at `.agents/skills/slides/SKILL.md`:
  - `mode: previews` → three routes render, `/previews` shows all three, no internal labels on slides, `verify-slides.js` clean.
  - `mode: deck` with a bold-template pick → preview files removed, deck renders every slide, `verify-slides.js` clean on every slide.
  - PDF export yields one page per slide.

## Out of scope

prodios-autopilot changes (session type, parent skill, tools, sandbox snapshot, artefact panel wiring); PPTX import; deploy; upstreaming the picker/Suspense fixes to `next-shadcn-starter`; multi-deck support.

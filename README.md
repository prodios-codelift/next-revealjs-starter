# next-revealjs-starter

The sandbox starter behind prodios-autopilot **presentation** sessions: a Next.js app that renders one [reveal.js](https://revealjs.com) deck on a fixed 1920×1080 stage, plus the agent skill that builds those decks.

Autopilot provisions a sandbox from a snapshot of this repo, runs `npm run dev`, and shows the app in its preview iframe. A builder agent follows [`.agents/skills/slides/SKILL.md`](.agents/skills/slides/SKILL.md) to write three style previews, then the full deck, then revisions.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Arrow keys move between slides, and the slide number is kept in the URL hash (`/#/2`).

## Scripts

| Script                        | What it does                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `npm run dev`                 | Development server (the sandbox runs this)                                       |
| `npm run build` / `npm start` | Production build and server                                                      |
| `npm run typecheck`           | `next typegen` + `tsc --noEmit`                                                  |
| `npm run lint`                | ESLint                                                                           |
| `npm run export-pdf`          | Exports the running deck to `public/deck/deck.pdf`, one 1920×1080 page per slide |

`export-pdf` drives the `agent-browser` CLI and attaches `playwright-core` to its browser over CDP. Pass a URL and output path to override the defaults: `node scripts/export-pdf.mjs http://localhost:3000/ out.pdf`.

## Layout

```
src/deck/
  presentation.tsx      the deck (client component, @revealjs/react)
  theme.css             the chosen style, scoped under .reveal.deck-theme
  fonts.ts              next/font fonts for the deck
  reveal-base.css       fixed-stage base; the builder never edits it
src/app/page.tsx        renders the deck
src/app/preview/, src/app/previews/
                        style previews (written by the builder, deleted once a style is picked)
public/deck/            deck images and the exported PDF
.agents/skills/slides/  the builder skill: style presets, bold templates, reveal patterns, verify-slides.js
.agents/skills/agent-browser/
                        browser automation used for visual checks and PDF export
```

## Autopilot preview bridge

`src/components/wireframe-preview-bridge.tsx` (mounted in `src/app/layout.tsx`) connects the app to the autopilot iframe over `postMessage`:

- **Route navigation:** the host can read and set the location. Slide changes are reported as hash changes, and navigating to `/#/<n>` moves the deck to that slide.
- **Element picker:** the host can start a picker. In development, `babel.config.js` stamps `data-inspector-*` attributes on JSX, so a picked element reports its source file and line (for example `src/deck/presentation.tsx:30`). Production builds don't include these attributes.

The sandbox passes `DEV_ORIGINS` (the preview host) to `next dev`; `next.config.ts` turns it into `allowedDevOrigins`.

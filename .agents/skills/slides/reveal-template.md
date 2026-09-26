# reveal.js Deck Template

Reference architecture for slides in this app. Every deck is a fixed 1920×1080 reveal.js stage; reveal scales the whole stage to the window and letterboxes it. Slides never reflow.

## Files You Own

| Path | Purpose |
| --- | --- |
| `src/deck/presentation.tsx` | The deck: one `<Slide>` per slide |
| `src/deck/theme.css` | The chosen style, every selector under `.reveal.deck-theme` |
| `src/deck/fonts.ts` | `next/font/google` fonts, exported as `deckFontVariables` |
| `src/app/page.tsx` | Renders the deck; set `export const metadata = { title: "<deck title>" }` here (the tab title), otherwise leave it |
| `public/deck/` | Images and the exported PDF, referenced as `/deck/<file>` |
| `src/app/preview/{a,b,c}/` | Preview routes (previews mode only) |
| `src/app/previews/page.tsx` | Preview comparison page (previews mode only) |

Never edit `src/deck/reveal-base.css`, `src/app/layout.tsx`, `src/components/`, `src/lib/`, config files, or `package.json`.

## Deck — `src/deck/presentation.tsx`

```tsx
"use client";

import { Deck, Fragment, Slide } from "@revealjs/react";
import "reveal.js/reveal.css";
import "./reveal-base.css";
import "./theme.css";

export function Presentation() {
  return (
    <Deck
      className="deck-theme"
      config={{
        width: 1920,
        height: 1080,
        margin: 0,
        minScale: 0.05,
        maxScale: 4,
        center: false,
        display: "flex",
        hash: true,
        transition: "fade",
      }}
    >
      {/* === TITLE === */}
      <Slide className="slide-title" notes="Opening line for the speaker.">
        <p className="kicker enter">Company · September 2026</p>
        <h1 className="enter">The deck's real title</h1>
        <p className="subtitle enter">One-line promise of the talk</p>
      </Slide>

      {/* === CONTENT === */}
      <Slide className="slide-content">
        <h2>Section heading</h2>
        <ul>
          <Fragment animation="fade-up" as="li">First point</Fragment>
          <Fragment animation="fade-up" as="li">Second point</Fragment>
        </ul>
      </Slide>
    </Deck>
  );
}
```

Rules:

- Keep `width`, `height`, `margin`, `center: false`, `display: "flex"` and `hash: true` exactly as above. `transition` comes from the chosen style.
- One `{/* === NAME === */}` comment per slide.
- Layout classes go on `<Slide className>`; the slide `<section>` is always 1920×1080 with `box-sizing: border-box`, so padding stays inside the stage.
- Slides are flex columns: reveal writes each slide's inline `display` from the deck's `display: "flex"` config, so never set `display` on a slide class (it is overwritten). Use `justify-content`, `align-items` and `gap` on the slide class; for a grid layout, put the grid on one child with `flex: 1`.
- Speaker notes go in `notes`.
- Vertical groups: wrap slides in `<Stack>` only when the outline asks for drill-down slides.
- Images: `<img src="/deck/photo.jpg" alt="…" />` with the file in `public/deck/`. Don't use `next/image` inside slides (reveal scales the stage; `next/image` responsive sizing fights it).
- Code: `<Code language="ts">` with `plugins={[RevealHighlight]}` on `Deck` (`import RevealHighlight from "reveal.js/plugin/highlight"` and `import "reveal.js/plugin/highlight/monokai.css"`), only if the deck shows code.

## Fonts — `src/deck/fonts.ts`

```ts
import { Fraunces, Instrument_Sans } from "next/font/google";

const displayFont = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const deckFontVariables = `${displayFont.variable} ${bodyFont.variable}`;
```

- Use the style's fonts. `next/font/google` export names use underscores for spaces (`Instrument_Sans`, `Space_Grotesk`, `Cormorant_Garamond`).
- A variable font needs no `weight`; a static one needs `weight: ["400", "700"]` etc. If a style names a Fontshare-only font, pick the closest Google font and say so in your summary.
- Keep the export name `deckFontVariables`; `src/app/page.tsx` imports it.
- Run `npm run typecheck` immediately after writing or editing any `fonts.ts`, before opening a page, and fix it until it passes. `next dev` compiles fonts as soon as a page loads, and an invalid family or weight breaks every route — typecheck catches it first (each font's allowed weights are typed).

## Theme — `src/deck/theme.css`

```css
/* ===========================================
   THEME: <style name>
   Every selector is scoped under .reveal.deck-theme.
   =========================================== */

/* Letterbox colour around the stage */
.reveal-viewport:has(.reveal.deck-theme) {
  --stage-bg: #0a0f1c;
}

/* === TOKENS === */
.reveal.deck-theme {
  --bg-primary: #0a0f1c;
  --text-primary: #ffffff;
  --accent: #00ffcc;
  --title-size: 112px;
  --body-size: 28px;
  --slide-padding: 72px;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  color: var(--text-primary);
  font-family: var(--font-body), sans-serif;
  font-size: var(--body-size);
}

/* === SLIDE SURFACE === */
.reveal.deck-theme .slides section {
  background: var(--bg-primary);
  padding: var(--slide-padding);
}

/* === TYPOGRAPHY === */
.reveal.deck-theme h1 {
  font-family: var(--font-display), serif;
  font-size: var(--title-size);
}

/* === LAYOUTS === */
.reveal.deck-theme .slide-title { justify-content: flex-end; }

/* === ANIMATIONS === (see animation-patterns.md) */
```

Rules:

- Every selector starts with `.reveal.deck-theme` (or `.reveal-viewport:has(.reveal.deck-theme)` for `--stage-bg`). Palette blocks written as `:root { … }` in a style reference go on the scope class instead.
- Slide padding is always `padding: var(--slide-padding)` with the value on the scope class: PDF export restores padding from that token (`reveal-base.css`), so a hard-coded slide padding disappears in the PDF.
- All sizes in px at the 1920×1080 design size. No `vw`, `vh`, `clamp()` for slide content, no `@media` breakpoints (the one exception is `prefers-reduced-motion`, already in `reveal-base.css`).
- Never negate CSS functions directly (`-clamp()` is ignored) — use `calc(-1 * …)`.
- Decorative shapes that deliberately run off the slide edge get `data-bleed` on the element so `verify-slides.js` allows them.

## Preview Routes (previews mode)

Each letter is four files, mirroring the deck (`fonts.ts` + client deck component + scoped CSS + server page). For letter `a`:

`src/app/preview/a/fonts.ts` — same shape as `src/deck/fonts.ts`, exporting `deckFontVariables`.

`src/app/preview/a/preview-a.css` — same shape as `theme.css`, with every `.reveal.deck-theme` written as `.reveal.preview-a` (including `.reveal-viewport:has(.reveal.preview-a)` for `--stage-bg`).

`src/app/preview/a/preview-deck.tsx`:

```tsx
"use client";

import { Deck, Slide } from "@revealjs/react";
import "reveal.js/reveal.css";
import "@/deck/reveal-base.css";
import "./preview-a.css";

export function PreviewDeck() {
  return (
    <Deck
      className="preview-a"
      config={{
        width: 1920,
        height: 1080,
        margin: 0,
        center: false,
        display: "flex",
        controls: false,
        progress: false,
        transition: "none",
      }}
    >
      {/* === TITLE === the user's real title slide */}
      <Slide className="slide-title">
        <h1>The deck's real title</h1>
      </Slide>
    </Deck>
  );
}
```

`src/app/preview/a/page.tsx` — a server component, like `src/app/page.tsx`:

```tsx
import { deckFontVariables } from "./fonts";
import { PreviewDeck } from "./preview-deck";

export default function Page() {
  return (
    <div className={`deck-root ${deckFontVariables}`}>
      <PreviewDeck />
    </div>
  );
}
```

Scoping is mandatory: App Router keeps a route's CSS loaded after client navigation, so an unscoped rule from preview A would restyle preview B.

## Comparison Page — `src/app/previews/page.tsx`

```tsx
const PREVIEWS = [
  { letter: "a", name: "Style name A" },
  { letter: "b", name: "Style name B" },
  { letter: "c", name: "Style name C" },
];

export default function PreviewsPage() {
  return (
    <main style={{ minHeight: "100dvh", padding: 32, background: "#0b0b0b", color: "#eee", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 24 }}>
        {PREVIEWS.map(({ letter, name }) => (
          <figure key={letter} style={{ margin: 0 }}>
            <iframe
              src={`/preview/${letter}`}
              title={name}
              style={{ width: "100%", aspectRatio: "16 / 9", border: 0, display: "block" }}
            />
            <figcaption style={{ marginTop: 8, fontSize: 14 }}>
              {letter.toUpperCase()} · {name}
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
```

The captions are page chrome outside the slides, so naming the style there is fine. The slides themselves must never show style, template, or option names.

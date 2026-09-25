# reveal.js Slides Builder Starter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `next-revealjs-starter` into the sandbox starter for prodios-autopilot presentation sessions: a reveal.js deck runtime, the autopilot preview bridge (with working element-picker source mapping), and a non-interactive, agent-agnostic `slides` skill adapted from frontend-slides.

**Architecture:** The deck is a single client component (`src/deck/presentation.tsx`) rendering `@revealjs/react` on a fixed 1920×1080 stage, styled by a scoped `theme.css`. A builder agent follows `.agents/skills/slides/SKILL.md` to write three preview routes or the final deck, then checks every slide with `verify-slides.js` through `agent-browser`. The autopilot iframe talks to the app through the ported `WireframePreviewClientRpc` bridge; a dev-only Babel plugin stamps `data-inspector-*` attributes so picked elements carry their source file and line.

**Tech Stack:** Next.js 16.3.6 (Turbopack, App Router), React 19.2.8, reveal.js 6.0.2, @revealjs/react 0.2.2, Tailwind v4, npm, Node's built-in test runner, `agent-browser` CLI, `playwright-core` (PDF only, over CDP).

**Spec:** `docs/superpowers/specs/2026-09-25-revealjs-slides-builder-design.md`

## Global Constraints

- Package manager is **npm** (`package-lock.json`); `bun.lock` is deleted. The autopilot sandbox runs `npm install` / `npm run dev`.
- Versions pinned: `reveal.js` `6.0.2`, `@revealjs/react` `0.2.2`, `next` `16.3.6`, `react`/`react-dom` `19.2.8`.
- Every deck and preview uses `config={{ width: 1920, height: 1080, margin: 0 }}`; slide content is authored in px at 1920×1080. No `vw`/`vh`, no responsive breakpoints inside slides.
- Theme CSS is always scoped: the deck under `.reveal.deck-theme`, previews under `.reveal.preview-a|b|c`.
- The CSS class name `reveal` belongs to reveal.js. Entrance-animation classes from frontend-slides are renamed (`.enter`), never `.reveal`.
- The builder never asks the user questions (it runs as a non-interactive child session).
- Builder write boundary: `src/deck/**`, `src/app/page.tsx`, `src/app/preview/**`, `src/app/previews/page.tsx`, `public/deck/**`.
- No slide may render internal workflow text: `preview`, `template`, `preset`, `style option`, `Option A/B/C`, `wildcard`, `custom`, file names, paths, or template/slug names.
- Next.js here has breaking changes vs. training data: read `node_modules/next/dist/docs/` before writing Next-specific code (repo `AGENTS.md`).
- Do not commit the `<!-- BEGIN:nextjs-agent-rules -->` block removal; `next dev` re-adds it.

## Deviations from the spec (decided while planning, with evidence)

1. **Fonts live in `src/deck/fonts.ts`** (and `src/app/preview/<x>/fonts.ts`), applied by the page, instead of `layout.tsx`. Three previews need three font sets; keeping fonts next to the deck keeps the builder out of `layout.tsx` entirely.
2. **Bridge is adapted, not verbatim.** reveal.js writes the slide hash with a throttled `history.replaceState` (verified in `reveal.js/dist/reveal.mjs`), which fires no `hashchange`, so the verbatim bridge never reports slide changes. The bridge also publishes after `pushState`/`replaceState`, and `navigate` to a hash on the current page sets `location.hash` (so reveal's `hashchange` listener moves the slide) instead of `router.push`.
3. **PDF export uses `playwright-core` over agent-browser's CDP session.** Verified: `agent-browser pdf` ignores CSS `@page` size and always emits Letter pages; `page.pdf({ preferCSSPageSize: true })` over `connectOverCDP` produced 1440×810 pt (= 1920×1080 px) pages. `playwright-core` is a devDependency; no extra browser download.
4. **No `reveal-base.css` copy inside the skill.** The skill points at `src/deck/reveal-base.css` so the two can't drift.
5. **`typecheck` is `next typegen && tsc --noEmit`** — `layout.tsx` uses the generated global `LayoutProps`, which plain `tsc` can't see on a clean checkout.
6. **The element picker's path marker** changes from `next-shadcn-starter/` to `next-revealjs-starter/` (fallback path normalisation only).

## Review Focus

1. **Navigating the iframe to `/` while on a later slide** — expect reveal to return to slide 0 (a bare `/` has an empty hash, which reveal ignores). Pinned in Task 3 (`navigate to "/" returns to the first slide`).
2. **Rapid slide changes (holding an arrow key)** — expect the address bar to settle on the final slide, not a stale one, because reveal defers throttled hash writes. Pinned in Task 3 (`publishes the final hash after rapid slide changes`).
3. **Fragments that are hidden until stepped** — expect overflow in not-yet-shown fragments to be reported, not skipped because they're `visibility: hidden`. Pinned in Task 5 (`reports overflow inside hidden fragments`).
4. **Intentional decorative bleed** (shapes deliberately off-canvas) — expect `data-bleed` to exempt it so the builder isn't pushed to remove the design. Pinned in Task 5 (`allows elements marked data-bleed`).
5. **Picking an element on a component-rendered node** (`<Slide>` renders `<section>` from `@revealjs/react`) — expect a source in `src/deck/presentation.tsx`, not `null` or a `node_modules` path. Pinned in Task 4 (`picked slide element carries its source location`).

## File Map

| File | Responsibility | Task |
| --- | --- | --- |
| `package.json`, `package-lock.json` (new), `bun.lock` (deleted) | npm, deps, scripts | 1 |
| `next.config.ts` | `devIndicators`, `allowedDevOrigins` from `DEV_ORIGINS` | 1 |
| `AGENTS.md` | before-finishing rules, tests, slides pointer | 1, 7 |
| `skills-lock.json`, `.agents/skills/agent-browser/SKILL.md` | agent-browser skill (same as next-shadcn-starter) | 1 |
| `tests/helpers.mjs`, `tests/static-server.mjs` | agent-browser + static server helpers for tests | 2, 3 |
| `src/deck/presentation.tsx` | the deck (client component) | 2 |
| `src/deck/reveal-base.css` | fixed-stage base; never edited by the builder | 2 |
| `src/deck/theme.css`, `src/deck/fonts.ts` | placeholder theme and fonts; replaced by the builder | 2 |
| `src/app/page.tsx` | renders the deck with font variables | 2 |
| `tests/deck.test.mjs` | deck runtime tests | 2 |
| `src/lib/wireframe-rpc.ts`, `src/lib/element-picker.ts` | RPC client + picker (ported) | 3 |
| `src/components/wireframe-preview-bridge.tsx` | bridge (ported + reveal adaptations) | 3 |
| `src/app/layout.tsx` | mounts the bridge inside `<Suspense>` | 3 |
| `tests/fixtures/bridge-host.html`, `tests/bridge.test.mjs` | cross-origin host harness + bridge tests | 3 |
| `babel.config.js`, `tests/picker.test.mjs` | inspector source mapping + tests | 4 |
| `.agents/skills/slides/verify-slides.js`, `tests/fixtures/verify-deck.html`, `tests/verify.test.mjs` | slide checker + tests | 5 |
| `scripts/export-pdf.mjs`, `tests/pdf.test.mjs` | PDF export + test | 6 |
| `.agents/skills/slides/**` (docs, copied pack), `tests/skill.test.mjs` | the builder skill + static checks | 7 |

## Before Task 1

- [ ] Create the branch (the repo is on `main`):

```bash
git checkout -b feat/slides-builder
```

- [ ] Make `agent-browser` available for tests. Either install it globally (`npm i -g agent-browser && agent-browser install`) or point the tests at an existing binary and browser:

```bash
export AGENT_BROWSER_BIN=/path/to/node_modules/.bin/agent-browser
export AGENT_BROWSER_EXECUTABLE_PATH=$HOME/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
```

- [ ] Keep a clone of next-shadcn-starter for porting (Tasks 1 and 3):

```bash
git clone --depth 1 https://github.com/prodios-codelift/next-shadcn-starter "$SCRATCH/nss"
```

`$SCRATCH` is any scratch directory outside the repo. Source skill lives at `/home/harish/work/test/frontend-slides` (referred to as `$FS`).

---

### Task 1: npm, dependencies, config, agent-browser skill

**Files:**
- Modify: `package.json`
- Delete: `bun.lock`
- Create: `package-lock.json` (generated)
- Modify: `next.config.ts`
- Modify: `AGENTS.md`
- Create: `skills-lock.json`, `.agents/skills/agent-browser/SKILL.md`

**Interfaces:**
- Produces: scripts `typecheck` (`next typegen && tsc --noEmit`), `test` (`node --test --test-concurrency=1 "tests/**/*.test.mjs"` — test files share one agent-browser session, so they must not run in parallel); dependency `reveal.js@6.0.2`.

- [ ] **Step 1: Replace `package.json`**

The working tree already adds `@revealjs/react`. Drop the bun-only fields (`packageManager`, `ignoreScripts`, `trustedDependencies`).

```json
{
  "name": "next-revealjs-starter",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "next typegen && tsc --noEmit",
    "test": "node --test --test-concurrency=1 \"tests/**/*.test.mjs\""
  },
  "dependencies": {
    "@revealjs/react": "0.2.2",
    "next": "16.3.6",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "reveal.js": "6.0.2"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.3.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

- [ ] **Step 2: Switch the lockfile**

```bash
rm bun.lock
rm -rf node_modules
npm install
```

Expected: `package-lock.json` created, no `ERESOLVE` errors.

- [ ] **Step 3: Replace `next.config.ts`** (same as next-shadcn-starter; the sandbox sets `DEV_ORIGINS` to the preview host)

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins:
    typeof process.env.DEV_ORIGINS === "string"
      ? process.env.DEV_ORIGINS.split(",")
      : undefined,
};

export default nextConfig;
```

- [ ] **Step 4: Copy the agent-browser skill and lock**

```bash
mkdir -p .agents/skills/agent-browser
cp "$SCRATCH/nss/.agents/skills/agent-browser/SKILL.md" .agents/skills/agent-browser/SKILL.md
cp "$SCRATCH/nss/skills-lock.json" skills-lock.json
```

- [ ] **Step 5: Append to `AGENTS.md`** (after the existing `<!-- END:nextjs-agent-rules -->` line; leave that block untouched)

```markdown

# Before finishing a task

Run `npm run typecheck` and fix any TypeScript errors before considering the task complete. Do not finish with a failing typecheck.

When a UI change needs visual verification, follow [.agents/skills/agent-browser/SKILL.md](.agents/skills/agent-browser/SKILL.md) to screenshot and inspect the result before finishing. Assume the app is already running at `http://localhost:3000`. Skip this when the task does not change user-visible UI.

# Tests

`npm test` drives a real browser through the `agent-browser` CLI and expects the app running at `http://localhost:3000` (override with `APP_URL`). Set `AGENT_BROWSER_BIN` if `agent-browser` is not on `PATH`.
```

- [ ] **Step 6: Verify**

Run: `npm run typecheck && npm run build`
Expected: both exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json bun.lock next.config.ts AGENTS.md skills-lock.json .agents/skills/agent-browser src/app/page.tsx
git commit -m "chore: switch to npm, add reveal.js and sandbox dev config"
```

---

### Task 2: Placeholder deck on a fixed 1920×1080 stage

**Files:**
- Create: `tests/helpers.mjs`, `tests/deck.test.mjs`
- Create: `src/deck/presentation.tsx`, `src/deck/reveal-base.css`, `src/deck/theme.css`, `src/deck/fonts.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `reveal.js@6.0.2`, `@revealjs/react` (`Deck`, `Slide`).
- Produces:
  - `export function Presentation(): JSX.Element` from `src/deck/presentation.tsx`.
  - `export const deckFontVariables: string` from `src/deck/fonts.ts` (defines CSS vars `--font-display`, `--font-body`).
  - Class hooks: `.deck-root` (page wrapper), `.reveal.deck-theme` (theme scope), `--stage-bg` (letterbox colour).
  - The placeholder deck has **3 slides** (later tests rely on indices 0–2).
  - Test helpers: `APP_URL`, `ab(...args): string`, `evaluate(js): unknown`, `waitFor(check, timeoutMs?): Promise<void>`, `openDeck(url): Promise<void>`.

- [ ] **Step 1: Write the test helpers** — `tests/helpers.mjs`

```js
import { execFileSync } from 'node:child_process';

export const APP_URL = process.env.APP_URL ?? 'http://localhost:3000';

const AGENT_BROWSER = process.env.AGENT_BROWSER_BIN ?? 'agent-browser';

/** Runs an agent-browser command and returns its trimmed stdout. */
export function ab(...args) {
  return execFileSync(AGENT_BROWSER, args, { encoding: 'utf8' }).trim();
}

/** Evaluates JavaScript in the current page. Promises are awaited. */
export function evaluate(js) {
  const output = JSON.parse(ab('eval', js, '--json'));
  if (!output.success) throw new Error(output.error ?? 'eval failed');
  return output.data.result;
}

export async function waitFor(check, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

/** Opens a page with a reveal deck and waits until reveal has initialised. */
export async function openDeck(url) {
  ab('open', url);
  await waitFor(() => evaluate("document.querySelector('.reveal.ready') !== null"));
}
```

- [ ] **Step 2: Write the failing deck tests** — `tests/deck.test.mjs`

```js
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { APP_URL, ab, evaluate, openDeck } from './helpers.mjs';

before(async () => {
  ab('set', 'viewport', '1600', '1200');
  await openDeck(`${APP_URL}/`);
});

test('renders the placeholder deck on a fixed 1920×1080 stage', () => {
  const stage = evaluate(`(() => {
    const slides = document.querySelector('.reveal .slides');
    return {
      width: slides.offsetWidth,
      height: slides.offsetHeight,
      count: document.querySelectorAll('.reveal .slides > section').length,
      themed: document.querySelector('.reveal.deck-theme') !== null,
    };
  })()`);
  assert.deepEqual(stage, { width: 1920, height: 1080, count: 3, themed: true });
});

test('letterboxes instead of reflowing on a 4:3 viewport', () => {
  const box = evaluate(`(() => {
    const r = document.querySelector('.reveal .slides > section.present').getBoundingClientRect();
    return { ratio: r.width / r.height, fits: r.width <= innerWidth + 1 && r.height <= innerHeight + 1 };
  })()`);
  assert.ok(Math.abs(box.ratio - 16 / 9) < 0.01, `ratio was ${box.ratio}`);
  assert.ok(box.fits);
});

test('fills the letterbox with the theme stage colour', () => {
  const bg = evaluate("getComputedStyle(document.querySelector('.reveal-viewport')).backgroundColor");
  assert.equal(bg, 'rgb(17, 17, 17)');
});

test('opens the slide named in the URL hash', async () => {
  await openDeck(`${APP_URL}/#/2`);
  const index = evaluate(
    "[...document.querySelectorAll('.reveal .slides > section')].findIndex((s) => s.classList.contains('present'))",
  );
  assert.equal(index, 2);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Start the app in another terminal: `npm run dev`
Run: `node --test tests/deck.test.mjs`
Expected: FAIL — `waitFor timed out` (no `.reveal.ready` on the current `<div>Home</div>` page).

- [ ] **Step 4: Create `src/deck/reveal-base.css`**

```css
/* ===========================================
   FIXED 16:9 STAGE — reveal.js base
   Shipped with the starter. The slides skill never edits this file;
   the chosen style lives in theme.css.
   Slides are authored at 1920×1080 and reveal scales the whole stage.
   =========================================== */

/* 1. Full-window deck, letterboxed in the theme's stage colour */
.deck-root {
  height: 100dvh;
}

.reveal-viewport {
  background: var(--stage-bg, #000);
}

/* 2. Slides fill the fixed stage exactly; theme padding stays inside it */
.reveal .slides {
  text-align: left;
}

.reveal .slides section {
  box-sizing: border-box;
  height: 100%;
  padding: 0;
  overflow: hidden;
}

/* 3. Keep media inside authored slide bounds */
.reveal img,
.reveal video,
.reveal canvas,
.reveal svg {
  max-width: 100%;
  max-height: 100%;
}

/* 4. Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .reveal *,
  .reveal *::before,
  .reveal *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 5: Create `src/deck/theme.css`** (placeholder; the builder replaces it)

```css
/* ===========================================
   PLACEHOLDER THEME
   Replaced by the slides skill with the chosen style.
   Every selector is scoped under .reveal.deck-theme.
   =========================================== */

.reveal-viewport:has(.reveal.deck-theme) {
  --stage-bg: #111111;
}

.reveal.deck-theme {
  --bg: #f4f1ea;
  --ink: #1c1b19;
  --muted: #6b6760;
  --accent: #c2410c;
  color: var(--ink);
  font-family: var(--font-body), sans-serif;
  font-size: 32px;
}

.reveal.deck-theme .slides section {
  background: var(--bg);
  padding: 120px 144px;
}

.reveal.deck-theme h1,
.reveal.deck-theme h2 {
  font-family: var(--font-display), serif;
  font-weight: 600;
  line-height: 1;
  margin: 0 0 40px;
}

.reveal.deck-theme h1 {
  font-size: 144px;
}

.reveal.deck-theme h2 {
  font-size: 88px;
}

.reveal.deck-theme .slide-title {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.reveal.deck-theme .subtitle {
  color: var(--muted);
  font-size: 40px;
}

.reveal.deck-theme .rule {
  width: 160px;
  height: 8px;
  background: var(--accent);
  margin-bottom: 48px;
}
```

- [ ] **Step 6: Create `src/deck/fonts.ts`**

```ts
import { Fraunces, Instrument_Sans } from "next/font/google";

const displayFont = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const bodyFont = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const deckFontVariables = `${displayFont.variable} ${bodyFont.variable}`;
```

- [ ] **Step 7: Create `src/deck/presentation.tsx`**

```tsx
"use client";

import { Deck, Slide } from "@revealjs/react";
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
        hash: true,
        transition: "fade",
      }}
    >
      <Slide className="slide-title">
        <div className="rule" />
        <h1>Presentation title</h1>
        <p className="subtitle">A placeholder deck. The slides skill replaces it.</p>
      </Slide>
      <Slide>
        <h2>Second slide</h2>
        <p>Placeholder content.</p>
      </Slide>
      <Slide>
        <h2>Third slide</h2>
        <p>Placeholder content.</p>
      </Slide>
    </Deck>
  );
}
```

- [ ] **Step 8: Replace `src/app/page.tsx`**

```tsx
import { deckFontVariables } from "@/deck/fonts";
import { Presentation } from "@/deck/presentation";

export default function Home() {
  return (
    <div className={`deck-root ${deckFontVariables}`}>
      <Presentation />
    </div>
  );
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `node --test tests/deck.test.mjs`
Expected: 4 passing. If `fills the letterbox…` fails, run `evaluate("document.querySelector('.reveal-viewport')?.tagName")` to see which element reveal made the viewport, and fix the `.reveal-viewport:has(...)` selector in `theme.css` — don't change the test's expected colour.

- [ ] **Step 10: Typecheck, build, commit**

Run: `npm run typecheck && npm run build`
Expected: exit 0.

```bash
git add tests/helpers.mjs tests/deck.test.mjs src/deck src/app/page.tsx
git commit -m "feat: render a placeholder reveal.js deck on a fixed 1920x1080 stage"
```

---

### Task 3: autopilot preview bridge

**Files:**
- Create: `src/lib/wireframe-rpc.ts`, `src/lib/element-picker.ts` (ported)
- Create: `src/components/wireframe-preview-bridge.tsx` (ported + adapted)
- Modify: `src/app/layout.tsx`
- Create: `tests/static-server.mjs`, `tests/fixtures/bridge-host.html`, `tests/bridge.test.mjs`

**Interfaces:**
- Consumes: placeholder deck with 3 slides (Task 2), `openDeck`, `evaluate`, `ab`, `waitFor` (Task 2).
- Produces:
  - `serveStatic(root: string, port: number): Promise<http.Server>` from `tests/static-server.mjs` (serves the repo root, so fixtures can load `/node_modules/...`).
  - Host harness globals in `bridge-host.html`: `window.rpcLog: object[]`, `window.rpc(method, params?): Promise<{ id, result?, error? }>`, `window.lastLocation(): string | undefined`, `window.connected(): boolean`.
  - Added to `tests/helpers.mjs` for reuse in Task 4: `HOST_PORT: number` (4173), `openHost(): Promise<void>`, `pressInPreview(key: string): void`.

- [ ] **Step 1: Write the static server** — `tests/static-server.mjs`

```js
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
};

/** Serves files under root. Used for cross-origin host and fixture pages. */
export function serveStatic(root, port) {
  const server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = normalize(join(root, pathname));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}
```

- [ ] **Step 2: Write the host harness** — `tests/fixtures/bridge-host.html`

It plays the autopilot client's role: waits for `ready`, hands over a `MessagePort`, sends RPC requests and logs every message.

```html
<!doctype html>
<meta charset="utf-8" />
<title>Bridge host</title>
<style>
  body { margin: 0; }
  iframe { border: 0; width: 1280px; height: 720px; }
</style>
<iframe id="preview"></iframe>
<script>
  const CHANNEL = 'prodios:wireframe-preview-rpc';
  const target = new URLSearchParams(location.search).get('app');
  const iframe = document.getElementById('preview');
  const pending = new Map();
  let port = null;
  let nextId = 0;

  window.rpcLog = [];

  window.addEventListener('message', (event) => {
    if (event.source !== iframe.contentWindow) return;
    if (event.data?.channel !== CHANNEL || event.data.type !== 'ready') return;
    window.rpcLog.push({ ready: event.data.capabilities });
    const channel = new MessageChannel();
    port = channel.port1;
    port.onmessage = ({ data }) => {
      window.rpcLog.push(data);
      if (data.type === 'response' && pending.has(data.id)) {
        pending.get(data.id)(data);
        pending.delete(data.id);
      }
    };
    iframe.contentWindow.postMessage(
      { channel: CHANNEL, type: 'connect', version: 1 },
      new URL(target).origin,
      [channel.port2],
    );
  });

  window.connected = () => port !== null;
  window.rpc = (method, params) =>
    new Promise((resolve) => {
      const id = String(++nextId);
      pending.set(id, resolve);
      port.postMessage({ type: 'request', id, method, params });
    });
  window.lastLocation = () =>
    [...window.rpcLog].reverse().find((m) => m.event === 'locationChanged')?.location;

  iframe.src = target;
</script>
```

- [ ] **Step 3: Add the host helpers to `tests/helpers.mjs`** (append)

```js
export const HOST_PORT = Number(process.env.HOST_PORT ?? 4173);

/** Opens the cross-origin host harness with the app in its iframe and waits for the RPC connection. */
export async function openHost() {
  const app = encodeURIComponent(`${APP_URL}/`);
  ab('open', `http://localhost:${HOST_PORT}/tests/fixtures/bridge-host.html?app=${app}`);
  await waitFor(() => evaluate('window.connected()'), 20_000);
}

/** Clicks into the iframe so keyboard input reaches the deck, then presses a key. */
export function pressInPreview(key) {
  ab('click', '#preview');
  ab('press', key);
}
```

- [ ] **Step 4: Write the failing bridge tests** — `tests/bridge.test.mjs`

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { HOST_PORT, evaluate, openHost, pressInPreview, waitFor } from './helpers.mjs';
import { serveStatic } from './static-server.mjs';

let server;

before(async () => {
  server = await serveStatic(process.cwd(), HOST_PORT);
  await openHost();
});

after(() => server.close());

const navigate = (location) => evaluate(`window.rpc('navigate', { location: ${JSON.stringify(location)} })`);
const waitForLocation = (location) => waitFor(() => evaluate('window.lastLocation()') === location);

test('announces both capabilities', () => {
  const ready = evaluate('window.rpcLog.find((m) => m.ready).ready');
  assert.deepEqual(ready, ['route-navigation', 'element-picker']);
});

test('reports the initial location', () => {
  const response = evaluate("window.rpc('getLocation')");
  // reveal may already have written '#/' for the first slide.
  assert.ok(['/', '/#/'].includes(response.result), `got ${response.result}`);
});

test('navigating to a slide hash moves the deck', async () => {
  const response = navigate('/#/1');
  assert.equal(response.error, undefined);
  await waitForLocation('/#/1');
  pressInPreview('ArrowRight');
  // Only true if reveal really was on slide 1.
  await waitForLocation('/#/2');
});

test('keyboard slide changes inside the deck are published', async () => {
  navigate('/#/0');
  pressInPreview('ArrowRight');
  await waitForLocation('/#/1');
});

test('navigate to "/" returns to the first slide', async () => {
  navigate('/#/2');
  await waitForLocation('/#/2');
  navigate('/');
  pressInPreview('ArrowRight');
  await waitForLocation('/#/1');
});

test('publishes the final hash after rapid slide changes', async () => {
  navigate('/#/0');
  pressInPreview('ArrowRight');
  pressInPreview('ArrowRight');
  // reveal throttles hash writes; the last published location must still be the final slide.
  await waitForLocation('/#/2');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(evaluate('window.lastLocation()'), '/#/2');
});

test('rejects protocol-relative locations', () => {
  const response = navigate('//evil.example/');
  assert.equal(response.error, 'Invalid preview location');
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `node --test tests/bridge.test.mjs`
Expected: FAIL — `waitFor timed out after 20000ms` in `before` (no bridge, so no `ready` message).

- [ ] **Step 6: Port the RPC client and picker**

```bash
cp "$SCRATCH/nss/src/lib/wireframe-rpc.ts" src/lib/wireframe-rpc.ts
cp "$SCRATCH/nss/src/lib/element-picker.ts" src/lib/element-picker.ts
```

Then in `src/lib/element-picker.ts`, inside `normalizeSourceFile`, change the marker:

```ts
  const marker = 'next-revealjs-starter/';
```

Leave the rest of both files verbatim (they keep next-shadcn-starter's single-quote / semicolon style; don't reformat).

- [ ] **Step 7: Write the adapted bridge** — `src/components/wireframe-preview-bridge.tsx`

Differences from next-shadcn-starter's file are the `navigate` handler and the `publishHistoryWrites` effect; everything else is the same.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { WireframePreviewClientRpc } from '@/lib/wireframe-rpc';

export function WireframePreviewBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rpcRef = useRef<WireframePreviewClientRpc>(null);

  useEffect(
    function connectWireframePreviewRpc() {
      const rpc = new WireframePreviewClientRpc({
        getLocation: currentLocation,
        navigate: (location) => {
          // reveal.js moves slides on `hashchange`, which router.push does not fire.
          const target = new URL(location, window.location.href);
          if (
            target.pathname === window.location.pathname &&
            target.search === window.location.search
          ) {
            window.location.hash = target.hash || '#/';
            return;
          }
          router.push(location);
        },
        back: () => router.back(),
        forward: () => router.forward(),
      });

      rpcRef.current = rpc;
      rpc.start();

      return () => {
        rpc.stop();
        if (rpcRef.current === rpc) rpcRef.current = null;
      };
    },
    [router]
  );

  useEffect(
    function publishRouteChange() {
      rpcRef.current?.notifyLocationChanged(currentLocation());
    },
    [pathname, searchParams]
  );

  useEffect(function publishHashChanges() {
    function handleHashChange() {
      rpcRef.current?.notifyLocationChanged(currentLocation());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(function publishHistoryWrites() {
    // reveal.js writes the slide hash with (throttled) history.replaceState,
    // which fires no event; publish after every history write instead.
    const { pushState, replaceState } = window.history;
    const notify = () => rpcRef.current?.notifyLocationChanged(currentLocation());

    window.history.pushState = function (...args: Parameters<History['pushState']>) {
      pushState.apply(this, args);
      notify();
    };
    window.history.replaceState = function (...args: Parameters<History['replaceState']>) {
      replaceState.apply(this, args);
      notify();
    };

    return () => {
      window.history.pushState = pushState;
      window.history.replaceState = replaceState;
    };
  }, []);

  return null;
}

function currentLocation() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}
```

- [ ] **Step 8: Mount the bridge in `src/app/layout.tsx` inside `<Suspense>`**

`useSearchParams()` without a Suspense boundary fails `next build` while prerendering `/` and `/_not-found` (verified on next-shadcn-starter). Add the imports and render the bridge after `<body>`, as next-shadcn-starter does:

```tsx
import { Suspense } from "react";
import { WireframePreviewBridge } from "@/components/wireframe-preview-bridge";
```

```tsx
      <body className="min-h-full flex flex-col">{children}</body>
      <Suspense>
        <WireframePreviewBridge />
      </Suspense>
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `node --test tests/bridge.test.mjs`
Expected: 7 passing. If `pressInPreview` doesn't reach the deck (key tests time out while the `navigate` test's first wait passes), check `ab('click', '#preview')` focused the iframe: `evaluate("document.activeElement.id")` should be `preview`.

- [ ] **Step 10: Re-run the deck tests, typecheck, build**

Run: `node --test tests/deck.test.mjs && npm run typecheck && npm run build`
Expected: all pass; build prerenders `/` without the `useSearchParams() should be wrapped in a suspense boundary` error.

- [ ] **Step 11: Commit**

```bash
git add src/lib src/components src/app/layout.tsx tests/static-server.mjs tests/fixtures/bridge-host.html tests/bridge.test.mjs tests/helpers.mjs
git commit -m "feat: add the autopilot preview bridge with reveal.js hash sync"
```

---

### Task 4: Element picker source mapping

**Files:**
- Create: `babel.config.js`
- Modify: `package.json` (devDependencies)
- Create: `tests/picker.test.mjs`

**Interfaces:**
- Consumes: `openHost`, `pressInPreview`, `evaluate`, `ab`, `waitFor`, `APP_URL`, `openDeck`, `serveStatic`, `HOST_PORT` (Tasks 2–3).
- Produces: in development, every JSX host element carries `data-inspector-relative-path`, `data-inspector-line`, `data-inspector-column`; none in production builds.

- [ ] **Step 1: Write the failing picker tests** — `tests/picker.test.mjs`

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_URL, HOST_PORT, ab, evaluate, openDeck, openHost, waitFor } from './helpers.mjs';
import { serveStatic } from './static-server.mjs';

const SOURCE = 'src/deck/presentation.tsx';
const lineOf = (needle) => readFileSync(SOURCE, 'utf8').split('\n').findIndex((l) => l.includes(needle)) + 1;

let server;

before(async () => {
  server = await serveStatic(process.cwd(), HOST_PORT);
});

after(() => server.close());

test('stamps slide elements with their source location', async () => {
  await openDeck(`${APP_URL}/`);
  const data = evaluate(
    "({ ...document.querySelector('.reveal .slides section.present h1').closest('[data-inspector-relative-path]').dataset })",
  );
  assert.equal(data.inspectorRelativePath, SOURCE);
  assert.equal(Number(data.inspectorLine), lineOf('<h1>'));
});

test('reaches the section rendered by <Slide>', () => {
  const path = evaluate(
    "document.querySelector('.reveal .slides > section.present').getAttribute('data-inspector-relative-path')",
  );
  assert.equal(path, SOURCE);
});

test('emits no React unknown-prop warnings', () => {
  assert.doesNotMatch(ab('console'), /does not recognize|Invalid DOM property|Unknown prop/i);
});

test('picked slide element carries its source location', async () => {
  await openHost();
  evaluate("window.rpc('navigate', { location: '/#/0' })");
  evaluate("window.rpc('startElementPicker')");
  ab('click', '#preview');
  await waitFor(() => evaluate("window.rpcLog.some((m) => m.event === 'elementPicked')"));
  const element = evaluate("window.rpcLog.find((m) => m.event === 'elementPicked').element");
  assert.equal(element.sourceFile, SOURCE);
  assert.ok(element.sourceLine > 0);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/picker.test.mjs`
Expected: FAIL — `Cannot read properties of null (reading 'dataset')` in the first test; `sourceFile` is `null` in the last.

- [ ] **Step 3: Install the plugins**

```bash
npm install --save-dev @react-dev-inspector/babel-plugin@2.0.1 @babel/plugin-syntax-typescript
```

- [ ] **Step 4: Create `babel.config.js`**

Next 16's Turbopack runs Babel automatically when this file exists (`node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md`, "Babel"); SWC still does Next's own transforms. The syntax plugin must be present in every environment — without it Babel can't parse TSX and `next build` fails.

```js
// Dev-only: stamps data-inspector-* source locations on JSX so the autopilot
// element picker (src/lib/element-picker.ts) can report where a picked element lives.
module.exports = (api) => ({
  plugins: [
    ["@babel/plugin-syntax-typescript", { isTSX: true }],
    ...(api.env("development") ? ["@react-dev-inspector/babel-plugin"] : []),
  ],
});
```

- [ ] **Step 5: Restart the dev server and run the tests**

Stop `npm run dev`, `rm -rf .next`, start it again (Babel config is read at startup).
Run: `node --test tests/picker.test.mjs`
Expected: 4 passing. If `emits no React unknown-prop warnings` fails, the plugin is stamping attributes onto a component that forwards them to the DOM as an invalid prop; read the warning, and exclude that component with the plugin's `excludes` option rather than dropping the test.

- [ ] **Step 6: Verify production output has no inspector attributes**

```bash
npm run build
npx next start -p 3100 &
sleep 3
curl -s http://localhost:3100/ | grep -c 'data-inspector' || true
kill %1
```

Expected: `0`.

- [ ] **Step 7: Re-run all tests, typecheck, commit**

Run: `npm test && npm run typecheck`
Expected: all pass.

```bash
git add babel.config.js package.json package-lock.json tests/picker.test.mjs
git commit -m "feat: stamp JSX source locations for the element picker in dev"
```

---

### Task 5: `verify-slides.js` — overflow, bleed and overlap checker

**Files:**
- Create: `.agents/skills/slides/verify-slides.js`
- Create: `tests/fixtures/verify-deck.html`, `tests/verify.test.mjs`

**Interfaces:**
- Consumes: `serveStatic`, `evaluate`, `openDeck`, `APP_URL` (Tasks 2–3); `src/deck/reveal-base.css` (Task 2).
- Produces: `verify-slides.js` is a single expression (async IIFE). Evaluated in a page with a reveal deck, it resolves to `{ slides: number, issues: Array<{ slide: string, type: 'missing' | 'clipped' | 'out-of-bounds' | 'overlap', element: string, detail: string }> }` and restores the page's original hash. Exemptions: `[data-bleed]` (out-of-bounds only), `[data-verify-ignore]` (all checks). Skill usage: `agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"`.

- [ ] **Step 1: Write the fixture deck** — `tests/fixtures/verify-deck.html`

```html
<!doctype html>
<meta charset="utf-8" />
<title>verify-slides fixture</title>
<link rel="stylesheet" href="/node_modules/reveal.js/dist/reveal.css" />
<link rel="stylesheet" href="/src/deck/reveal-base.css" />
<style>
  .reveal .slides section { padding: 80px; font: 40px/1.2 sans-serif; }
  .box { width: 400px; height: 100px; overflow: hidden; }
  .grid { display: grid; grid-template-columns: 600px 600px; }
</style>
<div class="deck-root">
  <div class="reveal"><div class="slides" id="slides"></div></div>
</div>
<script src="/node_modules/reveal.js/dist/reveal.js"></script>
<script>
  const CASES = {
    clean: `
      <section><h1>Fits</h1><p>Short line.</p></section>
      <section><div class="grid"><div>Left</div><div>Right</div></div></section>`,
    clipped: `<section><div class="box">${'Too much text for this box. '.repeat(20)}</div></section>`,
    'out-of-bounds': `<section><div style="width: 2400px">Wider than the stage</div></section>`,
    overlap: `<section><div class="grid"><div>Left</div><div style="margin-left: -200px">Right</div></div></section>`,
    fragment: `<section><h1>Title</h1><div class="fragment" style="width: 2400px">Hidden until stepped</div></section>`,
    bleed: `<section><div data-bleed style="width: 2400px">Intentional bleed</div></section>`,
    vertical: `<section><section><p>Top</p></section><section><div style="width: 2400px">Below</div></section></section>`,
  };
  document.getElementById('slides').innerHTML = CASES[new URLSearchParams(location.search).get('case')];
  Reveal.initialize({ width: 1920, height: 1080, margin: 0, hash: true, center: false, transition: 'slide' });
</script>
```

- [ ] **Step 2: Write the failing tests** — `tests/verify.test.mjs`

```js
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { APP_URL, evaluate, openDeck } from './helpers.mjs';
import { serveStatic } from './static-server.mjs';

const FIXTURE_PORT = 4174;
let server;

before(async () => {
  server = await serveStatic(process.cwd(), FIXTURE_PORT);
});

after(() => server.close());

async function verify(caseName) {
  await openDeck(`http://localhost:${FIXTURE_PORT}/tests/fixtures/verify-deck.html?case=${caseName}`);
  return evaluate(readFileSync('.agents/skills/slides/verify-slides.js', 'utf8'));
}

const types = (report) => report.issues.map((issue) => issue.type);

test('passes a deck that fits', async () => {
  const report = await verify('clean');
  assert.equal(report.slides, 2);
  assert.deepEqual(report.issues, []);
});

test('reports clipped text', async () => {
  assert.ok(types(await verify('clipped')).includes('clipped'));
});

test('reports content past the slide edge', async () => {
  assert.ok(types(await verify('out-of-bounds')).includes('out-of-bounds'));
});

test('reports overlapping grid panels', async () => {
  assert.ok(types(await verify('overlap')).includes('overlap'));
});

test('reports overflow inside hidden fragments', async () => {
  assert.ok(types(await verify('fragment')).includes('out-of-bounds'));
});

test('allows elements marked data-bleed', async () => {
  assert.deepEqual((await verify('bleed')).issues, []);
});

test('checks vertical slides and labels them h/v', async () => {
  const report = await verify('vertical');
  assert.equal(report.slides, 2);
  assert.deepEqual(report.issues.map((issue) => issue.slide), ['0/1']);
});

test('restores the original slide and leaves fragments hidden', async () => {
  await verify('fragment');
  const state = evaluate(`({
    hash: location.hash,
    style: document.getElementById('verify-slides-style') === null,
    fragmentVisible: document.querySelector('.fragment').classList.contains('visible'),
  })`);
  assert.deepEqual(state, { hash: '#/', style: true, fragmentVisible: false });
});

test('the placeholder deck passes', async () => {
  await openDeck(`${APP_URL}/`);
  const report = evaluate(readFileSync('.agents/skills/slides/verify-slides.js', 'utf8'));
  assert.equal(report.slides, 3);
  assert.deepEqual(report.issues, []);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `node --test tests/verify.test.mjs`
Expected: FAIL — `ENOENT: no such file or directory, open '.agents/skills/slides/verify-slides.js'`.

- [ ] **Step 4: Write `.agents/skills/slides/verify-slides.js`**

```js
// Checks every slide of the reveal.js deck on the current page for clipped text,
// content escaping the slide, and overlapping grid/flex panels.
//
//   agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"
//
// Resolves to { slides, issues: [{ slide, type, element, detail }] }. `issues` must be empty.
// Exemptions: [data-bleed] allows intentional off-canvas decoration; [data-verify-ignore] skips a subtree.
(async () => {
  const TOLERANCE = 1;
  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const describe = (el) => {
    let out = el.tagName.toLowerCase();
    if (el.id) out += `#${el.id}`;
    if (el.classList.length) out += `.${[...el.classList].join('.')}`;
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    return text ? `${out} "${text}"` : out;
  };
  const isRendered = (el) => {
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && el.getClientRects().length > 0;
  };
  const clipsContent = (style) =>
    [style.overflowX, style.overflowY].some((value) => ['hidden', 'clip', 'scroll', 'auto'].includes(value));
  const overlapArea = (a, b) =>
    Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
    Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

  // Show every fragment and stop transitions so layout is final while measuring.
  const override = document.createElement('style');
  override.id = 'verify-slides-style';
  override.textContent = `
    .reveal .slides section { transition: none !important; }
    .reveal .fragment { visibility: visible !important; opacity: 1 !important; transform: none !important; }
  `;
  document.head.appendChild(override);

  const indices = [];
  document.querySelectorAll('.reveal .slides > section').forEach((section, h) => {
    const vertical = section.querySelectorAll(':scope > section');
    if (vertical.length) vertical.forEach((_, v) => indices.push([h, v, true]));
    else indices.push([h, 0, false]);
  });

  const startHash = location.hash;
  const issues = [];

  for (const [h, v, isStack] of indices) {
    const label = isStack ? `${h}/${v}` : `${h}`;
    location.hash = isStack ? `#/${h}/${v}` : `#/${h}`;
    await nextFrame();

    const slide = document.querySelector('.reveal .slides section.present:not(.stack)');
    if (!slide) {
      issues.push({ slide: label, type: 'missing', element: '', detail: 'no present slide after navigation' });
      continue;
    }
    const bounds = slide.getBoundingClientRect();

    for (const el of slide.querySelectorAll('*')) {
      if (el.closest('[data-verify-ignore]') || !isRendered(el)) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      if (
        clipsContent(style) &&
        (el.scrollHeight > el.clientHeight + TOLERANCE || el.scrollWidth > el.clientWidth + TOLERANCE)
      ) {
        issues.push({
          slide: label,
          type: 'clipped',
          element: describe(el),
          detail: `content ${el.scrollWidth}×${el.scrollHeight} in a ${el.clientWidth}×${el.clientHeight} box`,
        });
      }

      if (
        !el.closest('[data-bleed]') &&
        (rect.left < bounds.left - TOLERANCE ||
          rect.top < bounds.top - TOLERANCE ||
          rect.right > bounds.right + TOLERANCE ||
          rect.bottom > bounds.bottom + TOLERANCE)
      ) {
        issues.push({ slide: label, type: 'out-of-bounds', element: describe(el), detail: 'extends past the slide edge' });
      }

      if (['grid', 'inline-grid', 'flex', 'inline-flex'].includes(style.display)) {
        const panels = [...el.children].filter(
          (child) => isRendered(child) && !['absolute', 'fixed'].includes(getComputedStyle(child).position),
        );
        for (let i = 0; i < panels.length; i++) {
          for (let j = i + 1; j < panels.length; j++) {
            const area = overlapArea(panels[i].getBoundingClientRect(), panels[j].getBoundingClientRect());
            if (area > TOLERANCE) {
              issues.push({
                slide: label,
                type: 'overlap',
                element: `${describe(panels[i])} × ${describe(panels[j])}`,
                detail: `${Math.round(area)}px² overlap (screen px)`,
              });
            }
          }
        }
      }
    }
  }

  location.hash = startHash || '#/';
  await nextFrame();
  override.remove();
  return { slides: indices.length, issues };
})();
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `node --test tests/verify.test.mjs`
Expected: 9 passing. `restores the original slide…` expects `#/` because reveal writes `#/` for the first slide once `hash: true` is on; if reveal leaves the hash empty instead, the script sets `#/` (`startHash || '#/'`) — keep the test's expectation.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/slides/verify-slides.js tests/fixtures/verify-deck.html tests/verify.test.mjs
git commit -m "feat: add verify-slides overflow and overlap checker"
```

---

### Task 6: PDF export at 1920×1080 per slide

**Files:**
- Create: `scripts/export-pdf.mjs`
- Modify: `package.json` (devDependency `playwright-core`, script `export-pdf`)
- Create: `tests/pdf.test.mjs`

**Interfaces:**
- Consumes: placeholder deck with 3 slides (Task 2); `APP_URL` (Task 2).
- Produces: `node scripts/export-pdf.mjs [url=http://localhost:3000/] [out=public/deck/deck.pdf]` → one 1440×810 pt (1920×1080 px) page per slide. `npm run export-pdf` runs it with defaults. Requires `agent-browser` (honours `AGENT_BROWSER_BIN`).

- [ ] **Step 1: Write the failing test** — `tests/pdf.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_URL } from './helpers.mjs';

test('exports one 1920×1080 page per slide', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'deck-pdf-')), 'deck.pdf');
  execFileSync('node', ['scripts/export-pdf.mjs', `${APP_URL}/`, out], { stdio: 'inherit' });
  const pdf = readFileSync(out, 'latin1');
  const pages = pdf.match(/\/Type\s*\/Page(?!s)/g) ?? [];
  assert.equal(pages.length, 3);
  const boxes = new Set(pdf.match(/\/MediaBox\s*\[[^\]]*\]/g));
  assert.deepEqual([...boxes], ['/MediaBox [0 0 1440 810]']);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/pdf.test.mjs`
Expected: FAIL — `Cannot find module '.../scripts/export-pdf.mjs'`.

- [ ] **Step 3: Install `playwright-core`**

```bash
npm install --save-dev playwright-core
```

Add to `package.json` `scripts`: `"export-pdf": "node scripts/export-pdf.mjs"`.

- [ ] **Step 4: Write `scripts/export-pdf.mjs`**

```js
#!/usr/bin/env node
// Exports the deck to PDF, one 1920×1080 page per slide, using reveal.js print mode.
// `agent-browser pdf` ignores CSS @page size, so this attaches playwright-core to
// agent-browser's own browser over CDP and prints with preferCSSPageSize.
//
//   node scripts/export-pdf.mjs [url=http://localhost:3000/] [out=public/deck/deck.pdf]
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const [url = 'http://localhost:3000/', out = 'public/deck/deck.pdf'] = process.argv.slice(2);
const agentBrowser = process.env.AGENT_BROWSER_BIN ?? 'agent-browser';
const ab = (...args) => execFileSync(agentBrowser, args, { encoding: 'utf8' }).trim();

const printUrl = new URL(url);
printUrl.search = '?print-pdf';
printUrl.hash = '';

ab('open', printUrl.href);
ab('wait', '.reveal .pdf-page');
ab('eval', 'document.fonts.ready.then(() => true)');

const cdpUrl = ab('get', 'cdp-url').split('\n').pop();
const browser = await chromium.connectOverCDP(cdpUrl);
try {
  const page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .find((candidate) => candidate.url().startsWith(printUrl.href));
  if (!page) throw new Error(`No agent-browser tab is showing ${printUrl.href}`);

  const outPath = resolve(out);
  mkdirSync(dirname(outPath), { recursive: true });
  await page.pdf({ path: outPath, preferCSSPageSize: true, printBackground: true });
  console.log(`Saved ${outPath}`);
} finally {
  await browser.close();
  ab('close');
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tests/pdf.test.mjs`
Expected: PASS. If the page count is 6, reveal's print mode is splitting slides because of overflow — that's a deck bug, not a script bug; check with `verify-slides.js`.

- [ ] **Step 6: Commit**

```bash
git add scripts/export-pdf.mjs package.json package-lock.json tests/pdf.test.mjs
git commit -m "feat: export the deck to PDF at 1920x1080 per slide"
```

---

### Task 7: The `slides` builder skill

**Files:**
- Create: `.agents/skills/slides/SKILL.md`, `reveal-template.md`, `design-to-reveal.md`, `animation-patterns.md`, `LICENSE-frontend-slides`
- Copy + edit: `.agents/skills/slides/STYLE_PRESETS.md`, `.agents/skills/slides/bold-template-pack/**` (without `deck-stage.js`)
- Modify: `AGENTS.md`
- Create: `tests/skill.test.mjs`

**Interfaces:**
- Consumes: `verify-slides.js` (Task 5), `scripts/export-pdf.mjs` (Task 6), `src/deck/*` contract (Task 2), class hooks `.deck-root`, `.reveal.deck-theme`, `--stage-bg`, `deckFontVariables`.
- Produces: the skill the autopilot builder session loads (sub-project 2 passes `mode`, brief, `style` in the prompt).

- [ ] **Step 1: Write the failing static checks** — `tests/skill.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SKILL = '.agents/skills/slides';
const read = (file) => readFileSync(join(SKILL, file), 'utf8');
const ownDocs = ['SKILL.md', 'reveal-template.md', 'design-to-reveal.md', 'animation-patterns.md', 'STYLE_PRESETS.md', 'bold-template-pack/README.md'];

test('has agent-agnostic frontmatter', () => {
  const skill = read('SKILL.md');
  assert.match(skill, /^---\nname: slides\ndescription: .+\n---\n/);
});

test('every relative link in the skill docs resolves', () => {
  for (const doc of ownDocs) {
    const links = [...read(doc).matchAll(/\]\(([^)#\s]+)\)/g)].map((m) => m[1]).filter((l) => !/^[a-z]+:/.test(l));
    for (const link of links) {
      const fromSkill = join(SKILL, dirname(doc), link);
      const fromRepo = link.replace(/^\/+/, '');
      assert.ok(existsSync(fromSkill) || existsSync(fromRepo), `${doc} links to missing ${link}`);
    }
  }
});

test('every selection-index entry points at existing cards', () => {
  const index = JSON.parse(read('bold-template-pack/selection-index.json'));
  assert.equal(index.templates.length, 34);
  for (const t of index.templates) {
    assert.ok(existsSync(join(SKILL, t.preview_md)), t.preview_md);
    assert.ok(existsSync(join(SKILL, t.design_md)), t.design_md);
  }
});

test('drops the single-HTML runtime', () => {
  assert.ok(!existsSync(join(SKILL, 'bold-template-pack/deck-stage.js')));
  for (const doc of ownDocs) {
    const text = read(doc);
    assert.doesNotMatch(text, /self-contained HTML|viewport-base\.css|html-template\.md/i, doc);
  }
});

test('never uses .reveal as an animation class', () => {
  for (const doc of ['SKILL.md', 'reveal-template.md', 'animation-patterns.md', 'design-to-reveal.md']) {
    assert.doesNotMatch(read(doc), /class="reveal[ "]|\.reveal-(scale|left|blur)\b|^\.reveal \{/m, doc);
  }
});

test('the skill does not ask the user questions', () => {
  assert.doesNotMatch(read('SKILL.md'), /AskUserQuestion|ask the user|ask \(header/i);
});

test('keeps the frontend-slides licence', () => {
  assert.match(read('LICENSE-frontend-slides'), /MIT License[\s\S]*Zara Zhang/);
});

test('AGENTS.md points builders at the skill', () => {
  assert.match(readFileSync('AGENTS.md', 'utf8'), /\.agents\/skills\/slides\/SKILL\.md/);
});

test('templates directory has 34 packs with both cards', () => {
  const dirs = readdirSync(join(SKILL, 'bold-template-pack/templates'));
  assert.equal(dirs.length, 34);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/skill.test.mjs`
Expected: FAIL — `ENOENT ... .agents/skills/slides/SKILL.md`.

- [ ] **Step 3: Copy the design assets**

```bash
FS=/home/harish/work/test/frontend-slides
mkdir -p .agents/skills/slides
cp "$FS/STYLE_PRESETS.md" .agents/skills/slides/STYLE_PRESETS.md
cp -R "$FS/bold-template-pack" .agents/skills/slides/bold-template-pack
rm .agents/skills/slides/bold-template-pack/deck-stage.js
cp "$FS/LICENSE" .agents/skills/slides/LICENSE-frontend-slides
```

- [ ] **Step 4: Edit `STYLE_PRESETS.md` line 5**

Replace:

```markdown
**Viewport CSS:** For mandatory base styles, see [viewport-base.css](viewport-base.css). Include in every presentation.
```

with:

```markdown
**Stage CSS:** The fixed-stage base is already loaded from [src/deck/reveal-base.css](../../../src/deck/reveal-base.css). The `:root { … }` blocks below are palettes: put those variables on the deck's scope class (`.reveal.deck-theme` or `.reveal.preview-x`), never on `:root` — see [reveal-template.md](reveal-template.md).
```

- [ ] **Step 5: Edit `bold-template-pack/README.md` lines 65–66**

Replace:

```markdown
- Keep `frontend-slides` output as one self-contained HTML file.
- Include the full contents of `viewport-base.css`.
```

with:

```markdown
- Output is reveal.js code in this Next.js app, following [../reveal-template.md](../reveal-template.md).
- `src/deck/reveal-base.css` is already loaded; do not copy it. Translate the template with [../design-to-reveal.md](../design-to-reveal.md).
```

- [ ] **Step 6: Write `.agents/skills/slides/animation-patterns.md`**

Adapted from frontend-slides: entrance classes are renamed (`.reveal` is reveal.js's root), triggered by reveal's `section.present`, and step-by-step reveals use `<Fragment>`. The tilt-effect JS class and scroll-snap troubleshooting are dropped (not applicable to a reveal deck).

````markdown
# Animation Patterns Reference

Use this reference when generating slides. Match animations to the intended feeling.

`.reveal` is reveal.js's root class — never use it for animations. Entrance classes here are `.enter*`.

## Effect-to-Feeling Guide

| Feeling | Animations | Visual Cues |
|---------|-----------|-------------|
| **Dramatic / Cinematic** | Slow fade-ins (1-1.5s), large scale transitions (0.9 to 1) | Dark backgrounds, spotlight effects, full-bleed images |
| **Techy / Futuristic** | Neon glow (box-shadow), glitch/scramble text, grid reveals | Grid patterns, monospace accents, cyan/magenta/electric blue |
| **Playful / Friendly** | Bouncy easing (spring physics), floating/bobbing | Rounded corners, pastel/bright colors, hand-drawn elements |
| **Professional / Corporate** | Subtle fast animations (200-300ms), clean slides | Navy/slate/charcoal, precise spacing, data visualization focus |
| **Calm / Minimal** | Very slow subtle motion, gentle fades | High whitespace, muted palette, serif typography, generous padding |
| **Editorial / Magazine** | Staggered text reveals, image-text interplay | Strong type hierarchy, pull quotes, grid-breaking layouts, serif headlines + sans body |

## Slide Transitions

Set once on the deck: `config={{ transition: "fade" }}` (`none`, `fade`, `slide`, `convex`, `concave`, `zoom`) and `transitionSpeed` (`default`, `fast`, `slow`). Override per slide with `<Slide transition="zoom">`. Calm/editorial styles: `fade` or `none`. Energetic styles: `slide` or `convex`.

## Entrance Animations (play when a slide becomes current)

reveal marks the current slide `section.present`. Scope every rule under the theme class.

```css
/* Fade + Slide Up (most versatile) */
.reveal.deck-theme .enter {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s var(--ease-out-expo), transform 0.6s var(--ease-out-expo);
}
.reveal.deck-theme section.present .enter {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger children */
.reveal.deck-theme section.present .enter:nth-child(1) { transition-delay: 0.1s; }
.reveal.deck-theme section.present .enter:nth-child(2) { transition-delay: 0.2s; }
.reveal.deck-theme section.present .enter:nth-child(3) { transition-delay: 0.3s; }
.reveal.deck-theme section.present .enter:nth-child(4) { transition-delay: 0.4s; }

/* Scale In */
.reveal.deck-theme .enter-scale { opacity: 0; transform: scale(0.9); transition: opacity 0.6s, transform 0.6s var(--ease-out-expo); }
.reveal.deck-theme section.present .enter-scale { opacity: 1; transform: scale(1); }

/* Slide from Left */
.reveal.deck-theme .enter-left { opacity: 0; transform: translateX(-50px); transition: opacity 0.6s, transform 0.6s var(--ease-out-expo); }
.reveal.deck-theme section.present .enter-left { opacity: 1; transform: translateX(0); }

/* Blur In */
.reveal.deck-theme .enter-blur { opacity: 0; filter: blur(10px); transition: opacity 0.8s, filter 0.8s var(--ease-out-expo); }
.reveal.deck-theme section.present .enter-blur { opacity: 1; filter: blur(0); }
```

## Step-by-step Reveals (presenter clicks)

Use `<Fragment>` from `@revealjs/react` instead of CSS classes when the presenter should reveal items one at a time:

```tsx
<Fragment animation="fade-up" as="li">First point</Fragment>
<Fragment animation="fade-up" asChild><div className="card">Second point</div></Fragment>
```

Built-in animations: `fade-in`, `fade-up`, `fade-down`, `fade-left`, `fade-right`, `fade-in-then-out`, `grow`, `shrink`, `strike`, `highlight-red`, `highlight-green`, `highlight-blue`. Speaker-led decks use fragments sparingly; reading-first decks rarely need them.

## Background Effects

```css
/* Gradient Mesh — layered radial gradients for depth */
.reveal.deck-theme .gradient-bg {
  background:
    radial-gradient(ellipse at 20% 80%, rgba(120, 0, 255, 0.3) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 20%, rgba(0, 255, 200, 0.2) 0%, transparent 50%),
    var(--bg-primary);
}

/* Noise Texture — inline SVG for grain */
.reveal.deck-theme .noise-bg {
  background-image: url("data:image/svg+xml,..."); /* Inline SVG noise */
}

/* Grid Pattern — subtle structural lines */
.reveal.deck-theme .grid-bg {
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}
```

A background that should cover the letterbox too goes on `--stage-bg`; a background that belongs to one slide can use `<Slide background="...">` / `backgroundGradient` / `backgroundImage`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Fonts not loading | Check the `next/font/google` import name and `variable`; the page wrapper must carry the font variable classes |
| Entrance animations never play | The rule must key off `section.present`, and be scoped under the theme class |
| Everything animates on page load but not on later slides | You used a load-time `@keyframes` on the element; key it off `section.present` instead |
| Styles from one preview show up in another | A selector is missing the scope class |
| Performance issues | Prefer `transform`/`opacity` animations; use `will-change` sparingly |
````

- [ ] **Step 7: Write `.agents/skills/slides/reveal-template.md`**

````markdown
# reveal.js Deck Template

Reference architecture for slides in this app. Every deck is a fixed 1920×1080 reveal.js stage; reveal scales the whole stage to the window and letterboxes it. Slides never reflow.

## Files You Own

| Path | Purpose |
| --- | --- |
| `src/deck/presentation.tsx` | The deck: one `<Slide>` per slide |
| `src/deck/theme.css` | The chosen style, every selector under `.reveal.deck-theme` |
| `src/deck/fonts.ts` | `next/font/google` fonts, exported as `deckFontVariables` |
| `src/app/page.tsx` | Renders the deck; only change it if the wrapper must change |
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

- Keep `width`, `height`, `margin`, `center: false` and `hash: true` exactly as above. `transition` comes from the chosen style.
- One `{/* === NAME === */}` comment per slide.
- Layout classes go on `<Slide className>`; the slide `<section>` is always 1920×1080 with `box-sizing: border-box`, so padding stays inside the stage.
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
.reveal.deck-theme .slide-title { display: flex; flex-direction: column; justify-content: flex-end; }

/* === ANIMATIONS === (see animation-patterns.md) */
```

Rules:

- Every selector starts with `.reveal.deck-theme` (or `.reveal-viewport:has(.reveal.deck-theme)` for `--stage-bg`). Palette blocks written as `:root { … }` in a style reference go on the scope class instead.
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
````

- [ ] **Step 8: Write `.agents/skills/slides/design-to-reveal.md`**

````markdown
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
````

- [ ] **Step 9: Write `.agents/skills/slides/SKILL.md`**

````markdown
---
name: slides
description: Build reveal.js presentations in this Next.js starter from a brief — three style previews (mode previews), the full deck (mode deck), or revisions to it. Non-interactive; never asks the user questions.
---

# Slides

You turn a presentation brief into a reveal.js deck in this Next.js app. You run without a conversation: everything you need is in the prompt. When something is missing, make the most reasonable choice and list it under **Assumptions** in your final summary. Never stop to ask.

Before starting, read [AGENTS.md](../../../AGENTS.md) and [reveal-template.md](reveal-template.md). The app is already running at `http://localhost:3000`; don't start another server.

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

Slides must read as the user's real deck. Never render on a slide: `preview`, `template`, `preset`, `style option`, `Option A/B/C`, `wildcard`, `custom`, `generated from`, file names, paths, template or slug names, or requirement notes ("sharp and provocative", "audience: …"). Chrome may only use real deck content: deck title, section title, date, author, company, page number, or phrases from the user's material.

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
3. For bold picks, read only their `preview.md` cards (paths in the index).
4. A custom wildcard needs a deliberate visual thesis — distinctive typography, a committed palette, a recognizable layout system, one strong graphic device — and must imply a system that extends to section, content, quote, comparison and closing slides.
5. Write the four files per letter and the comparison page exactly as in [reveal-template.md](reveal-template.md) ("Preview Routes", "Comparison Page"). Each preview is the user's real title slide.
6. Run **Checks** on `/preview/a`, `/preview/b`, `/preview/c` and `/previews`.

## Mode: deck

1. The picked letter is in `style`. Promote it:
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
   agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"
   ```

   `issues` must be `[]`. Fix `clipped`, `out-of-bounds` and `overlap` by splitting or restructuring the slide, not by shrinking type. Use `data-bleed` only for deliberate off-canvas decoration.
3. Screenshot every slide (`agent-browser open http://localhost:3000/#/<n>` then `agent-browser screenshot`) and look at each one. Check the design reads as intended, not just that it passes.
4. Authenticity scan: `agent-browser eval "document.querySelector('.reveal .slides').innerText"` and confirm none of the banned words from **Slide Authenticity** appear.

## PDF Export (only when the prompt asks)

```bash
npm run export-pdf
```

Writes `public/deck/deck.pdf` (served at `/deck/deck.pdf`), one 1920×1080 page per slide. Animations are flattened to their final state. If the page count is higher than the slide count, a slide overflows — fix it and re-export.

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
````

- [ ] **Step 10: Point `AGENTS.md` at the skill** — insert before `# Before finishing a task`:

```markdown
# Slides

This is a reveal.js presentation app. When building or changing slides, follow [.agents/skills/slides/SKILL.md](.agents/skills/slides/SKILL.md).

```

- [ ] **Step 11: Run the static checks**

Run: `node --test tests/skill.test.mjs`
Expected: 9 passing. If `drops the single-HTML runtime` fails on `STYLE_PRESETS.md` or `bold-template-pack/README.md`, grep for the matched phrase and adapt that sentence the same way as Steps 4–5.

- [ ] **Step 12: Commit**

```bash
git add .agents/skills/slides AGENTS.md tests/skill.test.mjs
git commit -m "feat: add the slides builder skill adapted from frontend-slides"
```

---

### Task 8: End-to-end dry run of the skill (acceptance, not committed)

Proves a fresh agent can follow the skill: previews → pick → deck → checks → PDF. Runs in a throwaway worktree; nothing from it is committed.

**Files:** none in the repo.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Create a throwaway worktree and start it**

```bash
git worktree add "$SCRATCH/slides-dry-run" feat/slides-builder
cd "$SCRATCH/slides-dry-run" && npm ci && npm run dev -- --port 3000
```

(Stop the main checkout's dev server first so port 3000 is free.)

- [ ] **Step 2: Run a builder agent in previews mode**

Dispatch a fresh agent with working directory `$SCRATCH/slides-dry-run` and this prompt:

```text
Follow .agents/skills/slides/SKILL.md.

mode: previews
Title: Cutting invoice disputes by half
Audience: finance leadership at a mid-size logistics company
Occasion: quarterly business review, presented live
Density: speaker-led
Outline:
1. Title — "Cutting invoice disputes by half", Q3 2026, Ops Finance
2. The problem — 18% of invoices disputed, 23-day average resolution
3. Root causes — mismatched POs, missing proof of delivery, rate-card drift
4. What we changed — automated PO matching, POD capture at handover, weekly rate sync
5. Results — disputes down to 8%, resolution 9 days
6. Next quarter — extend to carriers, target 5%
```

- [ ] **Step 3: Check the previews**

```bash
agent-browser set viewport 1920 1080
for r in /preview/a /preview/b /preview/c; do
  agent-browser open "http://localhost:3000$r"
  agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"
  agent-browser eval "document.querySelector('.reveal .slides').innerText"
done
agent-browser open http://localhost:3000/previews && agent-browser screenshot previews.png
```

Expected: every `issues` is `[]`; no slide text contains a banned word from SKILL.md; the screenshot shows three visibly different title slides; the agent's summary has the letter/name/source table with exactly one preset source and at least one `bold:` source.

- [ ] **Step 4: Run the builder in deck mode**

Same agent (or a fresh one) with: `Follow .agents/skills/slides/SKILL.md. mode: deck. style: b.` plus the same brief.

- [ ] **Step 5: Check the deck and export**

```bash
test ! -e src/app/preview && test ! -e src/app/previews && echo "previews removed"
grep -c 'preview-b' src/deck/theme.css   # expect 0
agent-browser open http://localhost:3000/
agent-browser eval "$(cat .agents/skills/slides/verify-slides.js)"
npm run export-pdf
node -e "const b=require('fs').readFileSync('public/deck/deck.pdf','latin1');console.log((b.match(/\/Type\s*\/Page(?!s)/g)||[]).length)"
npm run typecheck && npm run build
```

Expected: `previews removed`; `0`; `issues: []` and `slides` ≥ 6; PDF page count equals `slides`; typecheck and build pass.

- [ ] **Step 6: Record findings and clean up**

Any step where the agent had to guess or did the wrong thing is a skill-doc defect: fix the wording in the real branch (`.agents/skills/slides/*.md`), re-run `node --test tests/skill.test.mjs`, and commit as `docs(slides): clarify <topic>`. Then:

```bash
agent-browser close --all
# stop the worktree dev server
git worktree remove --force "$SCRATCH/slides-dry-run"
```

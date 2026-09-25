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

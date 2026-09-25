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

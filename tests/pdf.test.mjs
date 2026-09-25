import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_URL, ab, evaluate } from './helpers.mjs';

test('print mode renders every slide with its layout and padding', () => {
  ab('open', `${APP_URL}/?print-pdf`);
  ab('wait', '.reveal .pdf-page');
  const slides = evaluate(`[...document.querySelectorAll('.reveal .pdf-page > section')].map((s) => {
    const style = getComputedStyle(s);
    return { display: style.display, padding: style.paddingTop };
  })`);
  assert.deepEqual(slides, Array(3).fill({ display: 'flex', padding: '120px' }));
});

test('exports one 1920×1080 page per slide', () => {
  const out = join(mkdtempSync(join(tmpdir(), 'deck-pdf-')), 'deck.pdf');
  execFileSync('node', ['scripts/export-pdf.mjs', `${APP_URL}/`, out], { stdio: 'inherit' });
  const pdf = readFileSync(out, 'latin1');
  const pages = pdf.match(/\/Type\s*\/Page(?!s)/g) ?? [];
  assert.equal(pages.length, 3);
  const boxes = new Set(pdf.match(/\/MediaBox\s*\[[^\]]*\]/g));
  assert.deepEqual([...boxes], ['/MediaBox [0 0 1440 810]']);
});

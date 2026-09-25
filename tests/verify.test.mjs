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

test('measures after entrance animations settle', async () => {
  assert.deepEqual((await verify('entrance')).issues, []);
});

test('allows r-stack children to share one grid cell', async () => {
  assert.deepEqual((await verify('r-stack')).issues, []);
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

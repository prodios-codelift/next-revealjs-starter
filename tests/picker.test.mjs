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

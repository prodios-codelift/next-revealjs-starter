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

test('navigating to the hash reveal has not rewritten yet still moves the deck', async () => {
  navigate('/#/1');
  await waitForLocation('/#/1');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  // reveal delays its hash write, so right after this the URL still reads #/1 while the deck is on slide 2.
  pressInPreview('ArrowRight');
  navigate('/#/1');
  await new Promise((resolve) => setTimeout(resolve, 1500));
  assert.equal(evaluate('window.lastLocation()'), '/#/1');
});

test('rejects protocol-relative locations', () => {
  const response = navigate('//evil.example/');
  assert.equal(response.error, 'Invalid preview location');
});

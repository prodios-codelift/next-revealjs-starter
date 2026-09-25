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

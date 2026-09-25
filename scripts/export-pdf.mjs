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

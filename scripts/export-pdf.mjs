#!/usr/bin/env node
// Exports the deck to PDF, one 1920×1080 page per slide, using reveal.js print mode.
// `agent-browser pdf` ignores CSS @page size, so this attaches playwright-core to
// agent-browser's own browser over CDP and prints with preferCSSPageSize.
//
//   node scripts/export-pdf.mjs [url=http://localhost:3000/] [out=public/deck/deck.pdf]
//
// Exits 3 when the PDF doesn't come out as exactly one page per slide.
// Set AGENT_BROWSER_SESSION to keep concurrent exports in separate browser sessions.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const [url = 'http://localhost:3000/', out = 'public/deck/deck.pdf'] = process.argv.slice(2);
const agentBrowser = process.env.AGENT_BROWSER_BIN ?? 'agent-browser';
const ab = (...args) => execFileSync(agentBrowser, args, { encoding: 'utf8' }).trim();

const PAGE_MISMATCH_EXIT_CODE = 3;

// One page per slide: reveal otherwise prints a page per fragment step.
const printUrl = new URL(url);
printUrl.search = '?print-pdf&pdfSeparateFragments=false';
printUrl.hash = '';

ab('open', printUrl.href);
ab('wait', '.reveal .pdf-page');
ab('eval', 'document.fonts.ready.then(() => true)');
const slideCount = Number(ab('eval', "document.querySelectorAll('.reveal .pdf-page').length"));

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

  const pageCount =
    readFileSync(outPath, 'latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
  if (pageCount !== slideCount) {
    console.error(
      `${slideCount} slides printed as ${pageCount} pages instead of one page per slide.`,
    );
    process.exitCode = PAGE_MISMATCH_EXIT_CODE;
  } else {
    console.log(`Saved ${outPath}`);
  }
} finally {
  await browser.close();
  ab('close');
}

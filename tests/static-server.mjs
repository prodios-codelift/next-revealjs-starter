import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
};

/**
 * Serves files under root from a child process. Tests drive the browser with
 * synchronous agent-browser calls, which would block an in-process server.
 */
export function serveStatic(root, port) {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), root, String(port)], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    child.once('error', reject);
    child.stdout.once('data', () => resolve({ close: () => child.kill() }));
  });
}

function listen(root, port) {
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
  server.listen(port, () => process.stdout.write('listening\n'));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  listen(process.argv[2], Number(process.argv[3]));
}

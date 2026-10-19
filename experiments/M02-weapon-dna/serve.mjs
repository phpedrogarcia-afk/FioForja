#!/usr/bin/env node
// Tiny dependency-free static file server for the M02 Weapon DNA lab.
// Used by scripts/weapon-lab.mjs (human mode) and capture.mjs (Playwright).

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LAB_DIR = fileURLToPath(new URL('.', import.meta.url));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/**
 * Start the lab static server.
 * @param {{ root?: string, port?: number, host?: string, quiet?: boolean }} [options]
 * @returns {Promise<{ url: string, port: number, close: () => Promise<void>, server: import('node:http').Server }>}
 */
export async function startServer(options = {}) {
  const root = resolve(options.root ?? LAB_DIR);
  const host = options.host ?? '127.0.0.1';
  const port = Number.isInteger(options.port) ? options.port : 0;
  const quiet = options.quiet ?? false;

  const server = createServer(async (req, res) => {
    try {
      const rawUrl = req.url || '/';
      const pathname = decodeURIComponent(new URL(rawUrl, 'http://localhost').pathname);
      const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const requested = resolve(join(root, normalize(relativePath)));
      if (requested !== root && !requested.startsWith(root + sep)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }
      const body = await readFile(requested);
      const type = MIME[extname(requested).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, {
        'content-type': type,
        'content-length': body.byteLength,
        'cache-control': 'no-store, max-age=0',
        'access-control-allow-origin': '*',
      });
      res.end(body);
    } catch (err) {
      const code = err && err.code === 'ENOENT' ? 404 : err && err.code === 'EISDIR' ? 403 : 500;
      res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(code === 404 ? 'Not found' : 'Error: ' + String(err && err.message ? err.message : err));
    }
  });

  await new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(port, host, () => {
      server.off('error', rejectPromise);
      resolvePromise();
    });
  });

  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const url = 'http://' + host + ':' + actualPort + '/';

  const close = () => new Promise((resolvePromise) => {
    server.close(() => resolvePromise());
    server.closeAllConnections?.();
  });

  if (!quiet) {
    console.log('[lab:serve] ' + root + ' -> ' + url);
  }
  return { url, port: actualPort, close, server };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const portArg = process.argv.slice(2).find((a) => a.startsWith('--port='));
  const port = portArg ? Number(portArg.split('=')[1]) : 5179;
  startServer({ port }).then(({ url, close }) => {
    console.log('[lab:serve] open ' + url + '  (Ctrl+C to stop)');
    const stop = async () => { await close(); process.exit(0); };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
  }).catch((err) => {
    console.error('[lab:serve] FAILED', err);
    process.exitCode = 1;
  });
}

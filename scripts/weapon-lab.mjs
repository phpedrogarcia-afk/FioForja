#!/usr/bin/env node
// Weapon DNA lab: single reproducible entry point.
//
//   node scripts/weapon-lab.mjs                 build transpiled modules + serve the lab
//   node scripts/weapon-lab.mjs --no-build      serve without rebuilding
//   node scripts/weapon-lab.mjs --port=5179     choose the port
//   node scripts/weapon-lab.mjs --capture       build, serve, then run Playwright capture
//
// Equivalent separate commands:
//   node experiments/M02-weapon-dna/build.mjs
//   node experiments/M02-weapon-dna/capture.mjs

import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../experiments/M02-weapon-dna/build.mjs';
import { startServer } from '../experiments/M02-weapon-dna/serve.mjs';

const LAB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'experiments', 'M02-weapon-dna');
const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(name);
const valueOf = (name, fallback) => {
  const hit = args.find((a) => a.startsWith('--' + name + '='));
  return hit ? hit.slice(name.length + 3) : fallback;
};

if (!hasFlag('--no-build')) {
  await build();
}
const port = Number(valueOf('port', '5179'));
const { url, close } = await startServer({ port });
console.log('[weapon-lab] open ' + url + '  (Ctrl+C to stop)');

if (hasFlag('--capture')) {
  const child = spawn(process.execPath, [join(LAB_DIR, 'capture.mjs')], { stdio: 'inherit' });
  const code = await new Promise((resolvePromise) => child.on('close', resolvePromise));
  await close();
  process.exit(code ?? 0);
}

const stop = async () => { await close(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

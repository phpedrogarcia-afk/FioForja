#!/usr/bin/env node
// M02 Weapon DNA visual lab - TypeScript -> plain ESM transpiler.
//
// No bundler: every source module is transpiled on its own with
// ts.transpileModule (target ES2022, module ESNext/ES2022) and written to
// experiments/M02-weapon-dna/.build/ mirroring its repo-relative path, so
// relative imports keep working after .ts -> .js specifier rewrite.
//
// Entry points: src/game/catalog.ts, src/game/types.ts, src/game/swordDraw.ts
// and every src/game/visuals/*.ts (excluding tests). Relative .ts imports are
// crawled recursively so the emitted graph is closed.

import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

export const LAB_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(LAB_DIR, '..', '..');
export const OUT_DIR = join(LAB_DIR, '.build');

const STATIC_ENTRIES = [
  'src/game/types.ts',
  'src/game/catalog.ts',
  'src/game/swordDraw.ts',
];

const posix = (p) => p.split(sep).join('/');

/** Relative .ts specifiers referenced from a module (static, re-export, dynamic). */
function findRelativeSpecifiers(source) {
  const specs = [];
  const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source))) specs.push(m[1]);
  return specs;
}

/** Resolve a relative specifier to an on-disk .ts source, or null. */
function resolveSource(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec);
  if (base.endsWith('.ts')) return existsSync(base) ? base : null;
  if (!base.endsWith('.js') && existsSync(base + '.ts')) return base + '.ts';
  return null;
}

async function collectSources() {
  const entries = STATIC_ENTRIES.map((p) => join(REPO_ROOT, p));
  const visualsDir = join(REPO_ROOT, 'src', 'game', 'visuals');
  if (existsSync(visualsDir)) {
    for (const name of (await readdir(visualsDir)).sort()) {
      if (name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.d.ts')) {
        entries.push(join(visualsDir, name));
      }
    }
  }

  const seen = new Set();
  const ordered = [];
  const missing = [];
  const queue = [...entries];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const source = await readFile(file, 'utf8');
    ordered.push({ file, source });
    for (const spec of findRelativeSpecifiers(source)) {
      const target = resolveSource(file, spec);
      if (target) {
        if (!seen.has(target)) queue.push(target);
      } else if (spec.startsWith('.') && spec.endsWith('.ts')) {
        const rel = posix(relative(REPO_ROOT, file));
        const wanted = posix(relative(REPO_ROOT, resolve(dirname(file), spec)));
        missing.push({ from: rel, specifier: spec, resolvesTo: wanted });
      }
    }
  }
  return { ordered, missing };
}

/** Rewrite .ts (and extensionless relative) import specifiers to .js. */
function rewriteSpecifiers(code) {
  return code.replace(/((?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"])([^'"]+)(['"])/g, (whole, pre, spec, post) => {
    if (!spec.startsWith('.')) return whole;
    if (spec.endsWith('.ts')) return pre + spec.slice(0, -3) + '.js' + post;
    if (spec.endsWith('.js')) return whole;
    return pre + spec + '.js' + post;
  });
}

function transpile(file, source) {
  const result = ts.transpileModule(source, {
    fileName: file,
    reportDiagnostics: false,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      useDefineForClassFields: true,
      removeComments: false,
      sourceMap: false,
      inlineSourceMap: false,
      newLine: ts.NewLineKind.LineFeed,
    },
  });
  return rewriteSpecifiers(result.outputText);
}

/**
 * Build the lab bundle.
 * @param {{ quiet?: boolean }} [options]
 * @returns {Promise<object>} build metadata (also written to .build/build-meta.json)
 */
export async function build(options = {}) {
  const startedAt = Date.now();
  await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(OUT_DIR, { recursive: true });

  const collected = await collectSources();
  const sources = collected.ordered;
  const emitted = [];
  for (const { file, source } of sources) {
    const rel = posix(relative(REPO_ROOT, file));
    const outRel = rel.replace(/\.ts$/, '.js');
    const outFile = join(OUT_DIR, outRel);
    await mkdir(dirname(outFile), { recursive: true });
    const code = transpile(file, source);
    await writeFile(outFile, code, 'utf8');
    emitted.push({ rel: outRel, code });
  }

  // Stable hash over the emitted module graph (sorted by path).
  const hash = createHash('sha256');
  emitted.sort((a, b) => a.rel.localeCompare(b.rel));
  for (const { rel, code } of emitted) {
    hash.update(rel);
    hash.update('\0');
    hash.update(code);
    hash.update('\0');
  }

  const meta = {
    schema: 1,
    builtAt: new Date().toISOString(),
    builtMs: Date.now() - startedAt,
    sourceRoot: REPO_ROOT,
    outDir: posix(relative(LAB_DIR, OUT_DIR)),
    hash: hash.digest('hex'),
    entries: sources.map((s) => posix(relative(REPO_ROOT, s.file))),
    missingModules: collected.missing,
    files: emitted.map(({ rel, code }) => ({
      path: rel,
      bytes: Buffer.byteLength(code, 'utf8'),
      sha256: createHash('sha256').update(code).digest('hex'),
    })),
    moduleCount: emitted.length,
  };
  await writeFile(join(OUT_DIR, 'build-meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8');
  if (!options.quiet) {
    console.log('[lab:build] ' + meta.moduleCount + ' modules -> ' + posix(relative(REPO_ROOT, OUT_DIR)) + ' (hash ' + meta.hash.slice(0, 12) + ') in ' + meta.builtMs + 'ms');
    console.log('[lab:build] entries: ' + meta.entries.map((e) => e.replace('src/game/', '')).join(', '));
    if (meta.missingModules.length > 0) {
      console.warn('[lab:build] WARN ' + meta.missingModules.length + ' unresolved relative module(s) - feature gate will stay closed until they land:');
      for (const item of meta.missingModules) {
        console.warn('  - ' + item.from + ' -> ' + item.specifier + ' (' + item.resolvesTo + ' missing)');
      }
    }
  }
  return meta;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  build().catch((err) => {
    console.error('[lab:build] FAILED', err);
    process.exitCode = 1;
  });
}

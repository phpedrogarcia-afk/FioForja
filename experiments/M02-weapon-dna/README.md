# M02 · Weapon DNA Visual Lab

Self-contained evidence harness for the **Weapon DNA** renderer of FioForja.
It transpiles the game's TypeScript render modules to plain ESM (no bundler),
renders comparison matrices A–G into a single canvas, and captures them as PNG
evidence with Playwright.

Everything here is reproducible from a clean checkout:

```bash
# 1. build + serve the lab (human driving mode)
node scripts/weapon-lab.mjs
# -> [lab:serve] ... http://127.0.0.1:5179/   (Ctrl+C to stop)

# 2. regenerate every evidence PNG + manifest (Playwright, headless)
node experiments/M02-weapon-dna/capture.mjs
```

The capture command builds first, serves on an ephemeral port, opens the lab,
renders each matrix, and screenshots the canvas **at exact backing-store size**
(deviceScaleFactor 1) into `experiments/M02-weapon-dna/evidence/`.

## Requirements

- Node.js 22.6+ (this checkout uses Node 24). No extra install step.
- `typescript` and `playwright` are already in `node_modules` (junctioned from
  the main checkout). Do **not** run `playwright install`: the capture script
  resolves an existing Chromium binary from `%LOCALAPPDATA%\ms-playwright`
  (currently `chromium-1228`). Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to override.

## Commands

| Command | What it does |
| --- | --- |
| `node scripts/weapon-lab.mjs` | Build `.build/` then serve the lab at http://127.0.0.1:5179/ |
| `node scripts/weapon-lab.mjs --no-build` | Serve the previous build (faster loop) |
| `node scripts/weapon-lab.mjs --port=5180` | Serve on a specific port |
| `node scripts/weapon-lab.mjs --capture` | Build + capture evidence (runs `capture.mjs`) |
| `node experiments/M02-weapon-dna/build.mjs` | Only transpile the module graph into `.build/` |
| `node experiments/M02-weapon-dna/capture.mjs` | Build + serve + screenshot all matrices |
| `node experiments/M02-weapon-dna/capture.mjs --mode=dna` | Force DNA renderer (fails loudly if unavailable) |
| `node experiments/M02-weapon-dna/capture.mjs --mode=legacy` | Force legacy `drawFinishedSword` renderer |
| `node experiments/M02-weapon-dna/capture.mjs --only=A,G` | Capture a subset |
| `node experiments/M02-weapon-dna/capture.mjs --no-build` | Reuse the last `.build/` |

## Matrices

| Id | File | Shows |
| --- | --- | --- |
| A | `evidence/A.png` | **Families** — one representative weapon per each of the 9 families (same quality band). |
| B | `evidence/B.png` | **Quality** — the same border sword forged at quality 35 (Defeituosa), 68 (Boa), 96 (Obra-prima). |
| C | `evidence/C.png` | **Individuality** — six damascus-family weapons with different guards/wraps/pommels, forge history and weights: visibly non-identical, recognizably the same family. |
| D | `evidence/D.png` | **Components** — one blade genome (same forge, steel, length) with six guard/grip/pommel combinations. |
| E | `evidence/E.png` | **Attributes** — offensive (high P.ATK), defensive (high DEF) and agile (high AGI) weapons; attributes and geometry must be coherent. |
| F | `evidence/F.png` | **Scale** — the same weapon at card (~180 px), inspection (~420 px) and presentation (~900 px), rendered 1:1 on a shared baseline (no rescaling). |
| G | `evidence/G.png` | **Legacy vs DNA** — the five canonical hero weapons: legacy `swordDraw.ts` (top row) next to the Weapon DNA renderer (bottom row). |

The five canonical heroes are `guarda_medieval`, `cimitarra_damasco`,
`lua_silenciosa`, `folha_aereth` and `queda_asterion` (from
`src/game/catalog.ts`).

## What is on disk

```
experiments/M02-weapon-dna/
  build.mjs        TS -> ESM transpiler (ts.transpileModule, ES2022, no bundler)
  serve.mjs        dependency-free static server (used by the lab and capture)
  index.html       lab shell (dark canvas page, buttons for matrices + mode toggle)
  lab.js           all lab code: fixtures, renderers, layout, window.__lab API
  capture.mjs      Playwright headless capture -> evidence/*.png + manifest.json
  .build/          generated ESM (git-ignored build output) + build-meta.json
  evidence/        generated PNGs + manifest.json
  README.md        this file
scripts/weapon-lab.mjs   single reproducible entry point (build + serve)
```

## How the pipeline works

1. **`build.mjs`** transpiles `src/game/catalog.ts`, `src/game/types.ts`,
   `src/game/swordDraw.ts` and every `src/game/visuals/*.ts` (excluding tests)
   to ES2022 ESM with `ts.transpileModule`. Relative imports are crawled
   recursively and their `.ts` specifiers rewritten to `.js`. Output mirrors the
   repo-relative path under `.build/` (e.g. `.build/src/game/visuals/weaponGenome.js`).
   Unresolved relative modules (a workstream that has not landed yet) are printed
   as warnings and recorded in `.build/build-meta.json` under `missingModules`.
2. **`lab.js`** statically imports the legacy renderer and *dynamically* imports
   the DNA modules inside a `try/catch`. Until `weaponRenderer.ts` and all of its
   dependencies exist, the lab runs in **legacy mode** and matrix G shows a
   "DNA renderer pending" placeholder instead of failing. `window.__LAB_READY__`
   is set after the first matrix is drawn.
3. **`capture.mjs`** resolves a cached Chromium, serves the folder, drives the
   lab through `window.__lab`, and writes one PNG per matrix plus the manifest.
   PNGs are produced from `canvas.toDataURL()` so they are exactly the canvas
   backing-store pixels, independent of CSS, scrolling or viewport size.
4. **`.build/build-meta.json`** carries the deterministic module-graph hash
   (sha256 over sorted emitted files), which is also stamped in every matrix
   header/footer and in `evidence/manifest.json`.

### `window.__lab` API

```js
await page.waitForFunction(() => window.__LAB_READY__ === true);
window.__lab.diagnostics();            // { mode, dnaReady, dnaError, buildHash, build }
window.__lab.listMatrices();           // [{ id, title, width, height, mixedMode }]
window.__lab.setMode('dna' | 'legacy'); // throws if DNA is unavailable
window.__lab.getMode();
window.__lab.renderMatrix('A');        // draws + returns { width, height, mode, items, inkRatio, warnings }
```

A human can drive the same page: buttons `A…G` switch matrices, the mode
button toggles legacy/DNA when the DNA engine is available.

## Evidence manifest

`evidence/manifest.json` records, per run:

- `renderMode`, `dnaReady`, `dnaError`
- `build.hash`, `build.builtAt`, `build.moduleCount`, `build.entries`
- browser name/version/executable, viewport, `deviceScaleFactor: 1`
- for each matrix: `id`, `title`, `file`, exact `width`/`height` (verified against
  the PNG IHDR), `bytes`, `renderer` (`legacy` | `dna` | `mixed`), `inkRatio`,
  per-item `bbox`, `scale`, `clipped`/`fitted` flags, `warnings` and `error`.

The renderer decides each matrix's framing itself: every weapon is rasterized
off-screen, its real ink bounding box is measured, and the image is fitted into
the cell. That keeps both renderers legible without hard-coded anchors. Matrix F
is the exception: it draws at 1:1 on a shared baseline to preserve true scale.

## Regenerating after renderer changes

```bash
node experiments/M02-weapon-dna/capture.mjs
node --experimental-strip-types --test src/game/visuals/weaponGenome.test.ts src/game/visuals/geometry.test.ts
```

The lab fixtures are deliberately deterministic (fixed designs, fixed strike
histories, no `Math.random`, no wall clock in the artwork). Re-running the same
build must produce the same images; only `manifest.json` timestamps change.

### Tests that back this evidence

| Suite | Command | What it proves |
| --- | --- | --- |
| Genome contract | `node --experimental-strip-types --test src/game/visuals/weaponGenome.test.ts` | determinism, JSON round-trip, documented ranges, legacy-save tolerance, isolated component mutation |
| Geometry invariants | `node --experimental-strip-types --test src/game/visuals/geometry.test.ts` | finite geometry, monotonic stations, closed & non-self-intersecting outlines, valid tip, sane hilt bounds over a 520-genome deterministic sweep |

## Evidence status

The Weapon DNA renderer (`weaponRenderer.ts` + `geometry.ts` + `materials.ts` +
`ornamentation.ts` + `qualityMarks.ts`) is integrated: matrices **A–F are
captured with the DNA renderer** and **G is a real legacy-vs-DNA comparison**
(top row legacy `drawFinishedSword`, bottom row DNA `drawWeaponFromSword`).
`--mode=legacy` still reproduces the historical baseline for A–F whenever the
"before" comparison is needed.

## Troubleshooting

- **`DNA renderer pending` everywhere** — run `node experiments/M02-weapon-dna/build.mjs`
  and read the `WARN N unresolved relative module(s)` list. It names the missing
  file(s) (e.g. `geometry.ts`) and their importers.
- **Chromium not found** — the script prints the resolved path and instructions.
  Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a Chromium/Chrome `chrome.exe`.
- **Blank matrix** — `capture.mjs` exits non-zero and lists matrices whose
  `inkRatio` is below 0.2 % (nothing was drawn).

## Known legacy-renderer quirks (baseline, not DNA)

- `drawFinishedSword` does not scale blade width or hilt with `lengthPx`
  (`W` is constant ~34 px, hilt ~56 px). At presentation size (matrix F,
  `lengthPx = 900`) the legacy sword is therefore needle-thin. This is exactly
  the defect the Weapon DNA engine fixes, so matrix F is only meaningful as a
  side-by-side once DNA mode is captured.

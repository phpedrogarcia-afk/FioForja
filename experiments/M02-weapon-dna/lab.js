// M02 Weapon DNA visual lab - plain ESM, no framework, no bundler.
//
// Loads the transpiled modules produced by ./build.mjs from ./.build/.
// Renders evidence matrices A-G into a single canvas and exposes a scriptable
// API so Playwright (capture.mjs) and humans can drive it:
//
//   window.__lab.setMode('legacy' | 'dna')
//   window.__lab.getMode()
//   window.__lab.listMatrices()        -> [{ id, title, width, height }]
//   window.__lab.renderMatrix(id)      -> { id, width, height, mode, items, inkRatio, warnings }
//   window.__lab.diagnostics()         -> { mode, dnaReady, dnaError, buildHash, build }
//   window.__LAB_READY__ === true      (set once modules are loaded + matrix A drawn)

import {
  CANONICAL_PRESETS,
  FAMILIES,
  PROFILES,
  STEELS,
  WRAPS,
  GUARDS,
  POMMELS,
  gradeFor,
} from './.build/src/game/catalog.js';
import { drawFinishedSword } from './.build/src/game/swordDraw.js';

// ---------------------------------------------------------------------------
// Visual language
// ---------------------------------------------------------------------------

const BG = '#101216';
const PANEL = '#171b22';
const PANEL_BORDER = '#2a3240';
const CELL = '#1b2029';
const CELL_BORDER = '#2b3341';
const TEXT = '#e9edf5';
const MUTED = '#98a3b5';
const ACCENT = '#7fb4ff';
const GOOD = '#57d68a';
const WARN = '#e6b450';
const BAD = '#e5645f';

const FONT_STACK = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MARGIN = 36;
const HEADER_H = 96;
const FOOTER_H = 46;
const GRID_GAP = 18;
const CELL_PAD = 14;
const LABEL_H = 62;

function font(weight, size) {
  return String(weight) + ' ' + String(size) + 'px ' + FONT_STACK;
}

// ---------------------------------------------------------------------------
// Lab state
// ---------------------------------------------------------------------------

const LAB = {
  mode: 'legacy',
  currentMatrix: 'A',
  canvas: null,
  buildMeta: null,
  initialized: false,
};

const DNA = {
  ready: false,
  error: null,
  genome: null,
  renderer: null,
  details: null,
};

const MATRIX_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth) {
  const value = String(text == null ? '' : text);
  if (ctx.measureText(value).width <= maxWidth) return value;
  let lo = 0;
  let hi = value.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(value.slice(0, mid) + '…').width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return value.slice(0, lo) + '…';
}

function stringHash(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function slug(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'weapon';
}

function buildHash() {
  return LAB.buildMeta && LAB.buildMeta.hash ? LAB.buildMeta.hash.slice(0, 10) : 'n/a';
}

function componentName(map, id) {
  const entry = map && map[id];
  return entry && entry.name ? entry.name : String(id);
}

// Deterministic strike history so evidence is reproducible run to run.
function forgeHistory(seed, count) {
  let state = (seed >>> 0) || 1;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const kinds = ['weak', 'good', 'perfect', 'hard'];
  const zones = ['base', 'mid', 'tip'];
  const history = [];
  for (let i = 1; i <= count; i += 1) {
    history.push({
      strike: i,
      kind: kinds[Math.floor(next() * 4) % 4],
      force: 0.35 + 0.6 * next(),
      inHeat: next() > 0.12,
      zone: zones[Math.floor(next() * 3) % 3],
    });
  }
  return history;
}

function makeSword(design, quality, extra) {
  const base = {
    id: 'sw_' + slug(design.name) + '_q' + quality,
    design: Object.assign({}, design),
    quality: quality,
    grade: gradeFor(quality),
    heatScore: 0.8,
    forgeScore: 0.77,
    quenchScore: 0.82,
    warp: 0,
    createdAt: 1730000000000,
  };
  return Object.assign(base, extra || {});
}

function pixelBBox(canvas, threshold) {
  const w = canvas.width;
  const h = canvas.height;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y += 1) {
    const row = y * w * 4;
    for (let x = 0; x < w; x += 1) {
      if (data[row + x * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Render one weapon on a transparent offscreen canvas, centred at its hilt.
// Returns the actual ink bounding box so callers can frame it perfectly
// regardless of which renderer (legacy or DNA) drew it.
function rasterize(source, lengthPx, mode) {
  const size = Math.max(320, Math.ceil(lengthPx * 2.2 + 220));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  try {
    if (mode === 'dna') {
      if (!DNA.ready) throw new Error('DNA renderer not available');
      DNA.renderer.drawWeaponFromSword(ctx, source, { x: cx, y: cy, lengthPx: lengthPx, angle: -Math.PI / 2 });
    } else {
      drawFinishedSword(ctx, source.design, cx, cy, lengthPx, {
        angle: -Math.PI / 2,
        quality: source.quality == null ? 80 : source.quality,
        warp: source.warp || 0,
        cracks: source.cracks || 0,
        broken: !!source.broken,
        physicalProfile: source.physicalProfile,
        runicCharge: source.design && source.design.runes ? 0.4 : 0,
      });
    }
  } catch (err) {
    return { error: String(err && err.message ? err.message : err), canvas: canvas, bbox: null, clipped: false };
  }
  const bbox = pixelBBox(canvas, 20);
  if (!bbox) return { error: 'renderer produced no pixels', canvas: canvas, bbox: null, clipped: false };
  const clipped = bbox.x <= 0 || bbox.y <= 0 || bbox.x + bbox.w >= size || bbox.y + bbox.h >= size;
  return { canvas: canvas, bbox: bbox, clipped: clipped };
}

function measureInk(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const br = parseInt(BG.slice(1, 3), 16);
  const bg = parseInt(BG.slice(3, 5), 16);
  const bb = parseInt(BG.slice(5, 7), 16);
  let ink = 0;
  const total = w * h;
  for (let i = 0; i < data.length; i += 4) {
    const dr = Math.abs(data[i] - br);
    const dg = Math.abs(data[i + 1] - bg);
    const db = Math.abs(data[i + 2] - bb);
    if (data[i + 3] > 0 && dr + dg + db > 30) ink += 1;
  }
  return ink / total;
}

// ---------------------------------------------------------------------------
// DNA module loading (gated: legacy capture must work before the engine lands)
// ---------------------------------------------------------------------------

async function loadDna() {
  try {
    const modules = await Promise.all([
      import('./.build/src/game/visuals/weaponGenome.js'),
      import('./.build/src/game/visuals/weaponRenderer.js'),
    ]);
    const genome = modules[0];
    const renderer = modules[1];
    if (typeof genome.deriveWeaponVisualGenome !== 'function') {
      throw new Error('weaponGenome.js does not export deriveWeaponVisualGenome');
    }
    if (typeof renderer.drawWeaponFromSword !== 'function') {
      throw new Error('weaponRenderer.js does not export drawWeaponFromSword');
    }
    DNA.genome = genome;
    DNA.renderer = renderer;
    DNA.ready = true;
    DNA.details = {
      genomeExports: Object.keys(genome),
      rendererExports: Object.keys(renderer),
    };
  } catch (err) {
    DNA.ready = false;
    DNA.error = String(err && err.message ? err.message : err);
  }
}

async function loadBuildMeta() {
  try {
    const response = await fetch('./.build/build-meta.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    LAB.buildMeta = await response.json();
  } catch (err) {
    LAB.buildMeta = null;
  }
}

// ---------------------------------------------------------------------------
// Weapon fixtures (matrix contents)
// ---------------------------------------------------------------------------

const FAMILY_ORDER = ['iron', 'royal', 'damascus', 'oriental', 'elven', 'runic', 'meteor', 'imperial', 'relic'];

const PROFILE_LENGTH = {
  short: 0.94,
  long: 1.0,
  claymore: 1.1,
  falchion: 1.0,
  saber: 1.03,
  katana: 1.04,
  elven_blade: 1.02,
  relic_blade: 1.08,
};

function familyDesign(familyId) {
  const family = FAMILIES[familyId];
  const profile = family.defaultProfile;
  return {
    name: family.name,
    family: familyId,
    profile: profile,
    steel: family.defaultSteel,
    wrap: family.defaultWrap,
    guard: family.defaultGuard,
    pommel: family.defaultPommel,
    inscription: family.name.toUpperCase().slice(0, 12),
    runes: familyId === 'runic' || familyId === 'relic' || familyId === 'elven',
    length: PROFILE_LENGTH[profile] || 1,
  };
}

function familiesSpec() {
  const items = FAMILY_ORDER.map((familyId) => {
    const design = familyDesign(familyId);
    const source = makeSword(design, 86, {
      history: forgeHistory(stringHash('family:' + familyId), 20),
    });
    return {
      label: FAMILIES[familyId].name,
      sub: componentName(PROFILES, design.profile) + ' · ' + componentName(STEELS, design.steel),
      source: source,
    };
  });
  return {
    id: 'A',
    title: 'MATRIX A · Families',
    subtitle: 'One representative weapon per family — same quality band (86), 9 families',
    cols: 3,
    cellW: 440,
    cellH: 400,
    items: items,
  };
}

function qualitySpec() {
  const preset = CANONICAL_PRESETS.find((p) => p.id === 'guarda_medieval') || CANONICAL_PRESETS[0];
  const rows = [
    { q: 35, warp: 0.42, cracks: 3 },
    { q: 68, warp: 0.12, cracks: 0 },
    { q: 96, warp: 0, cracks: 0 },
  ];
  const items = rows.map((row) => {
    const source = makeSword(preset.design, row.q, {
      warp: row.warp,
      cracks: row.cracks,
      heatScore: 0.55 + 0.42 * (row.q / 100),
      forgeScore: 0.52 + 0.44 * (row.q / 100),
      quenchScore: 0.5 + 0.46 * (row.q / 100),
      history: forgeHistory(7000 + row.q, 22),
    });
    return {
      label: 'Qualidade ' + row.q + ' · ' + gradeFor(row.q),
      sub: 'warp ' + row.warp.toFixed(2) + ' · cracks ' + row.cracks + ' · ' + preset.name,
      source: source,
    };
  });
  return {
    id: 'B',
    title: 'MATRIX B · Quality',
    subtitle: 'The same border sword forged at quality 35 (Defeituosa), 68 (Boa) and 96 (Obra-prima)',
    cols: 3,
    cellW: 440,
    cellH: 470,
    items: items,
  };
}

function individualitySpec() {
  const variants = [
    { name: 'Cimitarra do Crepúsculo', guard: 'curved', wrap: 'braided', pommel: 'sphere', q: 74, warp: 0.03, len: 1.0 },
    { name: 'Lâmina da Maré', guard: 'cross', wrap: 'leather', pommel: 'disc', q: 88, warp: 0.06, len: 1.02 },
    { name: 'Gume do Falcão', guard: 'wings', wrap: 'goldwire', pommel: 'crown', q: 92, warp: 0.04, len: 1.0 },
    { name: 'Cimitarra das Dunas', guard: 'tsuba', wrap: 'tsukamaki', pommel: 'crescent', q: 81, warp: 0.1, len: 0.98 },
    { name: 'Gume do Juramento', guard: 'leaf', wrap: 'elven_wood', pommel: 'elven', q: 90, warp: 0.02, len: 1.03 },
    { name: 'Cimitarra Noturna', guard: 'runic', wrap: 'bone', pommel: 'knot', q: 67, warp: 0.16, len: 1.01 },
  ];
  const items = variants.map((variant, index) => {
    const design = {
      name: variant.name,
      family: 'damascus',
      profile: 'falchion',
      steel: 'damascus',
      wrap: variant.wrap,
      guard: variant.guard,
      pommel: variant.pommel,
      inscription: variant.name.toUpperCase().slice(0, 12),
      runes: false,
      length: variant.len,
    };
    const source = makeSword(design, variant.q, {
      warp: variant.warp,
      heatScore: 0.6 + 0.08 * index,
      forgeScore: 0.64 + 0.05 * index,
      quenchScore: 0.62 + 0.06 * index,
      history: forgeHistory(stringHash('identity:' + index), 24),
    });
    return {
      label: variant.name,
      sub: 'q' + variant.q + ' · ' + componentName(GUARDS, variant.guard) + ' · ' + componentName(WRAPS, variant.wrap) + ' · ' + componentName(POMMELS, variant.pommel),
      source: source,
    };
  });
  return {
    id: 'C',
    title: 'MATRIX C · Individuality',
    subtitle: 'Same damascus family, six identities — differing components, weights and forge history',
    cols: 3,
    cellW: 440,
    cellH: 400,
    items: items,
  };
}

function componentsSpec() {
  const mounts = [
    { guard: 'cross', wrap: 'leather', pommel: 'disc' },
    { guard: 'curved', wrap: 'braided', pommel: 'sphere' },
    { guard: 'tsuba', wrap: 'tsukamaki', pommel: 'crescent' },
    { guard: 'leaf', wrap: 'elven_wood', pommel: 'elven' },
    { guard: 'wings', wrap: 'goldwire', pommel: 'crown' },
    { guard: 'runic', wrap: 'bone', pommel: 'wolf' },
  ];
  const items = mounts.map((mount, index) => {
    const design = {
      name: 'Lâmina de Referência',
      family: 'iron',
      profile: 'long',
      steel: 'steel',
      wrap: mount.wrap,
      guard: mount.guard,
      pommel: mount.pommel,
      inscription: 'GENOMA',
      runes: false,
      length: 0.95,
    };
    const source = makeSword(design, 84, {
      warp: 0.05,
      heatScore: 0.83,
      forgeScore: 0.79,
      quenchScore: 0.81,
      history: forgeHistory(90210, 20),
    });
    return {
      label: componentName(GUARDS, mount.guard),
      sub: componentName(WRAPS, mount.wrap) + ' · ' + componentName(POMMELS, mount.pommel),
      source: source,
    };
  });
  return {
    id: 'D',
    title: 'MATRIX D · Components',
    subtitle: 'One blade genome (same forge, steel and length) with six guard / grip / pommel combinations',
    cols: 3,
    cellW: 440,
    cellH: 400,
    items: items,
  };
}

function attributesSpec() {
  const offence = makeSword(
    {
      name: 'Vingadora de Aço',
      family: 'royal',
      profile: 'long',
      steel: 'steel',
      wrap: 'leather',
      guard: 'cross',
      pommel: 'disc',
      inscription: 'IRA',
      runes: false,
      length: 1.06,
    },
    91,
    {
      combatRole: 'Ofensiva',
      damage: 92,
      defense: 38,
      agility: 46,
      durability: 74,
      baseDamage: 78,
      baseDefense: 34,
      baseAgility: 40,
      baseDurability: 72,
      history: forgeHistory(stringHash('attr:offence'), 22),
    },
  );
  const defence = makeSword(
    {
      name: 'Baluarte de Ferro',
      family: 'iron',
      profile: 'claymore',
      steel: 'iron',
      wrap: 'braided',
      guard: 'imperial',
      pommel: 'crown',
      inscription: 'MURO',
      runes: false,
      length: 1.0,
    },
    89,
    {
      combatRole: 'Defensiva',
      damage: 48,
      defense: 94,
      agility: 22,
      durability: 98,
      baseDamage: 42,
      baseDefense: 80,
      baseAgility: 20,
      baseDurability: 92,
      history: forgeHistory(stringHash('attr:defence'), 22),
    },
  );
  const agility = makeSword(
    {
      name: 'Sopro de Vidro',
      family: 'oriental',
      profile: 'katana',
      steel: 'blacksteel',
      wrap: 'tsukamaki',
      guard: 'tsuba',
      pommel: 'crescent',
      inscription: 'SOPRO',
      runes: false,
      length: 0.9,
    },
    93,
    {
      combatRole: 'Ágil',
      damage: 66,
      defense: 40,
      agility: 95,
      durability: 55,
      baseDamage: 58,
      baseDefense: 36,
      baseAgility: 82,
      baseDurability: 54,
      history: forgeHistory(stringHash('attr:agility'), 22),
    },
  );
  const items = [
    { label: 'Ofensiva · P.ATK 92', sub: 'damage 92 · defense 38 · agility 46', source: offence },
    { label: 'Defensiva · DEF 94', sub: 'damage 48 · defense 94 · agility 22', source: defence },
    { label: 'Ágil · AGI 95', sub: 'damage 66 · defense 40 · agility 95', source: agility },
  ];
  return {
    id: 'E',
    title: 'MATRIX E · Attributes',
    subtitle: 'Offensive / defensive / agile weapons — attributes and geometry must stay coherent',
    cols: 3,
    cellW: 440,
    cellH: 470,
    items: items,
  };
}

const HERO_PRESETS = ['guarda_medieval', 'cimitarra_damasco', 'lua_silenciosa', 'folha_aereth', 'queda_asterion'];

function shortPresetName(name) {
  const index = name.indexOf(' (');
  return index >= 0 ? name.slice(0, index) : name;
}

function heroSources() {
  return HERO_PRESETS.map((presetId, index) => {
    const preset = CANONICAL_PRESETS.find((p) => p.id === presetId) || CANONICAL_PRESETS[index % CANONICAL_PRESETS.length];
    return {
      preset: preset,
      source: makeSword(preset.design, 90, {
        heatScore: 0.88,
        forgeScore: 0.86,
        quenchScore: 0.9,
        history: forgeHistory(stringHash('hero:' + presetId), 24),
      }),
    };
  });
}

function legacyVsDnaSpec() {
  const heroes = heroSources();
  const items = [];
  for (const hero of heroes) {
    items.push({
      label: shortPresetName(hero.preset.name),
      sub: 'legacy · drawFinishedSword',
      source: hero.source,
      mode: 'legacy',
    });
  }
  for (const hero of heroes) {
    items.push({
      label: shortPresetName(hero.preset.name),
      sub: 'DNA · drawWeaponFromSword',
      source: hero.source,
      mode: 'dna',
      missingIfNoDna: true,
    });
  }
  return {
    id: 'G',
    title: 'MATRIX G · Legacy vs DNA',
    subtitle: 'The five canonical hero weapons — legacy swordDraw.ts (top) vs Weapon DNA renderer (bottom)',
    cols: 5,
    cellW: 252,
    cellH: 424,
    rowLabels: ['LEGACY', 'DNA'],
    mixedMode: true,
    items: items,
  };
}

function scaleSpec() {
  const preset = CANONICAL_PRESETS.find((p) => p.id === 'guarda_medieval') || CANONICAL_PRESETS[0];
  const source = makeSword(preset.design, 90, {
    history: forgeHistory(stringHash('hero:scale'), 24),
  });
  const sizes = [
    { lengthPx: 180, label: 'CARD · 180 px', sub: 'viewport lengthPx = 180' },
    { lengthPx: 420, label: 'INSPECTION · 420 px', sub: 'viewport lengthPx = 420' },
    { lengthPx: 900, label: 'PRESENTATION · 900 px', sub: 'viewport lengthPx = 900' },
  ];
  return {
    id: 'F',
    kind: 'scale',
    title: 'MATRIX F · Scale',
    subtitle: 'Same weapon at card (~180 px), inspection (~420 px), presentation (~900 px) — 1:1 scale, shared baseline',
    items: sizes.map((size) => ({ label: size.label, sub: size.sub, lengthPx: size.lengthPx, source: source })),
  };
}

function matrixSpec(id) {
  switch (id) {
    case 'A': return familiesSpec();
    case 'B': return qualitySpec();
    case 'C': return individualitySpec();
    case 'D': return componentsSpec();
    case 'E': return attributesSpec();
    case 'F': return scaleSpec();
    case 'G': return legacyVsDnaSpec();
    default: throw new Error('Unknown matrix id: ' + id);
  }
}

// ---------------------------------------------------------------------------
// Layout planning (canvas sizes, no drawing)
// ---------------------------------------------------------------------------

function planSpec(spec) {
  if (spec.kind === 'scale') {
    const maxLen = Math.max.apply(null, spec.items.map((item) => item.lengthPx));
    const panelH = Math.ceil(maxLen * 1.22) + 30;
    const panels = spec.items.map((item) => ({ w: Math.ceil(item.lengthPx * 1.35) + 24 }));
    const panelsWidth = panels.reduce((sum, panel) => sum + panel.w, 0);
    const width = MARGIN * 2 + panelsWidth + GRID_GAP * (panels.length - 1);
    const height = HEADER_H + 34 + panelH + 70 + FOOTER_H;
    return { width: width, height: height, panelH: panelH, panels: panels };
  }
  const rows = Math.ceil(spec.items.length / spec.cols);
  const gutter = spec.rowLabels ? 96 : 0;
  const width = MARGIN * 2 + gutter + spec.cols * spec.cellW + (spec.cols - 1) * GRID_GAP;
  const height = HEADER_H + rows * spec.cellH + (rows - 1) * GRID_GAP + FOOTER_H + 14;
  return { rows: rows, gutter: gutter, width: width, height: height };
}

// ---------------------------------------------------------------------------
// Canvas drawing
// ---------------------------------------------------------------------------

function drawHeader(ctx, width, spec) {
  ctx.save();
  ctx.fillStyle = PANEL;
  ctx.fillRect(0, 0, width, HEADER_H);
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HEADER_H + 0.5);
  ctx.lineTo(width, HEADER_H + 0.5);
  ctx.stroke();

  ctx.fillStyle = ACCENT;
  ctx.fillRect(MARGIN, 30, 5, 38);

  // Measure the right-hand provenance block so the title/subtitle never collide
  // with it on narrow canvases (matrix F is intentionally narrow).
  ctx.textAlign = 'right';
  ctx.font = font(650, 13);
  const badgeW = Math.max(
    ctx.measureText('RENDERER · LEGACY').width,
    (ctx.font = font(400, 12), ctx.measureText('build ' + buildHash()).width),
    ctx.measureText('M02-weapon-dna').width,
  );
  const textWidth = Math.max(160, width - MARGIN * 2 - 18 - badgeW - 28);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = TEXT;
  ctx.font = font(650, 26);
  ctx.fillText(fitText(ctx, spec.title, textWidth), MARGIN + 18, 47);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 15);
  ctx.fillText(fitText(ctx, spec.subtitle, textWidth), MARGIN + 18, 78);

  ctx.textAlign = 'right';
  ctx.fillStyle = DNA.ready ? GOOD : WARN;
  ctx.font = font(650, 13);
  ctx.fillText('RENDERER · ' + LAB.mode.toUpperCase(), width - MARGIN, 44);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 12);
  ctx.fillText('build ' + buildHash(), width - MARGIN, 64);
  ctx.fillText('M02-weapon-dna', width - MARGIN, 82);
  ctx.restore();
}

function drawFooter(ctx, width, height, spec) {
  ctx.save();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height - FOOTER_H + 0.5);
  ctx.lineTo(width, height - FOOTER_H + 0.5);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  const rightText = 'MODE ' + (spec.mixedMode ? 'LEGACY + DNA' : LAB.mode.toUpperCase()) + ' · ' + spec.id;
  const longLeft = 'M02 · Weapon DNA visual lab · evidence: experiments/M02-weapon-dna/evidence/ · regenerate: node experiments/M02-weapon-dna/capture.mjs';
  const shortLeft = 'M02 · Weapon DNA visual lab · experiments/M02-weapon-dna/';
  ctx.font = font(400, 12);
  ctx.textAlign = 'right';
  ctx.fillStyle = MUTED;
  const rightWidth = ctx.measureText(rightText).width;
  ctx.fillText(rightText, width - MARGIN, height - FOOTER_H / 2);
  const leftMax = width - MARGIN * 2 - rightWidth - 24;
  const leftText = ctx.measureText(longLeft).width <= leftMax ? longLeft : shortLeft;
  ctx.textAlign = 'left';
  ctx.fillText(fitText(ctx, leftText, leftMax), MARGIN, height - FOOTER_H / 2);
  ctx.restore();
}

function drawCellFrame(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = CELL;
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = CELL_BORDER;
  ctx.lineWidth = 1;
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 10);
  ctx.stroke();
  ctx.restore();
}

function drawPlaceholder(ctx, box, heading, detail) {
  ctx.save();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 1.5;
  roundRect(ctx, box.x + 8, box.y + 8, box.w - 16, box.h - 16, 8);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = WARN;
  ctx.font = font(600, 15);
  ctx.fillText(fitText(ctx, heading, box.w - 30), box.x + box.w / 2, box.y + box.h / 2 - 10);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 12);
  ctx.fillText(fitText(ctx, detail, box.w - 30), box.x + box.w / 2, box.y + box.h / 2 + 14);
  ctx.restore();
}

function drawWeaponFit(ctx, box, item, mode) {
  const lengthPx = item.lengthPx || 560;
  const raster = rasterize(item.source, lengthPx, mode);
  if (raster.error) {
    drawPlaceholder(ctx, box, 'render error', raster.error);
    return { label: item.label, mode: mode, error: raster.error };
  }
  const b = raster.bbox;
  const scale = Math.min(box.w / b.w, box.h / b.h) * 0.94;
  const drawW = b.w * scale;
  const drawH = b.h * scale;
  const dx = box.x + (box.w - drawW) / 2;
  const dy = box.y + (box.h - drawH) / 2;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(raster.canvas, b.x, b.y, b.w, b.h, dx, dy, drawW, drawH);
  ctx.restore();
  return {
    label: item.label,
    mode: mode,
    bbox: { w: b.w, h: b.h },
    scale: Math.round(scale * 1000) / 1000,
    clipped: raster.clipped,
    fitted: false,
  };
}

function drawCell(ctx, x, y, w, h, item, mode, options) {
  drawCellFrame(ctx, x, y, w, h);
  const imageBox = { x: x + CELL_PAD, y: y + CELL_PAD, w: w - CELL_PAD * 2, h: h - CELL_PAD * 2 - LABEL_H };
  const missing = item.missingIfNoDna && mode === 'dna' && !DNA.ready;
  let info;
  if (missing) {
    drawPlaceholder(ctx, imageBox, 'DNA renderer pending', 'weaponRenderer.ts not available yet');
    info = { label: item.label, mode: mode, missing: true };
  } else {
    info = drawWeaponFit(ctx, imageBox, item, mode);
    info.missing = false;
  }

  const labelY = y + h - CELL_PAD - LABEL_H + 26;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = TEXT;
  ctx.font = font(600, 16);
  ctx.fillText(fitText(ctx, item.label, w - 22), x + w / 2, labelY);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 13);
  ctx.fillText(fitText(ctx, item.sub || '', w - 22), x + w / 2, labelY + 21);
  if (options && options.cellBadge) {
    ctx.textAlign = 'left';
    ctx.fillStyle = mode === 'dna' ? GOOD : MUTED;
    ctx.font = font(650, 10);
    ctx.fillText(mode === 'dna' ? 'DNA' : 'LEGACY', x + CELL_PAD + 2, y + CELL_PAD + 12);
  }
  ctx.restore();
  return info;
}

function drawGridMatrix(ctx, spec, plan) {
  const infos = [];
  const rows = plan.rows;
  if (spec.rowLabels) {
    ctx.save();
    ctx.fillStyle = MUTED;
    ctx.font = font(650, 12);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let row = 0; row < rows; row += 1) {
      const y = HEADER_H + row * (spec.cellH + GRID_GAP) + spec.cellH / 2;
      ctx.fillText(spec.rowLabels[row] || '', MARGIN, y);
    }
    ctx.restore();
  }
  for (let index = 0; index < spec.items.length; index += 1) {
    const item = spec.items[index];
    const row = Math.floor(index / spec.cols);
    const col = index % spec.cols;
    const x = MARGIN + plan.gutter + col * (spec.cellW + GRID_GAP);
    const y = HEADER_H + row * (spec.cellH + GRID_GAP);
    const mode = item.mode || LAB.mode;
    infos.push(drawCell(ctx, x, y, spec.cellW, spec.cellH, item, mode, { cellBadge: spec.mixedMode }));
  }
  return infos;
}

// Matrix F must stay at true scale (1:1). Pre-rasterise each stage so the panels
// can be sized to the real ink bounds instead of guessing a uniform width.
function prepareScale(spec) {
  const rasters = spec.items.map((item) => {
    const mode = item.mode || LAB.mode;
    return { raster: rasterize(item.source, item.lengthPx, mode), mode: mode };
  });
  const panels = spec.items.map((item, index) => {
    const raster = rasters[index].raster;
    const b = raster.bbox;
    const rawWidth = b ? b.w : item.lengthPx * 0.25;
    const rawHeight = b ? b.h : item.lengthPx * 1.2;
    return {
      w: Math.ceil(Math.max(180, rawWidth + 110)),
      h: Math.ceil(rawHeight + 84),
    };
  });
  const maxHeight = Math.max.apply(null, panels.map((panel) => panel.h));
  for (const panel of panels) panel.h = maxHeight;

  const panelsWidth = panels.reduce((sum, panel) => sum + panel.w, 0);
  const width = MARGIN * 2 + panelsWidth + GRID_GAP * (panels.length - 1);
  const height = HEADER_H + 34 + maxHeight + 84 + FOOTER_H;
  const baselineY = HEADER_H + 34 + maxHeight - 30;
  return {
    plan: { width: width, height: height, panels: panels, baselineY: baselineY },
    rasters: rasters,
  };
}

function drawScaleMatrix(ctx, spec, prepared) {
  const plan = prepared.plan;
  const infos = [];
  const top = HEADER_H + 34;
  let x = MARGIN;
  const baselineY = plan.baselineY;

  // Shared baseline so the 180/420/900 px stages compare directly.
  ctx.save();
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(MARGIN, baselineY + 0.5);
  ctx.lineTo(plan.width - MARGIN, baselineY + 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = MUTED;
  ctx.font = font(400, 11);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('baseline (bottom of every weapon)', MARGIN, baselineY + 16);
  ctx.restore();

  for (let index = 0; index < spec.items.length; index += 1) {
    const item = spec.items[index];
    const panelW = plan.panels[index].w;
    const panelH = plan.panels[index].h;
    const mode = prepared.rasters[index].mode;
    const panel = { x: x, y: top, w: panelW, h: panelH };

    drawCellFrame(ctx, panel.x, panel.y, panel.w, panel.h);

    const raster = prepared.rasters[index].raster;
    let info;
    if (raster.error) {
      drawPlaceholder(ctx, panel, 'render error', raster.error);
      info = { label: item.label, mode: mode, error: raster.error };
    } else {
      const b = raster.bbox;
      let scale = 1;
      let fitted = false;
      // Panels are sized from the measured ink, so this is only a safety net.
      if (b.w + 32 > panel.w || b.h + 52 > panel.h) {
        scale = Math.min((panel.w - 32) / b.w, (panel.h - 52) / b.h);
        fitted = true;
      }
      const drawW = b.w * scale;
      const drawH = b.h * scale;
      const dx = panel.x + (panel.w - drawW) / 2;
      const dy = baselineY - drawH;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(raster.canvas, b.x, b.y, b.w, b.h, dx, dy, drawW, drawH);
      ctx.restore();
      info = {
        label: item.label,
        mode: mode,
        lengthPx: item.lengthPx,
        bbox: { w: b.w, h: b.h },
        drawPx: { w: Math.round(drawW), h: Math.round(drawH) },
        scale: Math.round(scale * 1000) / 1000,
        clipped: raster.clipped,
        fitted: fitted,
      };
    }
    const labelY = panel.y + panel.h + 30;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = TEXT;
    ctx.font = font(650, 17);
    ctx.fillText(item.label, panel.x + panel.w / 2, labelY);
    ctx.fillStyle = MUTED;
    ctx.font = font(400, 13);
    ctx.fillText(item.sub, panel.x + panel.w / 2, labelY + 22);
    ctx.restore();

    infos.push(info);
    x += panelW + GRID_GAP;
  }
  return infos;
}

// ---------------------------------------------------------------------------
// Rendering entry point
// ---------------------------------------------------------------------------

function renderMatrix(id) {
  const spec = matrixSpec(id);
  const preparedScale = spec.kind === 'scale' ? prepareScale(spec) : null;
  const plan = preparedScale ? preparedScale.plan : planSpec(spec);
  const canvas = LAB.canvas;
  canvas.width = plan.width;
  canvas.height = plan.height;
  canvas.style.width = plan.width + 'px';
  canvas.style.height = plan.height + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, plan.width, plan.height);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, plan.width, plan.height);

  drawHeader(ctx, plan.width, spec);
  let items;
  if (spec.kind === 'scale') items = drawScaleMatrix(ctx, spec, preparedScale);
  else items = drawGridMatrix(ctx, spec, plan);
  drawFooter(ctx, plan.width, plan.height, spec);

  const inkRatio = measureInk(canvas);
  const warnings = [];
  for (const item of items) {
    if (item.error) warnings.push(item.label + ': ' + item.error);
    if (item.missing) warnings.push(item.label + ': DNA renderer pending');
    if (item.clipped) warnings.push(item.label + ': weapon may be clipped by raster bounds');
    if (item.fitted) warnings.push(item.label + ': scaled to fit true-size panel');
  }
  if (spec.kind !== 'scale' && inkRatio < 0.004) warnings.push('canvas appears blank (inkRatio ' + inkRatio.toFixed(4) + ')');

  LAB.currentMatrix = id;
  LAB.lastRender = { id: id, plan: plan, spec: spec, warnings: warnings };
  updateControls();
  updateStatus(id, plan, warnings);

  return {
    id: id,
    title: spec.title,
    subtitle: spec.subtitle,
    width: plan.width,
    height: plan.height,
    mode: spec.mixedMode ? 'mixed' : LAB.mode,
    items: items,
    inkRatio: Math.round(inkRatio * 10000) / 10000,
    warnings: warnings,
    buildHash: buildHash(),
    dnaReady: DNA.ready,
    dnaError: DNA.error,
  };
}

// ---------------------------------------------------------------------------
// Mode switching + UI
// ---------------------------------------------------------------------------

function setMode(mode) {
  if (mode !== 'legacy' && mode !== 'dna') throw new Error('Unknown renderer mode: ' + mode);
  if (mode === 'dna' && !DNA.ready) throw new Error('DNA renderer not ready: ' + (DNA.error || 'unknown error'));
  LAB.mode = mode;
  updateHud();
  updateControls();
  if (LAB.initialized && LAB.canvas) renderMatrix(LAB.currentMatrix || 'A');
  return LAB.mode;
}

function updateControls() {
  const buttons = document.querySelectorAll('#matrices button');
  buttons.forEach((button) => {
    button.classList.toggle('active', button.dataset.matrix === LAB.currentMatrix);
  });
  const modeButton = document.getElementById('mode-toggle');
  if (modeButton) {
    modeButton.textContent = 'mode: ' + LAB.mode;
    modeButton.disabled = !DNA.ready;
  }
}

function updateHud() {
  const dot = document.getElementById('engine-dot');
  const label = document.getElementById('engine-label');
  const hash = document.getElementById('build-hash');
  const renderer = document.getElementById('renderer-label');
  if (dot) dot.className = 'dot ' + (DNA.ready ? 'ok' : 'warn');
  if (label) {
    label.textContent = DNA.ready ? 'DNA engine ready' : 'DNA engine pending';
    label.title = DNA.error || '';
  }
  if (hash) hash.textContent = buildHash();
  if (renderer) renderer.textContent = LAB.mode;
}

function updateStatus(id, plan, warnings) {
  const meta = document.getElementById('matrix-meta');
  if (meta) {
    meta.textContent = id + ' · ' + plan.width + '×' + plan.height + ' px · ' + (warnings.length ? warnings.length + ' warning(s)' : 'clean');
    meta.style.color = warnings.length ? WARN : MUTED;
  }
}

function bindControls() {
  const host = document.getElementById('matrices');
  if (!host) return;
  host.innerHTML = '';
  for (const id of MATRIX_ORDER) {
    const button = document.createElement('button');
    button.textContent = id;
    button.dataset.matrix = id;
    button.title = 'Matrix ' + id;
    button.addEventListener('click', () => renderMatrix(id));
    host.appendChild(button);
  }
  const modeButton = document.getElementById('mode-toggle');
  if (modeButton) {
    modeButton.addEventListener('click', () => {
      if (!DNA.ready) return;
      setMode(LAB.mode === 'dna' ? 'legacy' : 'dna');
    });
  }
}

// ---------------------------------------------------------------------------
// Public API + boot
// ---------------------------------------------------------------------------

window.__lab = {
  setMode: setMode,
  getMode: function () { return LAB.mode; },
  listMatrices: function () {
    return MATRIX_ORDER.map((id) => {
      const spec = matrixSpec(id);
      const plan = planSpec(spec);
      return { id: id, title: spec.title, width: plan.width, height: plan.height, mixedMode: !!spec.mixedMode };
    });
  },
  renderMatrix: renderMatrix,
  diagnostics: function () {
    return {
      mode: LAB.mode,
      currentMatrix: LAB.currentMatrix,
      dnaReady: DNA.ready,
      dnaError: DNA.error,
      dnaDetails: DNA.details,
      buildHash: buildHash(),
      buildMeta: LAB.buildMeta,
      webgl: null,
    };
  },
};

async function boot() {
  LAB.canvas = document.getElementById('matrix-canvas');
  bindControls();
  await loadDna();
  await loadBuildMeta();
  updateHud();
  LAB.mode = DNA.ready ? 'dna' : 'legacy';
  updateControls();
  await document.fonts.ready;
  LAB.initialized = true;
  renderMatrix('A');
  window.__LAB_READY__ = true;
}

boot().catch((err) => {
  window.__LAB_ERROR__ = String(err && err.stack ? err.stack : err);
  const label = document.getElementById('engine-label');
  if (label) {
    label.textContent = 'lab failed to boot: ' + err;
    label.style.color = BAD;
  }
  console.error('[lab] boot failed', err);
});

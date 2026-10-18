// FioForja — WEAPON DNA / ORNAMENTATION
//
// Runes, guard filigree, pommel engraving/gems and grip inlays. Everything here
// is decoration ON TOP of a material that already exists: it must read as cut,
// stamped or inlaid metal, never as a sticker or a HUD glow.
//
// Rune incision order (aesthetic bible sections 9-10):
//   1. excavated groove: dark interior plus an offset depth shadow;
//   2. inner wall catch light, on ONE side only (directional light, upper-left);
//   3. fill material taken from the genome (silver / gold / oxide / empty);
//   4. controlled emission INSIDE the groove only, capped by genome emission,
//      never a halo. Inactive / low quality pieces stay purely physical.
//
// Runes follow the blade curvature: every glyph is positioned and rotated by the
// local tangent, and the run is clamped to [0.06L, 0.92L] and to the local half
// width so it can never cross the guard or leave the silhouette.
//
// Determinism comes from makeGenomeRng(subSeeds.inscription / guard / pommel /
// grip). Canvas 2D only. Every export saves/restores and clips to its part.

import { clamp, clamp01, lerp, makeGenomeRng } from "./math.ts";
import type { Pt, WeaponGeometry } from "./types.ts";
import type { WeaponVisualGenome } from "./weaponGenome.ts";
import {
  alloyPaint,
  bladeEdgeSide,
  bladeLateralPoint,
  guardExtentBox,
  outlineBox,
  platingPaint,
  traceBand,
  traceLateral,
} from "./materials.ts";
import {
  bladePath,
  guardPath,
  gripPath,
  pommelPath,
} from "./geometry.ts";

const MIN_RUNE_T = 0.06;
const MAX_RUNE_T = 0.92;

function fontFor(size: number): string {
  const s = clamp(size, 0.004, 0.2).toFixed(4);
  return "600 " + s + "px Cinzel, 'Segoe UI Historic', 'Noto Sans Runic', serif";
}

function fillColorOf(genome: WeaponVisualGenome): string {
  const fill = genome.inscriptions.fill;
  if (fill && typeof fill.color === "string" && fill.color.length > 0) return fill.color;
  return "rgba(196,204,214,0.85)";
}

function emissionColorOf(genome: WeaponVisualGenome): string {
  const kind = genome.inscriptions.fill ? genome.inscriptions.fill.kind : "silver";
  if (kind === "gold") return "rgba(255,206,124,1)";
  if (kind === "silver") return "rgba(184,226,255,1)";
  if (kind === "oxide") return "rgba(255,164,92,1)";
  return "rgba(168,210,242,1)";
}

interface RuneRun {
  chars: string[];
  widths: number[];
  fontSize: number;
  gap: number;
  startX: number;
  total: number;
  tStart: number;
  tEnd: number;
}

function layoutRun(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): RuneRun | null {
  const ins = genome.inscriptions;
  const text = (ins.text ?? "").trim();
  if (!text) return null;
  const chars = Array.from(text).slice(0, 26);
  if (chars.length === 0) return null;
  const L = geo.bladeLength;
  const posT = clamp(ins.positionT, 0.18, 0.8);
  const midHalf = geo.stationAt(clamp(posT, 0.05, 0.95)).halfWidth;
  if (!(midHalf > 0.002)) return null;

  // Glyph height ~= 0.22 of the local FULL blade width, per art direction.
  let fontSize = clamp(midHalf * 0.62, 0.0065, 0.028);
  ctx.font = fontFor(fontSize);
  let widths = chars.map((ch) => {
    const w = ctx.measureText(ch).width;
    return Number.isFinite(w) && w > 0 ? w : fontSize * 0.42;
  });
  let gap = fontSize * 0.06;
  let total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, chars.length - 1);

  // Never exceed the permitted run band.
  const allowed = L * (MAX_RUNE_T - MIN_RUNE_T) * 0.98;
  if (total > allowed && total > 1e-6) {
    const scale = allowed / total;
    fontSize *= scale;
    widths = widths.map((w) => w * scale);
    gap *= scale;
    total = allowed;
  }

  // Shrink until every glyph fits inside the local half width.
  const tForCenter = (x: number): number => clamp(x / Math.max(L, 1e-6), MIN_RUNE_T, MAX_RUNE_T);
  let startX = clamp(posT * L - total * 0.5, MIN_RUNE_T * L, MAX_RUNE_T * L - total);
  let minHalf = Infinity;
  for (let i = 0; i <= 6; i++) {
    const t = tForCenter(startX + (total * i) / 6);
    const h = geo.stationAt(t).halfWidth;
    if (h < minHalf) minHalf = h;
  }
  if (Number.isFinite(minHalf) && minHalf > 0.001) {
    const maxFont = minHalf * 0.95;
    if (fontSize > maxFont) {
      const scale = maxFont / fontSize;
      fontSize = maxFont;
      widths = widths.map((w) => w * scale);
      gap *= scale;
      total *= scale;
    }
  }
  startX = clamp(posT * L - total * 0.5, MIN_RUNE_T * L, Math.max(MIN_RUNE_T * L, MAX_RUNE_T * L - total));
  const tStart = tForCenter(startX);
  const tEnd = tForCenter(startX + total);
  return { chars, widths, fontSize: Math.max(0.006, fontSize), gap, startX, total, tStart, tEnd };
}

/** One carved border groove following the blade, centred on the text line. */
function drawRunBorder(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  centerU: number,
  offsetUnits: number,
  t0: number,
  t1: number,
  darkColor: string,
  lightColor: string,
  width: number,
): void {
  if (t1 <= t0) return;
  const lateralFor = (sign: number) => (t: number): number => {
    const st = geo.stationAt(t);
    const frac = offsetUnits / Math.max(st.halfWidth, 1e-4);
    return clamp(centerU + sign * frac, -0.92, 0.92);
  };
  ctx.lineCap = "round";
  for (const sign of [-1, 1]) {
    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = Math.max(0.00035, width);
    traceLateral(ctx, geo, lateralFor(sign), 26, t0, t1);
    ctx.stroke();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = Math.max(0.00028, width * 0.55);
    traceLateral(ctx, geo, (t) => lateralFor(sign)(t) * 0.985, 26, t0, t1);
    ctx.stroke();
  }
}

/** Short perpendicular chisel tick closing a band/channel end. */
function drawRunTick(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  centerU: number,
  halfFrac: number,
  t: number,
  darkColor: string,
  lightColor: string,
  width: number,
): void {
  const st = geo.stationAt(t);
  const side = bladeEdgeSide(geo);
  const a = bladeLateralPoint(st, clamp(centerU - halfFrac, -0.92, 0.92), side);
  const b = bladeLateralPoint(st, clamp(centerU + halfFrac, -0.92, 0.92), side);
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = darkColor;
  ctx.lineWidth = Math.max(0.00035, width);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = lightColor;
  ctx.lineWidth = Math.max(0.00025, width * 0.5);
  ctx.beginPath();
  ctx.moveTo(a.x - width * 0.6, a.y - width * 0.6);
  ctx.lineTo(b.x - width * 0.6, b.y - width * 0.6);
  ctx.stroke();
}

/** Small engraved flanking mark used by the triad composition. */
function drawFlankingMark(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  t: number,
  lateralU: number,
  size: number,
  groove: string,
  wall: string,
  material: string,
  materialAlpha: number,
): void {
  const st = geo.stationAt(clamp(t, MIN_RUNE_T, MAX_RUNE_T));
  if (st.halfWidth < 0.004) return;
  const s = Math.min(size, st.halfWidth * 0.42);
  const c = bladeLateralPoint(st, clamp(lateralU, -0.7, 0.7), bladeEdgeSide(geo));
  const angle = Math.atan2(st.tangent.y, st.tangent.x);
  ctx.save();
  try {
    ctx.translate(c.x, c.y);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = groove;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(0, s * 0.66);
    ctx.lineTo(-s, 0);
    ctx.lineTo(0, -s * 0.66);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.26;
    ctx.strokeStyle = wall;
    ctx.lineWidth = Math.max(0.00025, s * 0.11);
    ctx.beginPath();
    ctx.moveTo(-s * 0.7, -s * 0.42);
    ctx.lineTo(s * 0.7, -s * 0.42);
    ctx.stroke();
    if (materialAlpha > 0.01) {
      ctx.globalAlpha = materialAlpha;
      ctx.fillStyle = material;
      ctx.beginPath();
      ctx.moveTo(s * 0.4, 0);
      ctx.lineTo(0, s * 0.26);
      ctx.lineTo(-s * 0.4, 0);
      ctx.lineTo(0, -s * 0.26);
      ctx.closePath();
      ctx.fill();
    }
  } finally {
    ctx.restore();
  }
}

export interface InscriptionOptions {
  runicCharge?: number;
  heat?: number;
}

interface RuneMaterial {
  color: string;
  alpha: number;
}

/** Fill material is muted on purpose: the steel must never be outshone. */
function mutedFillMaterial(genome: WeaponVisualGenome): RuneMaterial {
  const kind = genome.inscriptions.fill ? genome.inscriptions.fill.kind : "silver";
  if (kind === "gold") return { color: "rgba(206,178,110,1)", alpha: 0.55 };
  if (kind === "silver") return { color: "rgba(178,192,206,1)", alpha: 0.52 };
  if (kind === "oxide") return { color: "rgba(44,38,32,1)", alpha: 0.6 };
  return { color: "rgba(18,15,12,1)", alpha: 0.55 };
}

export function paintInscription(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
  opts: InscriptionOptions = {},
): void {
  const ins = genome.inscriptions;
  const composition = ins.composition;
  const hasText = Boolean((ins.text ?? "").trim());
  const hasSymbol = Boolean(ins.symbol && ins.symbol.length > 0);
  if (!hasText && !hasSymbol) return;
  const heat = clamp01(opts.heat ?? 0);
  const charge = clamp01(opts.runicCharge ?? 0);
  const quality = clamp01(genome.quality.score / 100);
  const crude = genome.quality.score < 62;
  const side = bladeEdgeSide(geo);
  const rng = makeGenomeRng(genome.individuality.subSeeds.inscription);
  const material = mutedFillMaterial(genome);
  const materialAlpha = crude ? 0 : material.alpha * (0.85 + quality * 0.15);
  const groove = heat > 0.25 ? "rgba(20,8,4,0.9)" : "rgba(8,6,5,0.86)";
  const wall = heat > 0.25 ? "rgba(255,196,126,0.55)" : "rgba(226,200,158,0.5)";
  const emission = clamp(ins.emission, 0, 0.34);
  const run = layoutRun(ctx, geo, genome);
  // Inscription sits on the fuller / ridge line, never on the widest belly.
  const fuller = genome.structure.fuller;
  const textU = fuller.enabled ? clamp(fuller.offset, -0.52, 0.52) : 0;

  ctx.save();
  try {
    bladePath(ctx, geo);
    ctx.clip();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Composition furniture first: the text must sit inside a prepared cut.
    if (run && composition === "band") {
      const borderOff = run.fontSize * 0.82;
      drawRunBorder(ctx, geo, textU, borderOff, run.tStart, run.tEnd, groove, wall, run.fontSize * 0.07);
      const midHalf = Math.max(0.001, geo.stationAt((run.tStart + run.tEnd) * 0.5).halfWidth);
      const halfFrac = clamp((run.fontSize * 0.82) / midHalf, 0.12, 0.75);
      drawRunTick(ctx, geo, textU, halfFrac, run.tStart, groove, wall, run.fontSize * 0.06);
      drawRunTick(ctx, geo, textU, halfFrac, run.tEnd, groove, wall, run.fontSize * 0.06);
    } else if (run && composition === "straight") {
      const midHalf = Math.max(0.001, geo.stationAt((run.tStart + run.tEnd) * 0.5).halfWidth);
      const halfFrac = clamp((run.fontSize * 0.8) / midHalf, 0.12, 0.72);
      const low = clamp(textU - halfFrac, -0.92, 0.92);
      const high = clamp(textU + halfFrac, -0.92, 0.92);
      traceBand(ctx, geo, low, high, run.tStart - 0.015, run.tEnd + 0.015, 22);
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = groove;
      ctx.fill();
      drawRunBorder(ctx, geo, textU, run.fontSize * 0.78, run.tStart - 0.01, run.tEnd + 0.01, groove, wall, run.fontSize * 0.075);
      drawRunTick(ctx, geo, textU, halfFrac, run.tStart - 0.01, groove, wall, run.fontSize * 0.07);
      drawRunTick(ctx, geo, textU, halfFrac, run.tEnd + 0.01, groove, wall, run.fontSize * 0.07);
      drawRunTick(ctx, geo, textU, halfFrac * 0.5, run.tStart - 0.01, groove, wall, run.fontSize * 0.04);
      drawRunTick(ctx, geo, textU, halfFrac * 0.5, run.tEnd + 0.01, groove, wall, run.fontSize * 0.04);
    }

    if (run) {
      ctx.font = fontFor(run.fontSize);
      const emitActive = charge > 0.01 && emission > 0.001 && genome.quality.score >= 72;
      const emitAlpha = emitActive ? clamp(emission * (0.35 + charge * 0.65), 0, 0.34) : 0;
      let cursor = 0;
      for (let i = 0; i < run.chars.length; i++) {
        const ch = run.chars[i];
        const w = run.widths[i];
        const xCenter = run.startX + cursor + w * 0.5;
        cursor += w + run.gap;
        const t = clamp(xCenter / Math.max(geo.bladeLength, 1e-6), MIN_RUNE_T, MAX_RUNE_T);
        const st = geo.stationAt(t);
        if (st.halfWidth < 0.003) continue;
        const center = bladeLateralPoint(st, textU, side);
        const angle = Math.atan2(st.tangent.y, st.tangent.x);
        // Low quality = irregular hand-cut groove, but still legible.
        const rough = crude ? 1 : (1 - quality) * 0.45;
        const jitterAngle = rng.range(-1, 1) * rough * 0.06;
        const jitterX = rng.range(-1, 1) * rough * run.fontSize * 0.09;
        const jitterY = rng.range(-1, 1) * rough * run.fontSize * 0.1;
        const s = run.fontSize;
        ctx.save();
        try {
          ctx.translate(center.x + jitterX, center.y + jitterY);
          ctx.rotate(angle + jitterAngle);
          // 1. Excavated groove: wider dark cut + offset depth shadow + dark interior.
          ctx.globalAlpha = 0.82;
          ctx.strokeStyle = groove;
          ctx.lineWidth = Math.max(0.00035, s * (crude ? 0.2 : 0.15));
          ctx.strokeText(ch, 0, 0);
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = groove;
          ctx.fillText(ch, s * 0.035, s * 0.05);
          ctx.globalAlpha = 0.88;
          ctx.fillStyle = groove;
          ctx.fillText(ch, 0, 0);
          // 2. Single-sided warm wall highlight (light from the upper-left).
          ctx.globalAlpha = crude ? 0.16 : 0.34;
          ctx.strokeStyle = wall;
          ctx.lineWidth = Math.max(0.0003, s * 0.055);
          ctx.strokeText(ch, -s * 0.028, -s * 0.038);
          // 3. Fill material, muted, never outshining the steel.
          if (materialAlpha > 0.01) {
            ctx.globalAlpha = materialAlpha;
            ctx.fillStyle = material.color;
            ctx.fillText(ch, 0, 0);
          }
          // 4. Emission inside the groove only: glyph-shaped, no halo.
          if (heat > 0.25) {
            ctx.globalAlpha = 0.2 + heat * 0.16;
            ctx.fillStyle = "rgba(255,186,104,1)";
            ctx.fillText(ch, 0, 0);
          } else if (emitAlpha > 0.002) {
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = emitAlpha;
            ctx.fillStyle = emissionColorOf(genome);
            ctx.fillText(ch, 0, 0);
          }
        } finally {
          ctx.restore();
        }
      }

      if (composition === "triad") {
        const size = run.fontSize * 0.72;
        drawFlankingMark(ctx, geo, run.startX / geo.bladeLength - size / geo.bladeLength * 1.7, textU, size, groove, wall, material.color, materialAlpha);
        drawFlankingMark(ctx, geo, (run.startX + run.total) / geo.bladeLength + size / geo.bladeLength * 1.7, textU, size, groove, wall, material.color, materialAlpha);
      }
    } else if (hasSymbol && ins.symbol) {
      // One large rune symbol: same carved order, sized to 0.22 local width.
      const t = clamp(ins.positionT, MIN_RUNE_T, MAX_RUNE_T);
      const st = geo.stationAt(t);
      const size = clamp(st.halfWidth * 0.62, 0.007, 0.028);
      const c = bladeLateralPoint(st, textU, side);
      const angle = Math.atan2(st.tangent.y, st.tangent.x);
      ctx.save();
      try {
        ctx.translate(c.x, c.y);
        ctx.rotate(angle);
        ctx.font = fontFor(size);
        ctx.globalAlpha = 0.82;
        ctx.strokeStyle = groove;
        ctx.lineWidth = Math.max(0.00035, size * 0.15);
        ctx.strokeText(ins.symbol, 0, 0);
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = groove;
        ctx.fillText(ins.symbol, size * 0.035, size * 0.05);
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = groove;
        ctx.fillText(ins.symbol, 0, 0);
        ctx.globalAlpha = crude ? 0.16 : 0.34;
        ctx.strokeStyle = wall;
        ctx.lineWidth = Math.max(0.0003, size * 0.055);
        ctx.strokeText(ins.symbol, -size * 0.028, -size * 0.038);
        if (materialAlpha > 0.01) {
          ctx.globalAlpha = materialAlpha;
          ctx.fillStyle = material.color;
          ctx.fillText(ins.symbol, 0, 0);
        }
        const emitAlpha = charge > 0.01 && emission > 0.001 && genome.quality.score >= 72
          ? clamp(emission * (0.35 + charge * 0.65), 0, 0.34)
          : 0;
        if (emitAlpha > 0.002) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = emitAlpha;
          ctx.fillStyle = emissionColorOf(genome);
          ctx.fillText(ins.symbol, 0, 0);
        }
      } finally {
        ctx.restore();
      }
    }
  } finally {
    ctx.restore();
  }
}

// Guard ornament: filigree / crest using mount.ornaments
// ---------------------------------------------------------------------------

interface OrnamentStyle {
  dark: string;
  light: string;
  inlay: string | null;
  lw: number;
}

function scrollMotif(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  length: number,
  slant: number,
  style: OrnamentStyle,
): void {
  const lw = style.lw;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = style.dark;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(cx - length * 0.5, cy + slant * length * 0.18);
  ctx.bezierCurveTo(
    cx - length * 0.12, cy - length * 0.38,
    cx + length * 0.18, cy + length * 0.4,
    cx + length * 0.5, cy - slant * length * 0.18,
  );
  ctx.stroke();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = style.light;
  ctx.lineWidth = lw * 0.55;
  ctx.beginPath();
  ctx.moveTo(cx - length * 0.5 - lw * 0.5, cy + slant * length * 0.18 - lw * 0.5);
  ctx.bezierCurveTo(
    cx - length * 0.12 - lw * 0.5, cy - length * 0.38 - lw * 0.5,
    cx + length * 0.18 - lw * 0.5, cy + length * 0.4 - lw * 0.5,
    cx + length * 0.5 - lw * 0.5, cy - slant * length * 0.18 - lw * 0.5,
  );
  ctx.stroke();
  // Terminal curl.
  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = style.dark;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.arc(cx + length * 0.48, cy - slant * length * 0.16, length * 0.14, 0.5, Math.PI * 1.75);
  ctx.stroke();
  if (style.inlay) {
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = style.inlay;
    ctx.lineWidth = lw * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - length * 0.38, cy + slant * length * 0.12);
    ctx.quadraticCurveTo(cx, cy - length * 0.16, cx + length * 0.34, cy - slant * length * 0.1);
    ctx.stroke();
  }
}

export function paintGuardOrnament(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const ornaments = genome.mount.ornaments;
  const guard = geo.guard;
  if (guard.outline.length < 3) return;
  ctx.save();
  try {
    guardPath(ctx, geo);
    ctx.clip();
    const box = guardExtentBox(guard);
    const rng = makeGenomeRng(genome.individuality.subSeeds.guard);
    const pp = platingPaint(guard.plating);
    const density = clamp01(ornaments.density);
    const filigree = clamp01(ornaments.filigree);
    const quality = clamp01(genome.quality.score / 100);
    const inlay =
      ornaments.inlay === "gold" ? "rgba(232,198,112,0.8)"
        : ornaments.inlay === "silver" ? "rgba(206,222,238,0.75)"
          : null;
    const style: OrnamentStyle = {
      dark: pp.deep,
      light: pp.rim,
      inlay,
      lw: clamp(Math.max(box.width, box.height) * 0.028, 0.0006, 0.0032),
    };
    const boss = guard.boss;
    const centerX = boss ? boss.x : box.cx;
    const centerY = boss ? boss.y : box.cy;
    const span = Math.max(box.width, box.height, 0.02);

    // Very crude pieces get a few chisel nicks, not filigree.
    if (density < 0.16 || quality < 0.35) {
      const nicks = 2 + Math.round(density * 8);
      for (let i = 0; i < nicks; i++) {
        const x = centerX + rng.range(-0.3, 0.3) * span;
        const y = centerY + rng.range(-0.36, 0.36) * span;
        const len = span * (0.03 + rng.next() * 0.05);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = pp.deep;
        ctx.lineWidth = style.lw * 0.9;
        ctx.beginPath();
        ctx.moveTo(x - len, y + len * 0.3);
        ctx.lineTo(x + len, y - len * 0.25);
        ctx.stroke();
      }
      return;
    }

    // Filigree: mirrored scrollwork along the guard limbs.
    const motifs = clamp(Math.round(1 + density * 4 + filigree * 3), 1, 6);
    for (let m = 0; m < motifs; m++) {
      const dx = rng.range(-0.24, 0.24) * box.width;
      const dy = rng.range(0.18, 0.72) * box.height * 0.5;
      const len = span * (0.1 + rng.next() * 0.1) * (0.65 + filigree * 0.5);
      const slant = rng.range(-0.6, 0.6);
      for (const sign of [1, -1]) {
        const cx = centerX + dx;
        const cy = centerY + dy * sign;
        if (!boxed(cx, cy, box)) continue;
        scrollMotif(ctx, cx, cy, len, slant * sign, style);
      }
    }

    // Crest around the boss (if the guard has one): a ring of small beads,
    // mirrored by construction.
    if (boss && boss.r > 0 && density > 0.32) {
      const r = boss.r;
      const beads = 8;
      for (let k = 0; k < beads; k++) {
        const a = (k / beads) * Math.PI * 2 + Math.PI / 8;
        const bx = boss.x + Math.cos(a) * r * 1.5;
        const by = boss.y + Math.sin(a) * r * 1.5;
        if (!boxed(bx, by, box)) continue;
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = pp.dark;
        ctx.beginPath();
        ctx.arc(bx, by, Math.max(0.0008, r * 0.1), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = pp.light;
        ctx.beginPath();
        ctx.arc(bx - r * 0.03, by - r * 0.03, Math.max(0.0005, r * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Two fine border grooves on the guard, following its silhouette inset.
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = pp.deep;
    ctx.lineWidth = style.lw * 0.7;
    guardPath(ctx, geo);
    ctx.stroke();
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = pp.light;
    ctx.lineWidth = style.lw * 0.45;
    guardPath(ctx, geo);
    ctx.stroke();
  } finally {
    ctx.restore();
  }
}

function boxed(x: number, y: number, box: { minX: number; minY: number; maxX: number; maxY: number }): boolean {
  return x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY;
}

// ---------------------------------------------------------------------------
// Pommel ornament: gem facet or engraved rosette
// ---------------------------------------------------------------------------

function gemPalette(genome: WeaponVisualGenome): { light: string; core: string; deep: string } {
  const family = genome.identity.family;
  const plating = genome.mount.pommel.plating;
  if (family === "elven") return { light: "rgba(212,242,222,0.95)", core: "rgba(120,186,150,0.95)", deep: "rgba(38,84,66,0.95)" };
  if (family === "imperial" || plating === "gold") return { light: "rgba(255,214,190,0.95)", core: "rgba(176,42,44,0.95)", deep: "rgba(70,12,18,0.95)" };
  if (family === "meteor") return { light: "rgba(196,206,255,0.95)", core: "rgba(78,74,148,0.95)", deep: "rgba(18,18,48,0.95)" };
  if (family === "oriental") return { light: "rgba(248,214,160,0.95)", core: "rgba(190,128,58,0.95)", deep: "rgba(74,42,18,0.95)" };
  return { light: "rgba(214,232,236,0.95)", core: "rgba(96,126,138,0.95)", deep: "rgba(28,38,44,0.95)" };
}

export function paintPommelOrnament(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const pommel = geo.pommel;
  if (pommel.outline.length < 3) return;
  ctx.save();
  try {
    pommelPath(ctx, geo);
    ctx.clip();
    const box = outlineBox(pommel.outline);
    const rng = makeGenomeRng(genome.individuality.subSeeds.pommel);
    const pp = platingPaint(genome.mount.pommel.plating);
    const span = Math.max(box.width, box.height, 0.01);
    const lw = clamp(span * 0.03, 0.0005, 0.0028);
    const quality = clamp01(genome.quality.score / 100);
    const gem = pommel.gem;

    if (gem && gem.r > 0) {
      const colors = gemPalette(genome);
      const r = Math.max(0.002, gem.r);
      // Setting: a metal cup around the stone.
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = pp.dark;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, r * 1.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = pp.rim;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, r * 1.28, Math.PI * 1.05, Math.PI * 1.85);
      ctx.stroke();

      // Faceted stone: a small radial volume plus four cut lines.
      ctx.save();
      try {
        ctx.beginPath();
        ctx.arc(gem.x, gem.y, r, 0, Math.PI * 2);
        ctx.clip();
        const g = ctx.createRadialGradient(
          gem.x - r * 0.34, gem.y - r * 0.38, r * 0.06,
          gem.x, gem.y, r * 1.08,
        );
        g.addColorStop(0, colors.light);
        g.addColorStop(0.42, colors.core);
        g.addColorStop(1, colors.deep);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gem.x, gem.y, r, 0, Math.PI * 2);
        ctx.fill();
        // Cut facets.
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = colors.light;
        ctx.lineWidth = lw * 0.45;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
          ctx.beginPath();
          ctx.moveTo(gem.x + Math.cos(a) * r * 0.18, gem.y + Math.sin(a) * r * 0.18);
          ctx.lineTo(gem.x + Math.cos(a) * r * 0.86, gem.y + Math.sin(a) * r * 0.86);
          ctx.stroke();
        }
        // Restrained inner glow, clipped to the stone: no halo.
        if (quality > 0.6 || genome.mount.pommel.gem) {
          const glow = ctx.createRadialGradient(gem.x, gem.y, r * 0.1, gem.x, gem.y, r);
          glow.addColorStop(0, colors.light);
          glow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.16 + quality * 0.12;
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(gem.x, gem.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
        // Specular pip.
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = colors.light;
        ctx.beginPath();
        ctx.arc(gem.x - r * 0.3, gem.y - r * 0.34, Math.max(0.0004, r * 0.16), 0, Math.PI * 2);
        ctx.fill();
      } finally {
        ctx.restore();
      }
      return;
    }

    // Engraved rosette / heraldic mark, always mirrored around the centre.
    const petals = quality > 0.55 ? 6 : 4;
    const ringR = span * (0.22 + quality * 0.06);
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = pp.deep;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(box.cx, box.cy, ringR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = pp.rim;
    ctx.lineWidth = lw * 0.6;
    ctx.beginPath();
    ctx.arc(box.cx - lw * 0.4, box.cy - lw * 0.4, ringR, 0, Math.PI * 2);
    ctx.stroke();
    for (let p = 0; p < petals; p++) {
      const a = (p / petals) * Math.PI * 2;
      const px = box.cx + Math.cos(a) * ringR * 0.55;
      const py = box.cy + Math.sin(a) * ringR * 0.55;
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = pp.deep;
      ctx.lineWidth = lw * 0.8;
      ctx.beginPath();
      ctx.ellipse(px, py, ringR * 0.32, ringR * 0.16, a, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.strokeStyle = pp.light;
      ctx.beginPath();
      ctx.ellipse(px - lw * 0.3, py - lw * 0.3, ringR * 0.3, ringR * 0.14, a, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Centre pin.
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = pp.dark;
    ctx.beginPath();
    ctx.arc(box.cx, box.cy, Math.max(0.0006, ringR * 0.18), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = pp.light;
    ctx.beginPath();
    ctx.arc(box.cx - lw * 0.3, box.cy - lw * 0.3, Math.max(0.0004, ringR * 0.09), 0, Math.PI * 2);
    ctx.fill();

    // Fine chisel ticks at the cardinal points.
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const x0 = box.cx + Math.cos(a) * ringR * 1.1;
      const y0 = box.cy + Math.sin(a) * ringR * 1.1;
      const x1 = box.cx + Math.cos(a) * ringR * 1.42;
      const y1 = box.cy + Math.sin(a) * ringR * 1.42;
      if (x0 < box.minX || x0 > box.maxX || y0 < box.minY || y0 > box.maxY) continue;
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = pp.deep;
      ctx.lineWidth = lw * 0.6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    void rng;
  } finally {
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Grip inlays: collars, small runes and cord knots
// ---------------------------------------------------------------------------

export function paintGripInlays(
  ctx: CanvasRenderingContext2D,
  geo: WeaponGeometry,
  genome: WeaponVisualGenome,
): void {
  const ornaments = genome.mount.ornaments;
  const grip = geo.grip;
  if (grip.outline.length < 3) return;
  const density = clamp01(ornaments.density);
  if (density < 0.08) return;
  ctx.save();
  try {
    gripPath(ctx, geo);
    ctx.clip();
    const box = outlineBox(grip.outline);
    const rng = makeGenomeRng(genome.individuality.subSeeds.grip);
    const inlay =
      ornaments.inlay === "gold" ? platingPaint("gold")
        : ornaments.inlay === "silver" ? platingPaint("silver")
          : platingPaint("bronze");
    const lw = clamp(Math.max(box.width, box.height) * 0.03, 0.0005, 0.0025);
    const count = clamp(Math.round(density * 4), 1, 4);
    const cy = (box.minY + box.maxY) * 0.5;
    const h = Math.max(0.004, box.height);

    for (let i = 0; i < count; i++) {
      const slot = count === 1 ? 0.5 : 0.16 + (i / (count - 1)) * 0.68;
      const x = lerp(box.minX, box.maxX, clamp(slot + rng.range(-0.015, 0.015), 0.1, 0.9));
      const kind = rng.int(0, 2);
      if (kind === 0) {
        // Metal collar band.
        const bandW = Math.max(0.008, (box.maxX - box.minX) * 0.045);
        const g = ctx.createLinearGradient(0, box.minY, 0, box.maxY);
        g.addColorStop(0, inlay.light);
        g.addColorStop(0.42, inlay.base);
        g.addColorStop(1, inlay.dark);
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = g;
        ctx.fillRect(x - bandW * 0.5, box.minY - 0.001, bandW, h + 0.002);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = inlay.deep;
        ctx.lineWidth = lw * 0.8;
        ctx.beginPath();
        ctx.moveTo(x - bandW * 0.5, box.minY);
        ctx.lineTo(x - bandW * 0.5, box.maxY);
        ctx.moveTo(x + bandW * 0.5, box.minY);
        ctx.lineTo(x + bandW * 0.5, box.maxY);
        ctx.stroke();
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = inlay.rim;
        ctx.beginPath();
        ctx.moveTo(x - bandW * 0.5 + lw * 0.6, box.minY + h * 0.12);
        ctx.lineTo(x - bandW * 0.5 + lw * 0.6, box.maxY - h * 0.12);
        ctx.stroke();
      } else if (kind === 1) {
        // Small engraved rune on the grip.
        const size = clamp(h * 0.42, 0.004, 0.014);
        const glyphs = ["ᚠ", "ᚱ", "ᛁ", "ᚦ", "ᛉ"];
        const glyph = glyphs[Math.abs(Math.floor(rng.next() * glyphs.length)) % glyphs.length];
        ctx.font = fontFor(size);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.globalAlpha = 0.65;
        ctx.fillStyle = inlay.deep;
        ctx.fillText(glyph, x, cy);
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = inlay.light;
        ctx.lineWidth = lw * 0.5;
        ctx.strokeText(glyph, x - size * 0.06, cy - size * 0.06);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = ornaments.inlay === "none" ? inlay.base : inlay.light;
        ctx.fillText(glyph, x, cy);
      } else {
        // Cord knot: two crossing loops.
        const r = clamp(h * 0.18, 0.003, 0.008);
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = inlay.deep;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.ellipse(x - r * 0.6, cy, r, r * 0.6, 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(x + r * 0.6, cy, r, r * 0.6, -0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = inlay.light;
        ctx.lineWidth = lw * 0.5;
        ctx.beginPath();
        ctx.ellipse(x - r * 0.6 - lw * 0.4, cy - lw * 0.4, r, r * 0.6, 0.5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
}

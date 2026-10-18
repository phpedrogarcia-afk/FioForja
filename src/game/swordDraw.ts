import { PROFILES, STEELS, WRAPS, renderInscription } from "./catalog.ts";
import type { SwordDesign } from "./types.ts";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function metalColorCss(heat: number) {
  if (heat < 0.22) return "#8a8278";
  if (heat < 0.42) return "#b83824";
  if (heat < 0.65) return "#e05822";
  if (heat < 0.82) return "#f89e38";
  return "#fff0b0";
}

export function heatTint(heat: number): { glow: string; core: string; edge: string; metalMod: number } {
  const h = clamp(heat, 0, 1);
  if (h < 0.2) {
    return {
      glow: "rgba(0,0,0,0)",
      core: "rgba(160,40,20,0.1)",
      edge: "rgba(30,20,15,0.9)",
      metalMod: 1,
    };
  }
  if (h < 0.45) {
    const t = (h - 0.2) / 0.25;
    return {
      glow: `rgba(180,40,15,${0.15 + t * 0.25})`,
      core: `rgba(220,70,25,${0.4 + t * 0.4})`,
      edge: "rgba(80,25,15,0.9)",
      metalMod: 1 - t * 0.2,
    };
  }
  if (h < 0.75) {
    const t = (h - 0.45) / 0.3;
    return {
      glow: `rgba(255,120,30,${0.35 + t * 0.35})`,
      core: `rgba(255,185,60,${0.75 + t * 0.25})`,
      edge: "rgba(180,50,20,0.95)",
      metalMod: 0.8 - t * 0.4,
    };
  }
  const t = (h - 0.75) / 0.25;
  return {
    glow: `rgba(255,220,140,${0.6 + t * 0.35})`,
    core: `rgba(255,250,210,${0.9 + t * 0.1})`,
    edge: "rgba(255,140,40,0.95)",
    metalMod: 0.4 - t * 0.35,
  };
}

export interface DrawSwordOptions {
  angle?: number;
  heat?: number;
  shape?: number;
  assembled?: boolean;
  quality?: number;
  warp?: number;
  cracks?: number;
  broken?: boolean;
  lightOffset?: number;
  runicCharge?: number;
  physicalProfile?: import("./types.ts").PhysicalBladeProfile;
}

export function drawFinishedSword(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  x: number,
  y: number,
  lengthPx: number,
  opts: DrawSwordOptions = {},
) {
  const angle = opts.angle ?? -Math.PI / 2.15;
  const heat = opts.heat ?? 0;
  const shape = opts.shape ?? 1;
  const assembled = opts.assembled ?? true;
  const quality = opts.quality ?? 75;
  const warp = opts.warp ?? 0;
  const cracks = opts.cracks ?? 0;
  const broken = opts.broken ?? false;
  const lightOffset = opts.lightOffset ?? 0.5;
  const runicCharge = opts.runicCharge ?? 0;
  const physicalProfile = opts.physicalProfile;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  drawSwordBody(ctx, design, lengthPx, {
    heat,
    shape,
    assembled,
    quality,
    warp,
    cracks,
    broken,
    lightOffset,
    runicCharge,
    physicalProfile,
  });

  ctx.restore();
}

function drawSwordBody(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  lengthPx: number,
  opts: Required<Omit<DrawSwordOptions, "angle" | "physicalProfile">> & { physicalProfile?: import("./types.ts").PhysicalBladeProfile },
) {
  const { heat, shape, assembled, quality, warp, cracks, broken, lightOffset, runicCharge, physicalProfile } = opts;
  const profile = PROFILES[design.profile] || PROFILES.long;
  const st = STEELS[design.steel] || STEELS.steel;
  const wrap = WRAPS[design.wrap] || WRAPS.leather;

  const L = lengthPx * (0.62 + design.length * 0.38) * profile.length;
  const W = (20 + profile.width * 14) * (0.6 + shape * 0.4);
  const baseCurve = profile.curve * L * 0.25 * shape;
  // Execution warp physically deflects the blade spine
  const warpDeflect = (warp > 0.05 ? (warp - 0.05) * 65 : 0) * (quality < 50 ? 1.5 : 1);
  const totalCurve = baseCurve + warpDeflect;

  // Draw Hilt if assembled
  if (assembled && !broken) {
    drawHilt(ctx, design, wrap.color, W, quality);
  }

  // Blade length and width continuous interpolation based on forging progression and physicalProfile
  const isRawBillet = !assembled && shape < 0.22;
  const isPreform = !assembled && shape >= 0.22 && shape < 0.55;
  const bladeLen = L * (isRawBillet ? 0.38 : isPreform ? 0.38 + (shape - 0.22) * 0.95 : 0.45 + shape * 0.55);

  ctx.save();

  // If broken: render as fractured shattered blade in 2 parts
  if (broken && !assembled) {
    drawBrokenBlade(ctx, design, bladeLen, W, heat, quality, cracks);
    ctx.restore();
    return;
  }

  // Workpiece / Blade Main Path
  ctx.beginPath();
  if (isRawBillet) {
    // 1. TARUGO BRUTO: Thick forged hot steel rectangular stock ingot (flat blunt end, rounded forged corners)
    const bW = W * 0.88;
    ctx.moveTo(4, -bW * 0.5);
    ctx.lineTo(bladeLen - 6, -bW * 0.5);
    ctx.quadraticCurveTo(bladeLen, -bW * 0.5, bladeLen, -bW * 0.5 + 6);
    ctx.lineTo(bladeLen, bW * 0.5 - 6);
    ctx.quadraticCurveTo(bladeLen, bW * 0.5, bladeLen - 6, bW * 0.5);
    ctx.lineTo(4, bW * 0.5);
    ctx.closePath();
  } else if (isPreform) {
    // 2. PRÉ-FORMA: Elongating tapered bar with rough hammered wedge point
    const t = (shape - 0.22) / 0.33; // 0 to 1
    const baseW = W * (0.82 - t * 0.15);
    const tipTaperW = baseW * (0.85 - t * 0.5);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.15 * t;

    ctx.moveTo(6, -baseW * 0.5);
    ctx.lineTo(bladeLen * (0.75 + t * 0.1), -tipTaperW * 0.5 + tipY * 0.7);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bladeLen * (0.75 + t * 0.1), tipTaperW * 0.5 + tipY * 0.7);
    ctx.lineTo(6, baseW * 0.5);
    ctx.closePath();
  } else if (design.profile === "katana") {
    // 3. KATANA (Oriental): Authentic Nihonto geometry with sori curve, mune spine, sweeping ha, and kissaki chisel tip
    const edgeHalf = W * (0.34 + shape * 0.12);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.42;
    // Habaki collar zone
    ctx.moveTo(8, -edgeHalf * 0.65);
    // Mune (curved spine)
    ctx.quadraticCurveTo(bladeLen * 0.45, -edgeHalf * 0.68 + totalCurve * 0.25, bladeLen * 0.88, -edgeHalf * 0.5 + totalCurve * 0.8);
    // Slanted kissaki chisel tip
    ctx.lineTo(tipX, tipY);
    // Ha (sweeping cutting edge)
    ctx.quadraticCurveTo(bladeLen * 0.86, edgeHalf * 0.68 + totalCurve * 0.78, bladeLen * 0.42, edgeHalf * 0.88 + totalCurve * 0.28);
    ctx.lineTo(8, edgeHalf * 0.62);
    ctx.closePath();
  } else if (design.profile === "elven_blade") {
    // 4. ELVEN LEAF (Élfica): Organic leaf-shaped blade with wasp waist at 26%, swelling at 62%, and slender needle point
    const edgeHalf = W * (0.35 + shape * 0.14);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.12;
    ctx.moveTo(8, -edgeHalf * 0.48);
    // Inward waist at 26% of length
    ctx.bezierCurveTo(
      bladeLen * 0.26, -edgeHalf * 0.62 + totalCurve * 0.08,
      bladeLen * 0.62, -edgeHalf * 1.25 + totalCurve * 0.32,
      bladeLen * 0.88, -edgeHalf * 0.55 + totalCurve * 0.55,
    );
    ctx.lineTo(tipX, tipY);
    ctx.bezierCurveTo(
      bladeLen * 0.88, edgeHalf * 0.55 + totalCurve * 0.55,
      bladeLen * 0.62, edgeHalf * 1.25 + totalCurve * 0.32,
      bladeLen * 0.26, edgeHalf * 0.62 + totalCurve * 0.08,
    );
    ctx.lineTo(8, edgeHalf * 0.48);
    ctx.closePath();
  } else if (design.profile === "claymore") {
    // 5. CLAYMORE (Aço do Reino / Imperial): Broad heavy greatsword with parrying lugs at ricasso and massive cutting face
    const edgeHalf = W * (0.48 + shape * 0.16);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.14;
    ctx.moveTo(8, -edgeHalf * 0.65);
    // Ricasso section with parrying side lugs
    ctx.lineTo(bladeLen * 0.14, -edgeHalf * 0.65);
    ctx.lineTo(bladeLen * 0.16, -edgeHalf * 0.95);
    ctx.lineTo(bladeLen * 0.18, -edgeHalf * 0.72);
    // Broad double-edged main body
    ctx.lineTo(bladeLen * 0.86, -edgeHalf * 0.78 + totalCurve * 0.5);
    // Spear point
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bladeLen * 0.86, edgeHalf * 0.78 + totalCurve * 0.5);
    ctx.lineTo(bladeLen * 0.18, edgeHalf * 0.72);
    ctx.lineTo(bladeLen * 0.16, edgeHalf * 0.95);
    ctx.lineTo(bladeLen * 0.14, edgeHalf * 0.65);
    ctx.lineTo(8, edgeHalf * 0.65);
    ctx.closePath();
  } else if (design.profile === "falchion") {
    // 6. FALCHION (Ferro / Imperial): Single-edged cleaver with straight spine, flared forward cutting belly and clip point
    const edgeHalf = W * (0.38 + shape * 0.16);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.22;
    ctx.moveTo(8, -edgeHalf * 0.45);
    // Straight sturdy spine with false edge / clip point
    ctx.lineTo(bladeLen * 0.74, -edgeHalf * 0.55 + totalCurve * 0.4);
    ctx.lineTo(tipX, tipY);
    // Flared weighted cutting belly
    ctx.quadraticCurveTo(bladeLen * 0.82, edgeHalf * 1.35 + totalCurve * 0.65, bladeLen * 0.5, edgeHalf * 0.95 + totalCurve * 0.25);
    ctx.lineTo(8, edgeHalf * 0.45);
    ctx.closePath();
  } else if (design.profile === "saber") {
    // 7. SABER (Damasco / Imperial): Continuous sweeping cavalry saber with arched spine and curved belly
    const edgeHalf = W * (0.36 + shape * 0.14);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.38;
    ctx.moveTo(8, -edgeHalf * 0.45);
    // Continuous sweeping curved spine
    ctx.quadraticCurveTo(bladeLen * 0.5, -edgeHalf * 0.65 + totalCurve * 0.28, bladeLen * 0.9, -edgeHalf * 0.35 + totalCurve * 0.75);
    ctx.lineTo(tipX, tipY);
    // Swept cutting edge
    ctx.quadraticCurveTo(bladeLen * 0.82, edgeHalf * 0.82 + totalCurve * 0.7, bladeLen * 0.4, edgeHalf * 0.85 + totalCurve * 0.22);
    ctx.lineTo(8, edgeHalf * 0.45);
    ctx.closePath();
  } else if (design.profile === "short") {
    // 8. SHORT / GLADIUS (Ferro do Ferreiro): Broad parallel cutting edges with sudden acute triangular spearhead
    const edgeHalf = W * (0.42 + shape * 0.14);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.08;
    ctx.moveTo(8, -edgeHalf * 0.75);
    // Parallel edges up to 76% of blade
    ctx.lineTo(bladeLen * 0.76, -edgeHalf * 0.75 + totalCurve * 0.35);
    // Acute triangular spearhead
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bladeLen * 0.76, edgeHalf * 0.75 + totalCurve * 0.35);
    ctx.lineTo(8, edgeHalf * 0.75);
    ctx.closePath();
  } else if (design.profile === "relic_blade") {
    // 9. RELIC BLADE (Antiga / Relíquia): Archaic stepped blade with angular ricasso steps and broad diamond point
    const edgeHalf = W * (0.45 + shape * 0.16);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.1;
    ctx.moveTo(8, -edgeHalf * 0.75);
    ctx.lineTo(bladeLen * 0.18, -edgeHalf * 0.75);
    ctx.lineTo(bladeLen * 0.2, -edgeHalf * 0.98);
    ctx.lineTo(bladeLen * 0.82, -edgeHalf * 0.98 + totalCurve * 0.4);
    ctx.lineTo(bladeLen * 0.94, -edgeHalf * 0.45 + totalCurve * 0.7);
    ctx.lineTo(tipX, tipY);
    ctx.lineTo(bladeLen * 0.94, edgeHalf * 0.45 + totalCurve * 0.7);
    ctx.lineTo(bladeLen * 0.82, edgeHalf * 0.98 + totalCurve * 0.4);
    ctx.lineTo(bladeLen * 0.2, edgeHalf * 0.98);
    ctx.lineTo(bladeLen * 0.18, edgeHalf * 0.75);
    ctx.lineTo(8, edgeHalf * 0.75);
    ctx.closePath();
  } else {
    // 10. LONG (Aço do Reino): Classic chivalric longsword with elegant distal taper to needle point
    const edgeHalf = W * (0.38 + shape * 0.14);
    const tipX = bladeLen;
    const tipY = totalCurve * 0.16;
    ctx.moveTo(8, -edgeHalf * 0.65);
    ctx.quadraticCurveTo(bladeLen * 0.4, -edgeHalf * 0.62 + totalCurve * 0.22, bladeLen * 0.85, -edgeHalf * 0.42 + totalCurve * 0.58);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(bladeLen * 0.85, edgeHalf * 0.42 + totalCurve * 0.58, bladeLen * 0.4, edgeHalf * 0.62 + totalCurve * 0.22);
    ctx.lineTo(8, edgeHalf * 0.65);
    ctx.closePath();
  }

  // 1. Base Metal / Heat Fill
  const tint = heatTint(heat);
  const baseColor = getSteelColorHsl(design, quality, heat);

  if (heat > 0.25) {
    // Molten forge radiant gradient: incandescent yellow-white core, deep ember edges
    const hg = ctx.createLinearGradient(0, -W, 0, W);
    hg.addColorStop(0, tint.edge);
    hg.addColorStop(0.35, tint.core);
    hg.addColorStop(0.65, tint.core);
    hg.addColorStop(1, tint.edge);
    ctx.fillStyle = hg;
    ctx.fill();

    // Outer heat bloom
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = tint.glow;
    ctx.shadowBlur = 24 * heat;
    ctx.fillStyle = tint.glow;
    ctx.fill();
    ctx.restore();
  } else {
    // Cold polished steel with realistic bevels and light specular
    const fg = ctx.createLinearGradient(0, -W, 0, W);
    // Top bevel highlight
    const spec = quality >= 88 ? 1.45 : 1.2;
    fg.addColorStop(0, shade(baseColor, spec));
    fg.addColorStop(0.35, shade(baseColor, 1.05));
    // Fuller shadow ridge
    fg.addColorStop(0.48, shade(baseColor, 0.6));
    fg.addColorStop(0.52, shade(baseColor, 0.75));
    // Bottom bevel
    fg.addColorStop(0.7, shade(baseColor, 0.95));
    fg.addColorStop(1, shade(baseColor, 0.78));
    ctx.fillStyle = fg;
    ctx.fill();
  }

  // 2. Damascus Pattern (if Damascus steel)
  if (st.damascus && (shape > 0.35 || assembled)) {
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = quality >= 88 ? 0.45 : 0.3;
    ctx.strokeStyle = heat > 0.3 ? "rgba(255,200,100,0.4)" : shade(baseColor, 1.4);
    ctx.lineWidth = quality >= 90 ? 1.2 : 1.6;
    for (let i = 0; i < 11; i++) {
      ctx.beginPath();
      const y0 = -W * 0.45 + i * (W * 0.09);
      ctx.moveTo(12, y0);
      for (let x = 16; x < bladeLen - 12; x += 10) {
        const wave = Math.sin(x * 0.07 + i * 1.2) * (3.5 + Math.cos(x * 0.03) * 2);
        ctx.lineTo(x, y0 + wave);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3. Meteorite Cosmic Flecks
  if (st.stars && (shape > 0.4 || assembled)) {
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 24; i++) {
      const sx = 20 + ((i * 59) % (bladeLen - 30));
      const sy = (Math.sin(i * 2.3) * 0.7) * (W * 0.35);
      ctx.fillStyle = heat > 0.3 ? "rgba(255,245,200,0.8)" : "rgba(200,230,255,0.75)";
      ctx.beginPath();
      ctx.arc(sx, sy, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 4. Central Fuller (Sangradouro) or Spinal Ridge
  if (shape > 0.5) {
    ctx.save();
    const fullerStart = 16;
    const fullerEnd = bladeLen * 0.74;

    if (design.profile === "short") {
      // Gladius: Central diamond spine ridge instead of a fuller groove
      ctx.beginPath();
      ctx.moveTo(fullerStart, 0);
      ctx.lineTo(bladeLen * 0.76, totalCurve * 0.15);
      ctx.strokeStyle = heat > 0.4 ? "rgba(255, 120, 30, 0.6)" : "rgba(255, 255, 255, 0.28)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else if (design.guard === "imperial" || design.pommel === "crown") {
      // Imperial: Double Fuller with gilded spinal inlay ridge
      const fDist = W * 0.16;
      [-fDist, fDist].forEach((offsetY) => {
        ctx.beginPath();
        ctx.moveTo(fullerStart, offsetY + totalCurve * 0.1);
        ctx.quadraticCurveTo(bladeLen * 0.4, offsetY + totalCurve * 0.15, fullerEnd, offsetY + totalCurve * 0.22);
        ctx.strokeStyle = heat > 0.4 ? "rgba(255,100,20,0.7)" : "rgba(10,8,6,0.6)";
        ctx.lineWidth = Math.max(1.4, W * 0.08);
        ctx.stroke();
      });
      // Gilded spinal inlay between fullers
      if (quality >= 85) {
        ctx.beginPath();
        ctx.moveTo(fullerStart + 6, totalCurve * 0.1);
        ctx.lineTo(fullerEnd - 12, totalCurve * 0.22);
        ctx.strokeStyle = "rgba(212, 175, 55, 0.75)";
        ctx.lineWidth = 1.0;
        ctx.stroke();
      }
    } else if (design.profile === "katana") {
      // Katana: Bo-hi groove offset toward the curved mune spine
      const bohiY = -W * 0.25;
      ctx.beginPath();
      ctx.moveTo(fullerStart, bohiY + totalCurve * 0.18);
      ctx.quadraticCurveTo(bladeLen * 0.45, bohiY + totalCurve * 0.32, bladeLen * 0.82, bohiY + totalCurve * 0.68);
      ctx.strokeStyle = heat > 0.4 ? "rgba(255,100,20,0.7)" : "rgba(12,10,8,0.58)";
      ctx.lineWidth = Math.max(1.6, W * 0.1);
      ctx.stroke();
    } else {
      // Classic or Broad Fuller (Claymore, Longsword, Saber, etc.)
      const fullerY = totalCurve * 0.15;
      const fullerW = Math.max(1.8, W * (design.profile === "claymore" ? 0.22 : quality >= 88 ? 0.12 : 0.16));

      ctx.beginPath();
      ctx.moveTo(fullerStart, fullerY - 0.5);
      ctx.quadraticCurveTo(bladeLen * 0.4, fullerY + totalCurve * 0.1, fullerEnd, fullerY + totalCurve * 0.2);
      ctx.strokeStyle = heat > 0.4 ? "rgba(255,100,20,0.7)" : "rgba(10,8,6,0.55)";
      ctx.lineWidth = fullerW;
      ctx.stroke();

      // Fuller inner highlight
      if (quality >= 75 && heat < 0.3) {
        ctx.beginPath();
        ctx.moveTo(fullerStart, fullerY + 0.8);
        ctx.quadraticCurveTo(bladeLen * 0.4, fullerY + 1.2 + totalCurve * 0.1, fullerEnd, fullerY + totalCurve * 0.2);
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = Math.max(1, fullerW * 0.4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 5. Specular Sheen Sweep (Velvet inspection or high quality)
  if (assembled && quality >= 70 && heat < 0.25) {
    ctx.save();
    ctx.clip();
    const sweepX = bladeLen * lightOffset;
    const sg = ctx.createLinearGradient(sweepX - 45, -W, sweepX + 45, W);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(0.5, quality >= 90 ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.25)");
    sg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, -W * 1.5, bladeLen + 20, W * 3);
    ctx.restore();
  }

  // 6. Quality Flaws: Hammer marks, jagged notches, forge scale stains (Low Quality < 60)
  if (quality < 65 || warp > 0.18) {
    drawForgingFlaws(ctx, bladeLen, W, quality, warp);
  }

  // 7. Structural Cracks / Stress Fissures
  if (cracks > 0) {
    drawCrackFissures(ctx, bladeLen, W, cracks, heat);
  }

  // 8. Runes & Inscriptions (Bíblia Estética: Gravação física e iluminação controlada)
  const defaultText = design.runeSymbol ? design.runeSymbol : (design.runes ? "ᚠ · ᚨ · ᛊ" : "AETHELGARD");
  const inscription = design.runeSymbol ? design.runeSymbol : renderInscription(design.inscription || defaultText, design.runes);
  // Strictly gated: never carved on crude billet or early preform (requires refined blade shape >= 0.65 or finished assembly)
  const showRunes = (design.runes || Boolean(design.runeSymbol) || Boolean(design.inscription)) && (shape >= 0.65 || assembled);

  if (showRunes && inscription) {
    drawLuminousRunes(ctx, inscription, bladeLen, W, totalCurve, {
      heat,
      quality,
      runicCharge,
      assembled,
      hasRunes: Boolean(design.runes || design.runeSymbol),
    });
  }

  // 9. Outer Blade Outline / Razor Edge Stroke
  ctx.lineWidth = quality >= 88 ? 1.0 : 1.4;
  ctx.strokeStyle = heat > 0.3 ? "rgba(80,20,10,0.8)" : "rgba(20,15,12,0.85)";
  ctx.stroke();

  ctx.restore();
}

function drawLuminousRunes(
  ctx: CanvasRenderingContext2D,
  text: string,
  bladeLen: number,
  W: number,
  curve: number,
  opts: { heat: number; quality: number; runicCharge: number; assembled: boolean; hasRunes: boolean },
) {
  const { heat, quality, runicCharge, assembled, hasRunes } = opts;
  const isHot = heat > 0.35;
  const fontSize = Math.max(9, Math.floor(W * (assembled ? 0.36 : 0.32)));

  ctx.save();
  ctx.font = `600 ${fontSize}px Cinzel, "Segoe UI Historic", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const runeX = bladeLen * 0.44;
  const runeY = curve * 0.15;
  ctx.translate(runeX, runeY);

  // 1. PHYSICAL INCISION: First draw the carved chisel groove shadow (recessed depth in steel)
  ctx.fillStyle = "rgba(10, 8, 6, 0.92)";
  ctx.fillText(text, 0.8, 0.8);

  if (!hasRunes) {
    // Non-runic maker's mark or latin motto: purely physical etched steel inscription
    ctx.fillStyle = isHot ? "rgba(45, 15, 8, 0.85)" : "rgba(22, 18, 15, 0.82)";
    ctx.fillText(text, 0, 0);
    ctx.restore();
    return;
  }

  // 2. RUNIC INCISED INLAY & ILLUMINATION: Controlled by developmental stage & runic power
  if (isHot) {
    // Hot on anvil: runes catch internal heat through the carved channel
    if (runicCharge > 0.35) {
      // Molten inner core inside the carved channel with tight heat bloom (no giant neon halo)
      ctx.shadowColor = "rgba(255, 120, 30, 0.55)";
      ctx.shadowBlur = 4;
      ctx.fillStyle = "rgba(255, 215, 140, 0.9)";
      ctx.fillText(text, 0, 0);

      // Subtle mystic temper spark at high charge
      if (runicCharge >= 0.75) {
        ctx.shadowColor = "rgba(100, 210, 240, 0.45)";
        ctx.shadowBlur = 2.5;
        ctx.fillStyle = "rgba(170, 240, 255, 0.75)";
        ctx.fillText(text, 0, 0);
      }
    } else {
      // Uncharged hot runes: deep oxidized chisel groove in incandescent steel
      ctx.fillStyle = "rgba(55, 18, 8, 0.85)";
      ctx.fillText(text, 0, 0);
    }
  } else {
    // Cold / Assembled / Gallery / Reveal: physically incised inlays
    if (quality >= 88) {
      // Masterwork: silver / electrum wire inlay with restrained, ethereal mystic glow
      ctx.shadowColor = "rgba(80, 190, 230, 0.45)";
      ctx.shadowBlur = 3;
      ctx.fillStyle = "rgba(210, 235, 245, 0.95)";
      ctx.fillText(text, 0, 0);

      // Delicate gold accent in center
      ctx.shadowBlur = 1.5;
      ctx.shadowColor = "rgba(255, 215, 0, 0.35)";
      ctx.fillStyle = "rgba(255, 245, 200, 0.75)";
      ctx.fillText(text, 0, 0);
    } else if (quality >= 70) {
      // Refined steel: silver-pewter hammered inlay, non-glowing
      ctx.fillStyle = "rgba(175, 185, 195, 0.85)";
      ctx.fillText(text, 0, 0);
    } else {
      // Rough / Flawed: dark oxidized iron chisel marks
      ctx.fillStyle = "rgba(30, 24, 20, 0.85)";
      ctx.fillText(text, 0, 0);
    }
  }

  ctx.restore();
}

function drawForgingFlaws(
  ctx: CanvasRenderingContext2D,
  bladeLen: number,
  W: number,
  quality: number,
  warp: number,
) {
  ctx.save();
  ctx.clip();

  // 1. Hammer dent divots and burn blotches
  const flawCount = Math.floor((100 - quality) / 12) + Math.floor(warp * 8);
  for (let i = 0; i < flawCount; i++) {
    const fx = 24 + ((i * 73) % Math.max(40, bladeLen - 40));
    const fy = (Math.sin(i * 1.9) * 0.8) * (W * 0.4);
    const r = 2.5 + ((i * 3) % 4);

    ctx.fillStyle = "rgba(15, 10, 8, 0.45)";
    ctx.beginPath();
    ctx.ellipse(fx, fy, r * 1.4, r, i * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Scale / soot ring
    ctx.strokeStyle = "rgba(60, 20, 10, 0.35)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 2. Chipped edge notches
  if (quality < 50) {
    ctx.fillStyle = "rgba(12, 8, 6, 0.85)";
    const notchCount = 3 + Math.floor((50 - quality) / 8);
    for (let i = 0; i < notchCount; i++) {
      const nx = 40 + i * (bladeLen / (notchCount + 1));
      const side = i % 2 === 0 ? -1 : 1;
      const ny = side * W * 0.48;
      ctx.beginPath();
      ctx.moveTo(nx - 4, ny);
      ctx.lineTo(nx, ny - side * 4);
      ctx.lineTo(nx + 4, ny);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawCrackFissures(
  ctx: CanvasRenderingContext2D,
  bladeLen: number,
  W: number,
  cracks: number,
  heat: number,
) {
  ctx.save();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = heat > 0.3 ? "rgba(255, 60, 20, 0.95)" : "rgba(15, 8, 6, 0.95)";
  ctx.shadowColor = heat > 0.3 ? "rgba(255, 80, 0, 0.8)" : "transparent";
  ctx.shadowBlur = 6;

  for (let c = 0; c < Math.min(cracks, 3); c++) {
    const startX = bladeLen * (0.35 + c * 0.22);
    ctx.beginPath();
    ctx.moveTo(startX, -W * 0.45);
    ctx.lineTo(startX + 6, -W * 0.15);
    ctx.lineTo(startX - 4, W * 0.1);
    ctx.lineTo(startX + 5, W * 0.42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBrokenBlade(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  bladeLen: number,
  W: number,
  heat: number,
  quality: number,
  _cracks: number,
) {
  const baseColor = getSteelColorHsl(design, quality, heat);
  const breakX = bladeLen * 0.48;

  // Tang and Base half
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(8, -W * 0.45);
  ctx.lineTo(breakX - 6, -W * 0.45);
  // Jagged fracture line
  ctx.lineTo(breakX + 4, -W * 0.15);
  ctx.lineTo(breakX - 8, W * 0.15);
  ctx.lineTo(breakX + 2, W * 0.45);
  ctx.lineTo(8, W * 0.45);
  ctx.closePath();
  ctx.fillStyle = shade(baseColor, 0.85);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.restore();

  // Severed Broken Tip half (displaced and tilted)
  ctx.save();
  ctx.translate(breakX + 16, 12);
  ctx.rotate(0.22);
  ctx.beginPath();
  ctx.moveTo(0, -W * 0.42);
  ctx.lineTo(bladeLen - breakX, 0);
  ctx.lineTo(0, W * 0.42);
  // Jagged fracture matching edge
  ctx.lineTo(-6, W * 0.15);
  ctx.lineTo(6, -W * 0.15);
  ctx.closePath();
  ctx.fillStyle = shade(baseColor, 0.85);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "#000";
  ctx.stroke();
  ctx.restore();
}

function drawHilt(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  wrapColor: string,
  W: number,
  quality: number,
) {
  const grip = 56 + design.length * 10;
  ctx.save();

  // Tang collar / ricasso
  ctx.fillStyle = "#38322c";
  ctx.fillRect(-8, -W * 0.22, 16, W * 0.44);

  // Crossguard
  drawGuard(ctx, design.guard, W, quality, design.runes);

  // Specialized wrap grip texture and physical material
  drawWrapGrip(ctx, design.wrap, wrapColor, -grip - 6, W, grip, quality);

  // Pommel
  drawPommel(ctx, design.pommel, -grip - 6, W, quality);

  ctx.restore();
}

function drawWrapGrip(
  ctx: CanvasRenderingContext2D,
  wrapId: SwordDesign["wrap"],
  wrapColor: string,
  x: number,
  W: number,
  grip: number,
  quality: number,
) {
  ctx.save();
  const h = W * 0.48;
  const y = -h * 0.5;

  // 1. Base grip foundation
  ctx.fillStyle = wrapColor;
  roundRect(ctx, x, y, grip, h, 4);
  ctx.fill();

  // 2. Specialized Material Textures
  if (wrapId === "dragon_leather") {
    // Scaled reptilian dragon hide with iridescent hexagonal/diamond scales
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, grip, h, 4);
    ctx.clip();

    // Scale rows
    const scaleSize = 7;
    for (let gx = x; gx < x + grip; gx += scaleSize) {
      for (let gy = y - 2; gy < y + h + 2; gy += scaleSize * 0.7) {
        ctx.beginPath();
        ctx.arc(gx + scaleSize * 0.5, gy + scaleSize * 0.4, scaleSize * 0.45, 0, Math.PI);
        ctx.strokeStyle = "rgba(46, 204, 113, 0.45)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "rgba(10, 35, 20, 0.5)";
        ctx.fill();
      }
    }
    // Gilded bolster ferrules at both ends
    ctx.fillStyle = "#d4af37";
    ctx.fillRect(x, y, 4, h);
    ctx.fillRect(x + grip - 4, y, 4, h);
    ctx.restore();
  } else if (wrapId === "tsukamaki") {
    // Authentic Japanese diamond crossed cords over white rayskin
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, grip, h, 4);
    ctx.clip();

    // White pebbled samegawa underlayer
    ctx.fillStyle = "#f0ebe1";
    ctx.fillRect(x, y, grip, h);

    // Crossed silk diamonds (ito)
    ctx.fillStyle = "#8a1c14";
    const diamondW = 10;
    for (let dx = x; dx < x + grip + diamondW; dx += diamondW) {
      ctx.beginPath();
      ctx.moveTo(dx, y);
      ctx.lineTo(dx + diamondW * 0.5, y + h * 0.5);
      ctx.lineTo(dx, y + h);
      ctx.lineTo(dx - diamondW * 0.5, y + h * 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  } else if (wrapId === "goldwire") {
    // Spiraling gold wire thread coils
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, grip, h, 4);
    ctx.clip();
    for (let gx = x; gx < x + grip; gx += 4.5) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx - 3, y + h);
      ctx.strokeStyle = "#ffd700";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(gx + 1.5, y);
      ctx.lineTo(gx - 1.5, y + h);
      ctx.strokeStyle = "#855800";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    ctx.restore();
  } else if (wrapId === "bone") {
    // Segmented ivory with dark joint rings and polished highlights
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, grip, h, 4);
    ctx.clip();
    ctx.fillStyle = "#f5efe1";
    ctx.fillRect(x, y, grip, h);

    // Three carved dark horn ring bands
    const segment = grip / 4;
    ctx.fillStyle = "#2c221c";
    for (let s = 1; s <= 3; s++) {
      ctx.fillRect(x + s * segment - 2, y, 4, h);
      ctx.fillStyle = "rgba(212, 175, 55, 0.8)";
      ctx.fillRect(x + s * segment - 0.5, y, 1, h);
      ctx.fillStyle = "#2c221c";
    }
    ctx.restore();
  } else if (wrapId === "darkwood") {
    // Wood grain lines and twin brass collars
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, grip, h, 4);
    ctx.clip();
    ctx.strokeStyle = "rgba(20, 10, 5, 0.4)";
    ctx.lineWidth = 1;
    for (let ly = y + 2; ly < y + h; ly += 3.5) {
      ctx.beginPath();
      ctx.moveTo(x, ly);
      ctx.lineTo(x + grip, ly + (Math.sin(ly) * 1.5));
      ctx.stroke();
    }
    ctx.fillStyle = "#c5a059";
    ctx.fillRect(x + 2, y, 3, h);
    ctx.fillRect(x + grip - 5, y, 3, h);
    ctx.restore();
  } else if (wrapId === "linen") {
    // Overlapping cloth bands
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, grip, h, 4);
    ctx.clip();
    ctx.strokeStyle = "rgba(90, 80, 65, 0.35)";
    ctx.lineWidth = 1.2;
    for (let lx = x; lx < x + grip; lx += 8) {
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx - 4, y + h);
      ctx.stroke();
    }
    ctx.restore();
  } else if (wrapId === "braided") {
    // Braided cord chevron ribs
    const ribColor = quality >= 85 ? "rgba(220,185,90,0.8)" : "rgba(30,18,10,0.55)";
    ctx.strokeStyle = ribColor;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const rx = x + 4 + i * (grip / 8);
      ctx.moveTo(rx, y);
      ctx.lineTo(rx - 5, y + h * 0.5);
      ctx.lineTo(rx, y + h);
      ctx.stroke();
    }
  } else {
    // Classical leather with stitched center line and cross ribs
    ctx.strokeStyle = "rgba(20,12,8,0.55)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      const rx = x + 6 + i * (grip / 7.2);
      ctx.moveTo(rx, y);
      ctx.lineTo(rx - 4, y + h);
      ctx.stroke();
    }
  }

  // Border outline
  ctx.strokeStyle = "rgba(18,12,8,0.65)";
  ctx.lineWidth = 1.2;
  roundRect(ctx, x, y, grip, h, 4);
  ctx.stroke();

  ctx.restore();
}

function drawGuard(
  ctx: CanvasRenderingContext2D,
  id: SwordDesign["guard"],
  W: number,
  quality: number,
  hasRunes = false,
) {
  const isMasterwork = quality >= 88;
  const guardGold = isMasterwork ? "#d4af37" : "#c4b49a";
  const guardDark = isMasterwork ? "#5a4515" : "#3a3026";

  ctx.fillStyle = guardGold;
  ctx.strokeStyle = guardDark;
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  if (id === "cross") {
    // Ornate Crossguard with stepped quillons
    if (ctx.roundRect) {
      ctx.roundRect(-6, -W * 1.35, 12, W * 2.7, 3);
    } else {
      ctx.rect(-6, -W * 1.35, 12, W * 2.7);
    }
    ctx.fill();
    ctx.stroke();

    // Central diamond boss with tasteful stone / gold inlay
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 6);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = isMasterwork ? (hasRunes ? "#70d6ff" : "#d4af37") : "#b09060";
    ctx.fill();
    ctx.stroke();
  } else if (id === "curved") {
    ctx.moveTo(-5, -W * 1.3);
    ctx.quadraticCurveTo(22, 0, -5, W * 1.3);
    ctx.lineTo(8, W * 1.25);
    ctx.quadraticCurveTo(32, 0, 8, -W * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === "wings") {
    ctx.moveTo(5, 0);
    ctx.quadraticCurveTo(-12, -W * 0.25, -30, -W * 1.4);
    ctx.quadraticCurveTo(18, -W * 0.65, 12, 0);
    ctx.quadraticCurveTo(18, W * 0.65, -30, W * 1.4);
    ctx.quadraticCurveTo(-12, W * 0.25, 5, 0);
    ctx.fill();
    ctx.stroke();
  } else if (id === "tsuba") {
    // Oriental Tsuba: refined oval/octagonal disc with cutouts and dark forged patination
    ctx.fillStyle = isMasterwork ? "#26201a" : "#1a1612";
    ctx.strokeStyle = isMasterwork ? "#d4af37" : "#4a3c2e";
    ctx.lineWidth = 2.2;
    ctx.ellipse(0, 0, 9, W * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner rim gold inlay
    if (isMasterwork) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 6, W * 0.95, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Decorative cutout holes (hitsu-ana)
    ctx.fillStyle = "#0c0a08";
    ctx.beginPath();
    ctx.ellipse(0, -W * 0.55, 3.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(0, W * 0.55, 3.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === "leaf") {
    // Elven Leaf Guard: organic flowing leaf tendrils embracing the blade
    ctx.fillStyle = isMasterwork ? "#e2f0d9" : "#b8cfb0";
    ctx.strokeStyle = isMasterwork ? "#5b7850" : "#3e5236";
    ctx.moveTo(2, -W * 1.4);
    ctx.bezierCurveTo(14, -W * 0.8, -10, -W * 0.3, 4, 0);
    ctx.bezierCurveTo(-10, W * 0.3, 14, W * 0.8, 2, W * 1.4);
    ctx.bezierCurveTo(-14, W * 0.9, -6, W * 0.2, -6, 0);
    ctx.bezierCurveTo(-6, -W * 0.2, -14, -W * 0.9, 2, -W * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === "imperial") {
    // Imperial Eagle Quillons: gilded wings spreading outward with crowned quillon tips
    ctx.fillStyle = "#d4af37";
    ctx.strokeStyle = "#4e3b12";
    ctx.lineWidth = 1.6;
    ctx.moveTo(0, -W * 1.55);
    ctx.lineTo(8, -W * 1.25);
    ctx.lineTo(4, -W * 0.4);
    ctx.lineTo(10, 0);
    ctx.lineTo(4, W * 0.4);
    ctx.lineTo(8, W * 1.25);
    ctx.lineTo(0, W * 1.55);
    ctx.lineTo(-8, W * 1.2);
    ctx.lineTo(-4, W * 0.3);
    ctx.lineTo(-4, -W * 0.3);
    ctx.lineTo(-8, -W * 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Imperial Ruby Crest
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#c0392b";
    ctx.fill();
    ctx.strokeStyle = "#ffd700";
    ctx.stroke();
  } else if (id === "runic") {
    // Runic Monolith: heavy geometric dark iron block with engraved angular runic groove
    ctx.fillStyle = "#202024";
    ctx.strokeStyle = "#4a4e58";
    ctx.lineWidth = 1.8;
    ctx.rect(-8, -W * 1.3, 16, W * 2.6);
    ctx.fill();
    ctx.stroke();

    // Glowing runic channel in guard
    ctx.beginPath();
    ctx.moveTo(-4, -W * 0.9);
    ctx.lineTo(0, -W * 0.4);
    ctx.lineTo(-4, 0);
    ctx.lineTo(0, W * 0.4);
    ctx.lineTo(-4, W * 0.9);
    ctx.strokeStyle = isMasterwork && hasRunes ? "rgba(140,220,255,0.75)" : "rgba(80,100,120,0.7)";
    ctx.lineWidth = 1.6;
    ctx.stroke();
  } else {
    // Ring / Basket
    ctx.arc(2, 0, W * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, 0, W * 0.68, 0, Math.PI * 2);
    ctx.fillStyle = "#1e1610";
    ctx.fill();
  }

  // Gemstone / Boss in Masterwork (Controlled illumination, no neon halation)
  if (isMasterwork && id !== "tsuba" && id !== "imperial") {
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    if (hasRunes) {
      // Ethereal subtle runic spark (restrained, max 2.5px blur)
      ctx.fillStyle = "rgba(180, 235, 255, 0.9)";
      ctx.shadowColor = "rgba(100, 200, 240, 0.45)";
      ctx.shadowBlur = 2.5;
    } else {
      // Physical medieval polished boss: garnet cabochon, jade, or brass rosette
      ctx.fillStyle = id === "leaf" ? "#7ca668" : "#8b1e1e";
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    }
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawPommel(
  ctx: CanvasRenderingContext2D,
  id: SwordDesign["pommel"],
  x: number,
  W: number,
  quality: number,
) {
  const isMasterwork = quality >= 88;
  ctx.fillStyle = isMasterwork ? "#d4af37" : "#b8a88c";
  ctx.strokeStyle = isMasterwork ? "#4e3b12" : "#3a3026";
  ctx.lineWidth = 1.3;

  ctx.beginPath();
  if (id === "disc") {
    ctx.ellipse(x - 9, 0, 12, W * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === "sphere") {
    ctx.arc(x - 10, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (id === "wolf") {
    ctx.moveTo(x, -2);
    ctx.lineTo(x - 18, -W * 0.55);
    ctx.lineTo(x - 11, -2);
    ctx.lineTo(x - 24, 0);
    ctx.lineTo(x - 11, 2);
    ctx.lineTo(x - 18, W * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === "crescent") {
    // Oriental Kashira cap
    ctx.moveTo(x, -W * 0.28);
    ctx.quadraticCurveTo(x - 18, 0, x, W * 0.28);
    ctx.lineTo(x - 6, W * 0.26);
    ctx.quadraticCurveTo(x - 22, 0, x - 6, -W * 0.26);
    ctx.closePath();
    ctx.fillStyle = "#221c16";
    ctx.fill();
    ctx.stroke();
  } else if (id === "elven") {
    // Elven Crystal Gem teardrop
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x - 8, -W * 0.42, x - 18, 0);
    ctx.quadraticCurveTo(x - 8, W * 0.42, x, 0);
    ctx.closePath();
    ctx.fillStyle = isMasterwork ? "#a8e6cf" : "#88b0a0";
    ctx.fill();
    ctx.stroke();
    if (isMasterwork) {
      ctx.shadowColor = "#a8e6cf";
      ctx.shadowBlur = 8;
    }
  } else if (id === "crown") {
    // Imperial Crown
    ctx.moveTo(x, -W * 0.45);
    ctx.lineTo(x - 16, -W * 0.52);
    ctx.lineTo(x - 10, -W * 0.18);
    ctx.lineTo(x - 20, 0);
    ctx.lineTo(x - 10, W * 0.18);
    ctx.lineTo(x - 16, W * 0.52);
    ctx.lineTo(x, W * 0.45);
    ctx.closePath();
    ctx.fillStyle = "#d4af37";
    ctx.fill();
    ctx.stroke();
  } else if (id === "knot") {
    // Norse / Celtic Interlocking Knot
    ctx.arc(x - 10, 0, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#1e1e24";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - 10, 0, 5, 0, Math.PI * 2);
    ctx.fillStyle = isMasterwork ? "#00f2fe" : "#3d4250";
    ctx.fill();
  } else {
    // Diamond / Cross
    ctx.moveTo(x + 2, 0);
    ctx.lineTo(x - 9, -W * 0.58);
    ctx.lineTo(x - 16, 0);
    ctx.lineTo(x - 9, W * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Embedded sapphire jewel in pommel (as in Reference Image 2!)
  if (isMasterwork && id !== "crescent" && id !== "knot") {
    ctx.beginPath();
    ctx.arc(x - 9, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0077ff";
    ctx.shadowColor = "#00d2ff";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function getSteelColorHsl(design: SwordDesign, quality: number, heat: number): string {
  const st = STEELS[design.steel];
  const t = heatTint(heat);
  const baseLight = st.light * t.metalMod + heat * 28;
  const qualityLightMod = (quality - 60) * 0.12;
  const finalLight = clamp(baseLight + qualityLightMod, 12, 85);
  return `hsl(${st.hue} ${st.sat}% ${finalLight}%)`;
}

function shade(hsl: string, mul: number): string {
  const m = /hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/.exec(hsl);
  if (!m) return hsl;
  const l = clamp(Number(m[3]) * mul, 4, 95);
  return `hsl(${m[1]} ${m[2]}% ${l}%)`;
}

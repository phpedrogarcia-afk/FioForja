import { drawRuneMark } from "./runeDraw";
import { PROFILES, STEELS, WRAPS, renderInscription } from "./catalog";
import type { SwordDesign } from "./types";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function heatTint(heat: number): { glow: string; metal: number } {
  const h = clamp(heat, 0, 1);
  const metal = 1 - h * 0.35;
  if (h < 0.25) return { glow: `rgba(180,40,20,${h * 0.2})`, metal };
  if (h < 0.55) return { glow: `rgba(220,70,20,${0.15 + h * 0.35})`, metal };
  if (h < 0.78) return { glow: `rgba(255,140,40,${0.25 + h * 0.4})`, metal };
  return { glow: `rgba(255,230,180,${0.35 + h * 0.4})`, metal };
}

function steelFill(design: SwordDesign, heat: number, quality = 70) {
  const st = STEELS[design.steel];
  const t = heatTint(heat);
  const light = st.light * t.metal + heat * 28;
  return `hsl(${st.hue} ${st.sat}% ${clamp(light + (quality - 60) * 0.08, 12, 78)}%)`;
}

export function drawFinishedSword(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  x: number,
  y: number,
  lengthPx: number,
  opts: {
    angle?: number;
    heat?: number;
    shape?: number;
    assembled?: boolean;
    quality?: number;
    broken?: boolean;
    elven?: boolean;
    rareRunes?: boolean;
    runePulse?: number;
    widthScale?: number;
    stableLength?: boolean;
  } = {},
) {
  const angle = opts.angle ?? -Math.PI / 2.15;
  const heat = opts.heat ?? 0;
  const shape = opts.shape ?? 1;
  const assembled = opts.assembled ?? true;
  const quality = opts.quality ?? 72;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawSwordBody(ctx, design, lengthPx, heat, shape, assembled, quality, opts);
  ctx.restore();
}

function drawSwordBody(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  lengthPx: number,
  heat: number,
  shape: number,
  assembled: boolean,
  quality: number,
  opts: {
    broken?: boolean;
    elven?: boolean;
    rareRunes?: boolean;
    runePulse?: number;
    widthScale?: number;
    stableLength?: boolean;
  } = {},
) {
  const profile = PROFILES[design.profile];
  const st = STEELS[design.steel];
  const wrap = WRAPS[design.wrap];
  const L = lengthPx * (0.55 + design.length * 0.45) * profile.length;
  const W = (12 + profile.width * 13) * (opts.widthScale ?? 1) * (0.82 + shape * 0.18);
  const curve = profile.curve * L * 0.22 * Math.max(shape, 0.35);
  const tint = heatTint(heat);

  if (assembled) {
    drawHilt(ctx, design, wrap.color, W, Boolean(opts.elven));
  }

  if (!assembled) {
    ctx.fillStyle = "#63574a";
    ctx.fillRect(-38 * (opts.widthScale ?? 1), -W * 0.18, 42 * (opts.widthScale ?? 1), W * 0.36);
  }
  const visualShape = opts.stableLength
    ? Math.max(0.36, shape)
    : Math.min(shape, 0.5 + quality / 200);
  const trace = () => traceBlade(ctx, design.profile, L, W, visualShape, curve);

  ctx.save();
  trace();
  const base = steelFill(design, heat, quality);
  const fill = ctx.createLinearGradient(0, -W, 0, W);
  if (heat > 0.35) {
    fill.addColorStop(0, heat > 0.7 ? "#d64f22" : "#792d24");
    fill.addColorStop(0.22, heat > 0.7 ? "#f5a13b" : "#d7632a");
    fill.addColorStop(0.5, heat > 0.7 ? "#fff0b5" : "#e78e42");
    fill.addColorStop(0.78, heat > 0.7 ? "#fbb74f" : "#ba4c29");
    fill.addColorStop(1, "#712e27");
  } else {
    fill.addColorStop(0, shade(base, 1.45));
    fill.addColorStop(0.18, shade(base, 1.15));
    fill.addColorStop(0.48, base);
    fill.addColorStop(0.62, shade(base, 0.42));
    fill.addColorStop(1, shade(base, 0.95));
  }
  ctx.fillStyle = fill;
  if (heat > 0.35) {
    ctx.shadowColor = heat > 0.75 ? "rgba(255,220,160,0.9)" : "rgba(255,90,20,0.75)";
    ctx.shadowBlur = 18 + heat * 28;
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.clip();
  drawBladeFace(ctx, design, L, W, shape, curve, base, st.damascus, st.stars, quality);
  ctx.restore();

  if (heat > 0.18) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    trace();
    ctx.fillStyle = tint.glow;
    ctx.fill();
    ctx.restore();
  }

  trace();
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(1.6, W * 0.045);
  ctx.strokeStyle = heat > 0.55 ? "rgba(255,236,200,0.85)" : "rgba(10,7,5,0.85)";
  ctx.stroke();

  if (shape > 0.4) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.moveTo(18, -W * 0.42);
    ctx.quadraticCurveTo(L * 0.45, -W * 0.5 - curve * 0.05, L * 0.86, curve * 0.04);
    ctx.strokeStyle = `rgba(255,255,255,${0.18 + shape * 0.22})`;
    ctx.lineWidth = Math.max(1.2, W * 0.06);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  const text = renderInscription(design.inscription, design.runes || Boolean(opts.rareRunes));
  if ((text || opts.rareRunes || design.runes) && shape > 0.3) {
    ctx.save();
    ctx.font = `${Math.max(11, Math.floor(W * 0.32))}px Cinzel, serif`;
    ctx.fillStyle = opts.rareRunes
      ? "rgba(232,160,90,0.95)"
      : quality >= 80
        ? "rgba(214,176,92,0.95)"
        : "rgba(28,20,14,0.8)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const runeColor = { ember: "#ffac59", frost: "#88e8e4", gold: "#ead58e", ancestral: "#b6dae8" }[
      design.runeSchool ?? "ember"
    ];
    ctx.shadowColor = runeColor;
    ctx.shadowBlur = (opts.runePulse ?? 0) * 14;
    ctx.fillStyle = design.runes || opts.rareRunes ? runeColor : "#262a2b";
    ctx.globalAlpha = heat > 0.45 ? 0.45 + (opts.runePulse ?? 0) * 0.55 : 0.85;
    const line = opts.rareRunes ? `ᚠᛟᚱᚷᚨ${text ? ` ${text}` : ""}` : text;
    const letters = (line || "ᚠᛟᚱᚷᚨ").slice(0, 12);
    [...letters].forEach((letter, i) => {
      ctx.save();
      ctx.translate(L * (0.2 + (i * 0.55) / Math.max(1, letters.length - 1)), 0);
      ctx.rotate(Math.PI / 2);
      if (design.runes || opts.rareRunes)
        drawRuneMark(ctx, letter, W * 0.45, runeColor, opts.runePulse ?? 0);
      else ctx.fillText(letter, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  }

  if (opts.broken) {
    ctx.save();
    ctx.strokeStyle = "rgba(12,8,6,0.95)";
    ctx.lineWidth = Math.max(2, W * 0.08);
    ctx.beginPath();
    ctx.moveTo(L * 0.28, -W * 0.55);
    ctx.lineTo(L * 0.4, -W * 0.05);
    ctx.lineTo(L * 0.3, W * 0.5);
    ctx.moveTo(L * 0.55, -W * 0.4);
    ctx.lineTo(L * 0.62, W * 0.35);
    ctx.stroke();
    ctx.restore();
  }
}

function traceBlade(
  ctx: CanvasRenderingContext2D,
  kind: SwordDesign["profile"],
  len: number,
  half: number,
  shape: number,
  curve: number,
) {
  const lump = 1 - shape;
  const wob = (t: number, seed: number) => Math.sin(t * 11.7 + seed * 4.2) * lump * half * 0.42;
  ctx.beginPath();

  if (shape < 0.22) {
    const h = half * 0.72;
    ctx.moveTo(0, -h * 0.3);
    ctx.lineTo(len * 0.08, -h + wob(0.1, 1));
    ctx.lineTo(len * 0.35, -h * 0.85 + wob(0.3, 2));
    ctx.lineTo(len * 0.62, -h * 1.05 + wob(0.55, 1));
    ctx.lineTo(len * 0.88, -h * 0.35 + wob(0.8, 3));
    ctx.lineTo(len * 0.97, wob(0.95, 2));
    ctx.lineTo(len * 0.84, h * 0.7 + wob(0.8, 4));
    ctx.lineTo(len * 0.5, h * 1.05 + wob(0.5, 2));
    ctx.lineTo(len * 0.18, h * 0.8 + wob(0.2, 5));
    ctx.closePath();
    return;
  }

  if (kind === "falchion") {
    ctx.moveTo(4, -half * 0.22);
    ctx.quadraticCurveTo(len * 0.4, -half * 0.38 + wob(0.3, 1), len * 0.9, curve * 0.25);
    ctx.quadraticCurveTo(len * 0.72, half * 1.25, len * 0.32, half * 1.05 + wob(0.4, 2));
    ctx.quadraticCurveTo(len * 0.1, half * 0.55, 4, half * 0.18);
    ctx.closePath();
    return;
  }

  if (kind === "saber") {
    ctx.moveTo(6, -half * 0.42);
    ctx.bezierCurveTo(
      len * 0.25,
      -half * 0.7 - curve * 0.1,
      len * 0.62,
      -half * 0.15 - curve * 0.35,
      len * 0.96,
      -curve * 0.05,
    );
    ctx.quadraticCurveTo(len * 0.7, half * 0.25 + curve * 0.15, len * 0.28, half * 0.55);
    ctx.quadraticCurveTo(len * 0.08, half * 0.28, 6, half * 0.22);
    ctx.closePath();
    return;
  }

  const belly = kind === "claymore" ? 0.78 : kind === "short" ? 0.48 : 0.62;
  const shoulder = kind === "claymore" ? 1.05 : kind === "short" ? 0.92 : 1;
  ctx.moveTo(2, 0);
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const taper = t < belly ? 1 : Math.max(0.02, 1 - (t - belly) / (1 - belly));
    ctx.lineTo(len * t, -half * shoulder * taper + wob(t, 1));
  }
  ctx.lineTo(len, curve * 0.08);
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    const taper = t < belly ? 0.82 : Math.max(0.02, 0.82 * (1 - (t - belly) / (1 - belly)));
    ctx.lineTo(len * t, half * shoulder * taper + wob(t, 2));
  }
  ctx.closePath();
}

function drawBladeFace(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  len: number,
  half: number,
  shape: number,
  curve: number,
  base: string,
  damascus: boolean,
  stars: boolean,
  quality: number,
) {
  if (shape > 0.35) {
    ctx.beginPath();
    ctx.moveTo(len * 0.12, 0);
    ctx.quadraticCurveTo(len * 0.5, curve * 0.04, len * 0.78, curve * 0.06);
    ctx.lineWidth = Math.max(3, half * (design.profile === "claymore" ? 0.22 : 0.14));
    ctx.strokeStyle = shade(base, 0.55);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, half * 0.04);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.stroke();
  }

  if (shape < 0.82 || quality < 75) {
    ctx.strokeStyle = `rgba(20,12,8,${0.25 + (1 - shape) * 0.35})`;
    ctx.lineWidth = 1.1;
    const dents = 3 + Math.floor((1 - quality / 100) * 16);
    for (let i = 0; i < dents; i++) {
      const x = len * (0.12 + ((i * 0.07) % 0.75));
      const y = Math.sin(i * 2.1) * half * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 3), 0.2, Math.PI * 1.3);
      ctx.stroke();
    }
  }

  if (damascus && shape > 0.4) {
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = shade(base, 1.4);
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 11; i++) {
      const y0 = -half * 0.55 + i * (half * 0.11);
      ctx.beginPath();
      ctx.moveTo(len * 0.08, y0);
      for (let x = len * 0.08; x < len * 0.9; x += 10) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.06 + i * 0.8) * 3.4);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if (stars && shape > 0.45) {
    ctx.fillStyle = "rgba(230,236,255,0.7)";
    for (let i = 0; i < 22; i++) {
      const sx = len * (0.12 + ((i * 37) % 80) / 100);
      const sy = Math.sin(i * 1.9) * half * 0.36;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 5 === 0 ? 1.6 : 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (quality >= 80 && shape > 0.75) {
    ctx.strokeStyle = "rgba(214,176,92,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(len * 0.16, -half * 0.15);
    ctx.lineTo(len * 0.16, half * 0.12);
    ctx.moveTo(len * 0.2, -half * 0.12);
    ctx.lineTo(len * 0.2, half * 0.1);
    ctx.stroke();
  }
}

function drawHilt(
  ctx: CanvasRenderingContext2D,
  design: SwordDesign,
  wrapColor: string,
  W: number,
  elven: boolean,
) {
  const grip = 54 + design.length * 10;
  ctx.save();

  ctx.fillStyle = "#4a433c";
  ctx.fillRect(-8, -W * 0.18, 16, W * 0.36);

  drawGuard(ctx, design.guard, W);

  ctx.fillStyle = wrapColor;
  roundRect(ctx, -grip - 6, -W * 0.22, grip, W * 0.44, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(20,12,8,0.45)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.strokeStyle = "rgba(20,12,8,0.35)";
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const x = -12 - i * (grip / 6.5);
    ctx.moveTo(x, -W * 0.2);
    ctx.lineTo(x - 6, W * 0.2);
    ctx.stroke();
  }

  drawPommel(ctx, design.pommel, -grip - 6, W);

  if (elven) {
    ctx.strokeStyle = "rgba(186, 206, 154, 0.95)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-grip * 0.45, -W * 0.55, -grip - 4, -W * 0.15);
    ctx.moveTo(-8, 0);
    ctx.quadraticCurveTo(-grip * 0.5, W * 0.5, -grip - 2, W * 0.12);
    ctx.stroke();
    ctx.fillStyle = "rgba(214, 226, 186, 0.9)";
    ctx.beginPath();
    ctx.ellipse(-grip * 0.55, -W * 0.34, 7, 3.2, -0.6, 0, Math.PI * 2);
    ctx.ellipse(-grip * 0.62, W * 0.28, 6, 2.8, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawGuard(ctx: CanvasRenderingContext2D, id: SwordDesign["guard"], W: number) {
  ctx.fillStyle = "#c4b49a";
  ctx.strokeStyle = "#3a3026";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (id === "cross") {
    ctx.fillRect(-6, -W * 1.15, 12, W * 2.3);
    ctx.strokeRect(-6, -W * 1.15, 12, W * 2.3);
  } else if (id === "curved") {
    ctx.moveTo(-4, -W * 1.2);
    ctx.quadraticCurveTo(18, 0, -4, W * 1.2);
    ctx.lineTo(8, W * 1.15);
    ctx.quadraticCurveTo(28, 0, 8, -W * 1.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (id === "wings") {
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(-10, -W * 0.2, -28, -W * 1.35);
    ctx.quadraticCurveTo(16, -W * 0.6, 10, 0);
    ctx.quadraticCurveTo(16, W * 0.6, -28, W * 1.35);
    ctx.quadraticCurveTo(-10, W * 0.2, 4, 0);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(2, 0, W * 0.95, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(2, 0, W * 0.62, 0, Math.PI * 2);
    ctx.fillStyle = "#1e1610";
    ctx.fill();
  }
}

function drawPommel(
  ctx: CanvasRenderingContext2D,
  id: SwordDesign["pommel"],
  x: number,
  W: number,
) {
  ctx.fillStyle = "#b8a88c";
  ctx.strokeStyle = "#3a3026";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (id === "disc") {
    ctx.ellipse(x - 8, 0, 11, W * 0.42, 0, 0, Math.PI * 2);
  } else if (id === "sphere") {
    ctx.arc(x - 9, 0, 11, 0, Math.PI * 2);
  } else if (id === "wolf") {
    ctx.moveTo(x, -2);
    ctx.lineTo(x - 16, -W * 0.5);
    ctx.lineTo(x - 10, -2);
    ctx.lineTo(x - 22, 0);
    ctx.lineTo(x - 10, 2);
    ctx.lineTo(x - 16, W * 0.5);
    ctx.closePath();
  } else {
    ctx.moveTo(x + 2, 0);
    ctx.lineTo(x - 8, -W * 0.55);
    ctx.lineTo(x - 14, 0);
    ctx.lineTo(x - 8, W * 0.55);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
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

function shade(hsl: string, mul: number) {
  const m = /hsl\(([\d.]+) ([\d.]+)% ([\d.]+)%\)/.exec(hsl);
  if (!m) return hsl;
  const l = clamp(Number(m[3]) * mul, 6, 90);
  return `hsl(${m[1]} ${m[2]}% ${l}%)`;
}

export function metalColorCss(heat: number) {
  if (heat < 0.3) return "#8a8278";
  if (heat < 0.5) return "#b33a2b";
  if (heat < 0.7) return "#c45c26";
  if (heat < 0.85) return "#e8a05a";
  return "#f3e6c8";
}

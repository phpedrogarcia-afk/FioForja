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
  opts: { angle?: number; heat?: number; shape?: number; assembled?: boolean; quality?: number } = {},
) {
  const angle = opts.angle ?? -Math.PI / 2.15;
  const heat = opts.heat ?? 0;
  const shape = opts.shape ?? 1;
  const assembled = opts.assembled ?? true;
  const quality = opts.quality ?? 72;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  drawSwordBody(ctx, design, lengthPx, heat, shape, assembled, quality);
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
) {
  const profile = PROFILES[design.profile];
  const st = STEELS[design.steel];
  const wrap = WRAPS[design.wrap];
  const L = lengthPx * (0.55 + design.length * 0.45) * profile.length;
  const W = (18 + profile.width * 16) * (0.55 + shape * 0.45);
  const curve = profile.curve * L * 0.28 * shape;
  const tint = heatTint(heat);

  if (assembled) {
    drawHilt(ctx, design, wrap.color, W);
  }

  ctx.save();
  const lump = 1 - shape;
  const bladeLen = L * (0.35 + shape * 0.65);
  const tipX = bladeLen;

  ctx.beginPath();
  if (shape < 0.25) {
    ctx.ellipse(bladeLen * 0.45, 0, bladeLen * 0.42, W * (0.7 + lump * 0.6), 0, 0, Math.PI * 2);
  } else {
    const edge = W * (0.42 + shape * 0.2);
    ctx.moveTo(8, 0);
    ctx.quadraticCurveTo(bladeLen * 0.2, -edge * 0.2, bladeLen * 0.45, -edge);
    ctx.quadraticCurveTo(bladeLen * 0.78, -edge * (0.85 - profile.curve), tipX, curve * 0.15);
    ctx.quadraticCurveTo(bladeLen * 0.78, edge * (0.55 - profile.curve * 0.4), bladeLen * 0.5, edge * 0.55);
    ctx.quadraticCurveTo(bladeLen * 0.18, edge * 0.25, 8, 0);
    ctx.closePath();
  }

  const fill = ctx.createLinearGradient(0, -W, 0, W);
  const base = steelFill(design, heat, quality);
  fill.addColorStop(0, shade(base, 1.25));
  fill.addColorStop(0.45, base);
  fill.addColorStop(0.55, shade(base, 0.55));
  fill.addColorStop(1, shade(base, 0.9));
  ctx.fillStyle = fill;
  ctx.fill();

  if (st.damascus && shape > 0.4) {
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = shade(base, 1.35);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      const y0 = -W * 0.4 + i * (W * 0.1);
      ctx.moveTo(16, y0);
      for (let x = 16; x < bladeLen; x += 8) {
        ctx.lineTo(x, y0 + Math.sin(x * 0.08 + i) * 3.2);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  if (st.stars && shape > 0.5) {
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "rgba(220,230,255,0.55)";
    for (let i = 0; i < 18; i++) {
      const sx = 24 + ((i * 47) % (bladeLen - 40));
      const sy = Math.sin(i * 1.7) * W * 0.22;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  if (shape > 0.55) {
    ctx.beginPath();
    ctx.moveTo(22, -1);
    ctx.quadraticCurveTo(bladeLen * 0.5, -2 - curve * 0.1, bladeLen * 0.82, curve * 0.05);
    ctx.strokeStyle = "rgba(20,12,8,0.35)";
    ctx.lineWidth = Math.max(1, W * 0.08);
    ctx.stroke();
  }

  if (heat > 0.2) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = tint.glow;
    ctx.fill();
    ctx.restore();
  }

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(12,8,6,0.7)";
  ctx.stroke();
  ctx.restore();

  const text = renderInscription(design.inscription, design.runes);
  if (text && shape > 0.72 && heat < 0.35) {
    ctx.save();
    ctx.font = `${Math.max(9, Math.floor(W * 0.42))}px Cinzel, serif`;
    ctx.fillStyle = quality >= 80 ? "rgba(176,137,58,0.85)" : "rgba(30,22,16,0.7)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.translate(L * 0.42, 0);
    ctx.rotate(0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

function drawHilt(ctx: CanvasRenderingContext2D, design: SwordDesign, wrapColor: string, W: number) {
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

function drawPommel(ctx: CanvasRenderingContext2D, id: SwordDesign["pommel"], x: number, W: number) {
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

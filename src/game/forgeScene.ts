import { workpiecePose, type WorkpiecePose, forgeLayout } from "./layout";
import { drawFinishedSword } from "./swordDraw";
import type { SimState, SwordDesign } from "./types";
import type { GameImages } from "./assets";
export interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
}
function polygon(
  ctx: CanvasRenderingContext2D,
  points: number[][],
  fill: string | CanvasGradient,
  stroke = "#181b1d",
) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x!, y!) : ctx.moveTo(x!, y!)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}
export function contactPoint(w: number, h: number, design: SwordDesign, along: number) {
  const l = forgeLayout(w, h, design);
  const t = Math.max(0.12, Math.min(0.88, along));
  return { x: l.blade.x + (l.tip.x - l.blade.x) * t, y: l.blade.y + (l.tip.y - l.blade.y) * t };
}
export function paintForge(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  images: GameImages,
  design: SwordDesign,
  s: SimState,
  sparks: Spark[],
  time: number,
  reduced: boolean,
  visualPose?: WorkpiecePose,
) {
  const l = forgeLayout(w, h, design);
  if (images.bg) {
    const scale = Math.max(w / images.bg.width, h / images.bg.height);
    ctx.drawImage(
      images.bg,
      (w - images.bg.width * scale) / 2,
      (h - images.bg.height * scale) / 2,
      images.bg.width * scale,
      images.bg.height * scale,
    );
  } else {
    ctx.fillStyle = "#10171b";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.fillStyle = "rgba(7,13,17,.68)";
  ctx.fillRect(0, 0, w, h);
  const fire = ctx.createRadialGradient(w * 0.05, h * 0.35, 0, w * 0.05, h * 0.35, w * 0.85);
  fire.addColorStop(0, "rgba(240,103,23,.24)");
  fire.addColorStop(1, "rgba(240,103,23,0)");
  ctx.fillStyle = fire;
  ctx.fillRect(0, 0, w, h);
  const cx = w * 0.5,
    cy = l.safeTop + l.area * 0.63;
  const aw = w * 0.7,
    ah = l.area * 0.45;
  if (images.anvilPov) {
    ctx.save();
    ctx.translate(l.sprite.x + l.sprite.size, l.sprite.y);
    ctx.scale(-1, 1);
    ctx.drawImage(images.anvilPov, 0, 0, l.sprite.size, l.sprite.size);
    ctx.restore();
  } else {
    // Broad inclined top face and separate side planes: a 2D projection of an anvil.
    const top = [
      [cx - aw * 0.5, cy],
      [cx - aw * 0.18, cy - ah * 0.67],
      [cx + aw * 0.48, cy - ah * 0.3],
      [cx + aw * 0.3, cy + ah * 0.26],
    ];
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.75)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 18;
    const stump = ctx.createLinearGradient(0, cy, 0, l.safeBottom + 30);
    stump.addColorStop(0, "#493626");
    stump.addColorStop(1, "#1c1712");
    ctx.fillStyle = stump;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ah * 0.88, aw * 0.36, ah * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    polygon(
      ctx,
      [
        [cx - aw * 0.19, cy + ah * 0.12],
        [cx + aw * 0.22, cy + ah * 0.1],
        [cx + aw * 0.13, cy + ah * 0.78],
        [cx - aw * 0.12, cy + ah * 0.8],
      ],
      "#252b2c",
    );
    polygon(
      ctx,
      [
        [cx - aw * 0.28, cy + ah * 0.72],
        [cx + aw * 0.27, cy + ah * 0.65],
        [cx + aw * 0.36, cy + ah * 0.9],
        [cx - aw * 0.37, cy + ah * 0.99],
      ],
      "#394043",
    );
    polygon(
      ctx,
      [top[0]!, top[3]!, [cx + aw * 0.29, cy + ah * 0.46], [cx - aw * 0.45, cy + ah * 0.2]],
      "#323b3d",
    );
    polygon(ctx, [top[2]!, [cx + aw * 0.69, cy + ah * 0.04], top[3]!], "#586265");
    const metal = ctx.createLinearGradient(0, cy - ah, 0, cy + ah * 0.3);
    metal.addColorStop(0, "#929d9d");
    metal.addColorStop(0.55, "#566267");
    metal.addColorStop(1, "#29373c");
    polygon(ctx, top, metal, "#a5abaa");
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 70; i++) {
      const x = cx - aw * 0.45 + (((i * 97) % 100) / 100) * aw,
        y = cy - ah * 0.62 + (((i * 31) % 100) / 100) * ah;
      ctx.strokeStyle = i % 3 === 0 ? "rgba(212,221,220,.13)" : "rgba(4,9,10,.18)";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14 + (i % 8) * 3, y - 4);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }
  const pose = visualPose ?? workpiecePose(w, h, design, s.phase, s.reheating, s.quenchFill);
  const bx = pose.x,
    by = pose.y,
    angle = pose.angle;
  const reheating = s.phase === "heat" || s.reheating;
  if (reheating) {
    const g = ctx.createRadialGradient(w * 0.4, cy - ah * 0.2, 0, w * 0.4, cy - ah * 0.2, w * 0.38);
    g.addColorStop(0, "rgba(255,176,56,.65)");
    g.addColorStop(1, "rgba(240,75,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, l.safeTop, w, l.area);
    // Coals behind the workpiece, not on its silhouette.
    for (let i = 0; i < 22; i++) {
      ctx.fillStyle = i % 2 ? "#ad451e" : "#e88f2f";
      ctx.beginPath();
      ctx.ellipse(
        w * (0.22 + (i % 7) * 0.075),
        cy + ah * 0.14 + Math.floor(i / 7) * 5,
        5 * l.scale,
        3 * l.scale,
        0,
        0,
        7,
      );
      ctx.fill();
    }
  }
  if (s.phase === "quench") {
    drawBath(ctx, w, l, s.quenchFill, time);
  }
  ctx.save();
  ctx.shadowColor = "#000";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 8;
  drawFinishedSword(ctx, design, bx, by, pose.length, {
    angle,
    heat: s.phase === "quench" ? s.heat * (1 - s.quenchFill) : s.heat,
    shape: Math.max(0.36, s.shape),
    assembled: false,
    quality: s.quality,
    broken: s.broken,
    runePulse: s.runePulse,
    widthScale: l.scale,
    stableLength: true,
  });
  ctx.restore();
  if (s.phase !== "quench") drawTongs(ctx, bx, by, w, h, l.scale);
  if (s.phase === "quench" && s.quenchFill > 0.08) {
    const y = l.safeTop + l.area * 0.72;
    ctx.fillStyle = "rgba(104,162,176,.4)";
    ctx.beginPath();
    ctx.ellipse(w * 0.56, y, w * 0.21, l.area * 0.045, 0, 0, 7);
    ctx.fill();
    if (!reduced)
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = "rgba(215,230,232,.18)";
        ctx.beginPath();
        ctx.arc(
          w * (0.48 + (i % 4) * 0.05),
          y - ((time * 36 + i * 17) % 70),
          10 + (i % 3) * 5,
          0,
          7,
        );
        ctx.fill();
      }
  }
  if (s.phase === "forge" && !s.reheating) {
    const point = contactPoint(w, h, design, s.along);
    ctx.strokeStyle = s.heat > 0.5 ? "rgba(255,232,170,.6)" : "rgba(170,190,195,.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, 10 * l.scale, 6 * l.scale, l.angle, 0, 7);
    ctx.stroke();
    const anim = s.strikeAnim > 0 ? 1 - s.strikeAnim / 0.24 : 1;
    // Only the first 70ms reaches the contact; the remaining animation retreats.
    const attack = s.strikeAnim > 0 ? Math.max(0, 1 - anim * 3.8) : 0;
    const rest = { x: w * 0.88, y: l.safeTop + l.area * 0.16 - s.force * 22 * l.scale };
    const head = {
      x: rest.x + (point.x - rest.x) * attack,
      y: rest.y + (point.y - rest.y) * attack,
    };
    drawHammer(ctx, head.x, head.y, w, l.safeTop + l.area * 0.38, l.scale, attack);
  }
  for (const p of sparks) {
    ctx.globalAlpha = Math.max(0, p.life / 0.6);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 0.025, p.y - p.vy * 0.025);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  if (s.strikeAnim > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = `600 ${Math.max(14, 18 * l.scale)}px Georgia`;
    ctx.fillStyle =
      s.strikeKind === "perfect" ? "#a9ede1" : s.strikeKind === "good" ? "#e8ce94" : "#ee9777";
    ctx.fillText(
      s.strikeKind === "perfect"
        ? "PERFEITO"
        : s.strikeKind === "good"
          ? "BOM GOLPE"
          : s.strikeKind === "hard"
            ? "FORÇA DEMAIS"
            : "MUITO FRACO",
      w * 0.5,
      l.safeTop + l.area * 0.11,
    );
    ctx.restore();
  }
}
function drawTongs(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  scale: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  const wrist = { x: w * 0.04, y: y + 88 * scale };
  // Glove stays at the left edge. Both metal jaws converge on the tang.
  ctx.strokeStyle = "#33251d";
  ctx.lineWidth = 35 * scale;
  ctx.beginPath();
  ctx.moveTo(-15, y + 140 * scale);
  ctx.lineTo(wrist.x, y + 90 * scale);
  ctx.stroke();
  ctx.strokeStyle = "#705445";
  ctx.lineWidth = 24 * scale;
  ctx.beginPath();
  ctx.moveTo(-15, y + 130 * scale);
  ctx.lineTo(wrist.x + 13 * scale, y + 79 * scale);
  ctx.stroke();
  ctx.strokeStyle = "#a48b70";
  ctx.lineWidth = 2 * scale;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(wrist.x - 12 * scale + i * 7 * scale, y + 80 * scale);
    ctx.lineTo(wrist.x - 5 * scale + i * 7 * scale, y + 95 * scale);
    ctx.stroke();
  }
  const pivot = { x: x - 34 * scale, y: y + 35 * scale };
  for (const sign of [-1, 1]) {
    ctx.strokeStyle = "#262c30";
    ctx.lineWidth = 8 * scale;
    ctx.beginPath();
    ctx.moveTo(wrist.x + sign * 8 * scale, wrist.y);
    ctx.lineTo(pivot.x, pivot.y);
    ctx.lineTo(x - 8 * scale, y + sign * 5 * scale);
    ctx.stroke();
    ctx.strokeStyle = "#9d9b8c";
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
  }
  ctx.fillStyle = "#b1a78b";
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 4 * scale, 0, 7);
  ctx.fill();
  ctx.restore();
}
function drawHammer(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  handY: number,
  scale: number,
  attack: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  const gripX = w + 20 * scale;
  ctx.strokeStyle = "#251811";
  ctx.lineWidth = 14 * scale;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(gripX, handY);
  ctx.stroke();
  ctx.strokeStyle = "#765136";
  ctx.lineWidth = 9 * scale;
  ctx.stroke();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.24 + attack * 0.2);
  const g = ctx.createLinearGradient(-18 * scale, 0, 18 * scale, 0);
  g.addColorStop(0, "#293338");
  g.addColorStop(0.3, "#88928f");
  g.addColorStop(0.65, "#455158");
  g.addColorStop(1, "#a5a89a");
  ctx.fillStyle = g;
  ctx.strokeStyle = "#1d2529";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-23 * scale, -28 * scale, 46 * scale, 55 * scale, 4 * scale);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#b0ad99";
  ctx.fillRect(-20 * scale, 19 * scale, 40 * scale, 5 * scale);
  ctx.restore();
  ctx.strokeStyle = "#523c2d";
  ctx.lineWidth = 28 * scale;
  ctx.beginPath();
  ctx.moveTo(w + 25 * scale, handY + 18 * scale);
  ctx.lineTo(w - 8 * scale, handY);
  ctx.stroke();
  ctx.restore();
}
function drawBath(
  ctx: CanvasRenderingContext2D,
  w: number,
  l: ReturnType<typeof forgeLayout>,
  dip: number,
  time: number,
) {
  const y = l.safeTop + l.area * 0.72;
  polygon(
    ctx,
    [
      [w * 0.33, y],
      [w * 0.79, y],
      [w * 0.73, y + l.area * 0.19],
      [w * 0.37, y + l.area * 0.19],
    ],
    "#392c23",
    "#746a52",
  );
  ctx.fillStyle = "#193941";
  ctx.beginPath();
  ctx.ellipse(w * 0.56, y, w * 0.23, l.area * 0.08, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = "#9c967f";
  ctx.lineWidth = 3;
  ctx.stroke();
  if (dip > 0) {
    ctx.strokeStyle = "rgba(180,230,230,.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(
      w * 0.56,
      y,
      w * (0.09 + dip * 0.07 + Math.sin(time * 4) * 0.005),
      l.area * 0.04,
      0,
      0,
      7,
    );
    ctx.stroke();
  }
}

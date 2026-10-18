import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { drawSheetFrame, type GameImages } from "./assets";
import { createSim, stepSim, type SimInput } from "./sim";
import { drawFinishedSword } from "./swordDraw";
import type { ForgePhase, HudSnapshot, PlayerInventory, SimState, SwordDesign } from "./types";
import { playClang, playCoinJingle, playCrack, playHiss, playPull, playRuneHum, playShatter, playWhoosh } from "./audio";

const VW = 1280;
const VH = 720;

function getR4BLayout(phase: ForgePhase, portrait: boolean) {
  const anvil = portrait
    ? { x: 235, y: 140, size: 740 }
    : { x: 145, y: 92, size: 940 };
  const onAnvil = phase === "forge";
  const blade = phase === "heat"
    ? { x: 200, y: 340, length: 300, angle: -0.16 }
    : phase === "quench"
      ? { x: 970, y: 360, length: 320, angle: 0.12 }
      : portrait
        ? { x: 530, y: 420, length: 350, angle: -0.19 }
        : { x: 525, y: 430, length: 520, angle: -0.19 };
  return {
    anvil,
    blade,
    focusX: portrait ? (phase === "heat" ? 270 : phase === "quench" ? 1050 : 680) : VW / 2,
    impact: onAnvil ? [blade.x + (portrait ? 130 : 165), blade.y - (portrait ? 25 : 31)] as const : null,
  };
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color?: string;
}

interface SteamParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  alpha: number;
}

interface GoldPop {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  max: number;
}

interface Props {
  design: SwordDesign;
  images: GameImages;
  shake: boolean;
  reducedMotion: boolean;
  onHud: (hud: HudSnapshot) => void;
  onFinished: (sim: SimState) => void;
  onStrikeReward?: (reward: { amount: number; id: string }) => void;
  inputRef: MutableRefObject<SimInput>;
  inventory?: PlayerInventory;
}

export function ForgeCanvas({
  design,
  images,
  shake,
  reducedMotion,
  onHud,
  onFinished,
  onStrikeReward,
  inputRef,
  inventory,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sim = createSim(design, {
      hammer: inventory?.equipped?.hammer,
      equippedGear: inventory?.equipped,
    });
    const sparks: Spark[] = [];
    const steams: SteamParticle[] = [];
    const goldPops: GoldPop[] = [];
    let trauma = 0;
    let hitstop = 0;
    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;
    let finishedSent = false;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const emitSparks = (n: number, x: number, y: number, force: number, isPerfect = false) => {
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
        const sp = 90 + Math.random() * 260 * force;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 50,
          life: 0.28 + Math.random() * 0.42,
          max: 0.7,
          size: 1.5 + Math.random() * (isPerfect ? 3.5 : 2.5),
          color: isPerfect && Math.random() > 0.5 ? "#00f2fe" : undefined,
        });
        if (sparks.length > 200) sparks.shift();
      }
    };

    const emitSteam = (n: number, x: number, y: number) => {
      for (let i = 0; i < n; i++) {
        steams.push({
          x: x + (Math.random() - 0.5) * 60,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 35,
          vy: -60 - Math.random() * 80,
          life: 0.8 + Math.random() * 0.8,
          max: 1.6,
          size: 15 + Math.random() * 25,
          alpha: 0.35 + Math.random() * 0.25,
        });
        if (steams.length > 80) steams.shift();
      }
    };

    const loop = (ts: number) => {
      if (!running) return;
      let dt = Math.min((ts - last) / 1000, 0.1);
      last = ts;
      const time = ts / 1000;

      if (hitstop > 0 && !reducedMotion) {
        hitstop -= dt;
        dt = 0;
      }

      const ev = stepSim(sim, dt, inputRef.current, design, time);
      inputRef.current.action = false;
      inputRef.current.reheat = false;

      // Audio dispatch
      if (ev.sfx === "clang") playClang(ev.force ?? 0.6, ev.kind ?? "good", sim.targetZone);
      if (ev.sfx === "whoosh") playWhoosh();
      if (ev.sfx === "hiss") {
        playHiss();
        const layout = getR4BLayout("quench", canvas.width < canvas.height);
        emitSteam(35, layout.blade.x, layout.blade.y);
      }
      if (ev.sfx === "pull") playPull();
      if (ev.sfx === "crack") playCrack();
      if (ev.sfx === "shatter") playShatter();
      if (ev.sfx === "rune") playRuneHum();

      if (ev.trauma && shake && !reducedMotion) trauma = Math.min(1, trauma + ev.trauma);
      if (ev.hitstop && !reducedMotion) hitstop = Math.max(hitstop, ev.hitstop);

      if (ev.kind) {
        const force = ev.kind === "weak" ? 0.35 : ev.kind === "hard" ? 1 : 0.7;
        const baseImpact = getR4BLayout("forge", canvas.width < canvas.height).impact!;
        const zoneOffsetX = sim.targetZone === "base" ? -70 : sim.targetZone === "tip" ? 95 : 0;
        const zoneOffsetY = sim.targetZone === "base" ? 14 : sim.targetZone === "tip" ? -18 : 0;
        emitSparks(
          ev.kind === "perfect" ? 48 : 26,
          baseImpact[0] + zoneOffsetX,
          baseImpact[1] + zoneOffsetY,
          force,
          ev.kind === "perfect",
        );

        if (ev.goldReward) {
          playCoinJingle();
          goldPops.push({
            text: ev.goldReward.text,
            x: baseImpact[0] + zoneOffsetX,
            y: baseImpact[1] + zoneOffsetY - 30,
            vy: -75,
            life: 0.95,
            max: 0.95,
          });
          if (onStrikeReward && sim.strikeReward) {
            onStrikeReward({ amount: sim.strikeReward.amount, id: sim.strikeReward.id });
          }
        }
      }

      if (ev.finished && !finishedSent) {
        finishedSent = true;
        onFinished(sim);
      }

      // Update particles
      trauma = Math.max(0, trauma - dt * 1.7);
      for (const p of sparks) {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 380 * dt;
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        if (sparks[i]!.life <= 0) sparks.splice(i, 1);
      }

      for (const st of steams) {
        st.life -= dt;
        st.x += st.vx * dt;
        st.y += st.vy * dt;
        st.size += dt * 18;
      }
      for (let i = steams.length - 1; i >= 0; i--) {
        if (steams[i]!.life <= 0) steams.splice(i, 1);
      }

      for (const gp of goldPops) {
        gp.life -= dt;
        gp.y += gp.vy * dt;
      }
      for (let i = goldPops.length - 1; i >= 0; i--) {
        if (goldPops[i]!.life <= 0) goldPops.splice(i, 1);
      }

      // Continuous steam during quench
      if (sim.phase === "quench" && sim.quenching && Math.random() < 0.4) {
        const layout = getR4BLayout("quench", canvas.width < canvas.height);
        emitSteam(4, layout.blade.x, layout.blade.y);
      }

      // HUD snapshot emission
      hudAcc += dt;
      if (hudAcc > 0.05) {
        hudAcc = 0;
        onHud({
          phase: sim.phase,
          heat: sim.heat,
          shape: sim.shape,
          quality: sim.quality,
          force: sim.force,
          charging: sim.charging,
          sweetCenter: sim.sweetCenter,
          sweetWidth: sim.sweetWidth,
          strikes: sim.strikes,
          maxStrikes: sim.maxStrikes,
          quenchFill: sim.quenchFill,
          message: sim.lastMessage,
          warp: sim.warp,
          integrity: sim.integrity,
          structuralState: sim.structuralState,
          cracks: sim.cracks,
          broken: sim.broken,
          targetZone: sim.targetZone,
          zoneProgress: sim.zoneProgress,
          activeHammer: sim.activeHammer,
          physicalProfile: sim.physicalProfile,
          quenchSteam: sim.quenchSteam,
        });
      }

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.width / dpr;
      const cssH = canvas.height / dpr;
      const scale = Math.max(cssW / VW, cssH / VH);
      const portrait = cssW / cssH < 1;
      const focusX = getR4BLayout(sim.phase, portrait).focusX;
      const ox = cssW / 2 - focusX * scale;
      const oy = (cssH - VH * scale) / 2;
      const shakeAmt = trauma * trauma;
      const sx = shake && !reducedMotion ? Math.sin(time * 47) * 16 * shakeAmt : 0;
      const sy = shake && !reducedMotion ? Math.sin(time * 53 + 1) * 12 * shakeAmt : 0;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.save();
      ctx.translate(ox + sx, oy + sy);
      ctx.scale(scale, scale);
      paint(ctx, images, design, sim, sparks, steams, goldPops, time, portrait);
      ctx.restore();

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [design, images, shake, reducedMotion, onHud, onFinished, onStrikeReward, inputRef, inventory]);

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden bg-bg touch-none">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" />
    </div>
  );
}

function paint(
  ctx: CanvasRenderingContext2D,
  images: GameImages,
  design: SwordDesign,
  sim: ReturnType<typeof createSim>,
  sparks: Spark[],
  steams: SteamParticle[],
  goldPops: GoldPop[],
  time: number,
  portrait: boolean,
) {
  // 1. Dark medieval forge backdrop
  ctx.fillStyle = "#120c08";
  ctx.fillRect(0, 0, VW, VH);

  if (images.bg) {
    drawCover(ctx, images.bg, VW, VH);
  } else if (images.r4bBg) {
    drawCover(ctx, images.r4bBg, VW, VH);
  }

  // 2. Animated Hearth Fire in the furnace
  if (images.fire) {
    const fi = Math.floor(time * 9) % 4;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const flicker = 0.75 + Math.sin(time * 8.5) * 0.12;
    ctx.globalAlpha = flicker;
    drawSheetFrame(ctx, images.fire, 2, 2, fi, 95, 260, 240, 240);
    // Warm fire glow on surrounding stone
    const fg = ctx.createRadialGradient(210, 380, 20, 210, 380, 260);
    fg.addColorStop(0, "rgba(255, 140, 30, 0.45)");
    fg.addColorStop(0.6, "rgba(200, 70, 10, 0.18)");
    fg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = fg;
    ctx.fillRect(0, 150, 420, 450);
    ctx.restore();
  }

  const layout = getR4BLayout(sim.phase, portrait);
  const { anvil, blade } = layout;
  const onAnvil = sim.phase === "forge";
  const bladeX = blade.x;
  const bladeY = blade.y;
  const heatBoost = sim.heat;

  // 3. Render Anvil (if in forge phase or quench)
  if (sim.phase !== "heat") {
    if (images.r4bAnvil) {
      ctx.drawImage(images.r4bAnvil, anvil.x, anvil.y, anvil.size, anvil.size);
    } else if (images.anvil) {
      ctx.drawImage(images.anvil, anvil.x, anvil.y, anvil.size, anvil.size);
    }
  }

  // 4. Heat Phase Aura
  if (sim.phase === "heat") {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(bladeX, bladeY, 15, bladeX, bladeY, 180);
    g.addColorStop(0, `rgba(255,190,60,${0.25 + sim.heat * 0.45})`);
    g.addColorStop(0.6, `rgba(255,90,10,${0.15 + sim.heat * 0.25})`);
    g.addColorStop(1, "rgba(255,40,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(bladeX - 180, bladeY - 180, 360, 360);
    ctx.restore();
  }

  // 5. Workpiece Contact Shadow & Thermal Cast on Anvil
  if (onAnvil) {
    ctx.save();
    ctx.translate(bladeX, bladeY + 8);
    ctx.rotate(blade.angle);
    ctx.fillStyle = "rgba(6,3,1,0.52)";
    ctx.beginPath();
    ctx.ellipse(blade.length * 0.35, 2, blade.length * 0.35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Incandescent anvil face thermal cast
    if (heatBoost > 0.25) {
      ctx.globalCompositeOperation = "lighter";
      const castG = ctx.createRadialGradient(blade.length * 0.35, 0, 8, blade.length * 0.35, 0, blade.length * 0.45);
      castG.addColorStop(0, `rgba(255, 120, 20, ${heatBoost * 0.38})`);
      castG.addColorStop(0.6, `rgba(200, 50, 10, ${heatBoost * 0.16})`);
      castG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = castG;
      ctx.fillRect(0, -20, blade.length * 0.8, 40);
    }
    ctx.restore();
  }

  // 6. Blacksmith Tongs (Tenaz) holding the workpiece tang
  if (onAnvil || sim.phase === "heat") {
    drawTongs(ctx, bladeX - 14, bladeY + 2, blade.angle);
  }

  // 7. Masterwork Workpiece Rendering
  drawFinishedSword(ctx, design, bladeX, bladeY, blade.length, {
    angle: blade.angle,
    heat: heatBoost,
    shape: sim.phase === "heat" ? 0.16 : sim.shape,
    assembled: false,
    quality: sim.quality,
    warp: sim.warp,
    cracks: sim.cracks,
    broken: sim.broken,
    runicCharge: sim.runicCharge,
    physicalProfile: sim.physicalProfile,
  });

  // 8. Quench Bath Trough & Water
  if (sim.phase === "quench") {
    ctx.save();
    // Water basin overlay
    ctx.globalAlpha = 0.45 + sim.quenchFill * 0.35;
    const qg = ctx.createLinearGradient(0, 200, 0, VH);
    qg.addColorStop(0, "rgba(30,70,110,0)");
    qg.addColorStop(0.4, "rgba(20,50,80,0.65)");
    qg.addColorStop(1, "rgba(10,25,45,0.85)");
    ctx.fillStyle = qg;
    ctx.fillRect(860, 220, 420, VH - 220);

    // Water surface turbulence and boiling foam
    if (sim.quenching) {
      ctx.globalCompositeOperation = "lighter";
      const bubbleTime = time * 14;
      for (let b = 0; b < 18; b++) {
        const bx = 890 + ((b * 41 + Math.sin(bubbleTime + b) * 18) % 360);
        const by = 250 + ((b * 31 + bubbleTime * 12) % 200);
        ctx.fillStyle = "rgba(215, 235, 255, 0.45)";
        ctx.beginPath();
        ctx.arc(bx, by, 1.8 + (b % 3.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 9. Rising Steam Particles (Quench)
  for (const st of steams) {
    const a = (st.life / st.max) * st.alpha;
    ctx.save();
    ctx.fillStyle = `rgba(240, 245, 255, ${a})`;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 10. Flying Sparks & Hot Scale
  for (const p of sparks) {
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color || `rgba(255,${170 + a * 70},${70},${a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Spark burst sprite sheet overlay
  if (sim.sparkAnim > 0 && images.sparks) {
    const fi = Math.min(3, Math.floor((1 - sim.sparkAnim / 0.42) * 4));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    drawSheetFrame(ctx, images.sparks, 2, 2, fi, bladeX - 90, bladeY - 110, 210, 210);
    ctx.restore();
  }

  // 10b. Floating Real-time Strike Gold Rewards
  for (const gp of goldPops) {
    const a = Math.max(0, gp.life / gp.max);
    ctx.save();
    ctx.font = "bold 26px 'Cinzel', serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(245, 158, 11, 0.95)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = `rgba(255, 235, 120, ${a})`;
    ctx.fillText(gp.text, gp.x, gp.y);
    ctx.restore();
  }

  // 11. Blacksmith Hand & Hammer
  if (onAnvil && sim.phase === "forge" && !sim.broken) {
    drawHand(ctx, images, sim, time, bladeX, bladeY);
  }

  // 12. Broken Sword Failure Overlay
  if (sim.broken) {
    ctx.save();
    ctx.fillStyle = "rgba(40, 10, 5, 0.45)";
    ctx.fillRect(0, 0, VW, VH);
    ctx.restore();
  }

  // 13. Atmospheric Vignette
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, 220, VW / 2, VH / 2, 540);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(6,4,2,0.5)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VW, VH);
}

function drawTongs(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = "#221c18";
  ctx.strokeStyle = "#0e0a07";
  ctx.lineWidth = 1.4;

  // Upper clamp jaw
  ctx.beginPath();
  ctx.moveTo(14, -8);
  ctx.lineTo(-14, -9);
  ctx.lineTo(-32, -5);
  ctx.lineTo(-32, 4);
  ctx.lineTo(-14, 0);
  ctx.lineTo(14, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lower clamp jaw
  ctx.beginPath();
  ctx.moveTo(14, 8);
  ctx.lineTo(-14, 9);
  ctx.lineTo(-32, 5);
  ctx.lineTo(-32, -4);
  ctx.lineTo(-14, 0);
  ctx.lineTo(14, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Central pivot rivet
  ctx.beginPath();
  ctx.arc(-26, 0, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = "#3d3228";
  ctx.fill();
  ctx.stroke();

  // Heavy forged handles extending cleanly off-screen toward the blacksmith
  ctx.beginPath();
  ctx.moveTo(-28, -3);
  ctx.lineTo(-550, 88);
  ctx.moveTo(-28, 3);
  ctx.lineTo(-550, 142);
  ctx.strokeStyle = "#241d18";
  ctx.lineWidth = 5.4;
  ctx.stroke();

  // Forged iron edge highlight from forge fire
  ctx.beginPath();
  ctx.moveTo(-28, -4);
  ctx.lineTo(-550, 86);
  ctx.strokeStyle = "rgba(255, 140, 40, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Dark shadow on lower reins
  ctx.beginPath();
  ctx.moveTo(-28, 4);
  ctx.lineTo(-550, 144);
  ctx.strokeStyle = "#0e0906";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.restore();
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  images: GameImages,
  sim: ReturnType<typeof createSim>,
  time: number,
  bladeX: number,
  bladeY: number,
) {
  const size = 420;
  const zoneOffsetX = sim.targetZone === "base" ? -75 : sim.targetZone === "tip" ? 95 : 0;
  const zoneOffsetY = sim.targetZone === "base" ? 14 : sim.targetZone === "tip" ? -18 : 0;
  // Position hammer so its striking head lands squarely on the anvil workpiece zone
  const hx = bladeX - 105 + zoneOffsetX;
  const hy = bladeY - 265 + zoneOffsetY;

  if (sim.strikeAnim > 0 && images.strike) {
    const t = 1 - sim.strikeAnim / 0.38;
    const frame = Math.min(5, Math.floor(t * 6));
    drawSheetFrame(ctx, images.strike, 3, 2, frame, hx, hy, size, size * 0.66);
    featherShoulder(ctx, hx, hy, size);
    return;
  }

  const charge = sim.charging ? sim.force : 0;
  const bob = Math.sin(time * 2.2) * 3;
  ctx.save();
  const pivotX = hx + size * 0.78;
  const pivotY = hy + size * 0.18;
  ctx.translate(pivotX, pivotY);
  ctx.rotate(-charge * 0.22 + bob * 0.01);
  ctx.translate(-pivotX, -pivotY);

  if (images.strike) {
    // Frame 0 of hand-strike is the authentic high ready stance with hammer raised!
    drawSheetFrame(ctx, images.strike, 3, 2, 0, hx, hy, size, size * 0.66);
  } else if (images.hand) {
    ctx.drawImage(images.hand, hx, hy, size, size);
  }
  featherShoulder(ctx, hx, hy, size);
  ctx.restore();
}

function featherShoulder(ctx: CanvasRenderingContext2D, hx: number, hy: number, size: number) {
  // Soft atmospheric feather over the cut shoulder edge so it emerges seamlessly from forge shadow
  ctx.save();
  const cx = hx + size * 0.88;
  const cy = hy + size * 0.15;
  const fade = ctx.createRadialGradient(cx, cy, 12, cx, cy, 80);
  fade.addColorStop(0, "rgba(18, 12, 8, 0.95)");
  fade.addColorStop(0.55, "rgba(18, 12, 8, 0.6)");
  fade.addColorStop(1, "rgba(18, 12, 8, 0)");
  ctx.fillStyle = fade;
  ctx.beginPath();
  ctx.arc(cx, cy, 85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const ir = img.width / img.height;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

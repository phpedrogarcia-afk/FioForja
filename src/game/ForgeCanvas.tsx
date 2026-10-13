import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import type { GameImages } from "./assets";
import { createSim, stepSim, type SimInput } from "./sim";
import { workpiecePose, type WorkpiecePose } from "./layout";
import { contactPoint, paintForge, type Spark } from "./forgeScene";
import type { HudSnapshot, SimState, SwordDesign } from "./types";
import { playClang, playHiss, playPull, playWhoosh } from "./audio";
interface Props {
  design: SwordDesign;
  images: GameImages;
  shake: boolean;
  reducedMotion: boolean;
  onHud: (hud: HudSnapshot) => void;
  onFinished: (sim: SimState) => void;
  inputRef: MutableRefObject<SimInput>;
}
export function ForgeCanvas({
  design,
  images,
  shake,
  reducedMotion,
  onHud,
  onFinished,
  inputRef,
}: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const sim = createSim(design);
    const sparks: Spark[] = [];
    let raf = 0,
      last = performance.now(),
      time = 0,
      hudAcc = 0,
      trauma = 0,
      end = -1,
      finished = false;
    let visualPose: WorkpiecePose | null = null;
    let w = 1,
      h = 1,
      dpr = 1;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const loop = (ts: number) => {
      const dt = document.hidden ? 0 : Math.min((ts - last) / 1000, 0.04);
      last = ts;
      time += dt;
      const ev = stepSim(sim, dt, inputRef.current, design, time);
      inputRef.current.action = false;
      inputRef.current.reheat = false;
      if (ev.sfx === "clang") playClang(ev.force ?? 0.6, ev.kind ?? "good");
      if (ev.sfx === "hiss") playHiss();
      if (ev.sfx === "pull") playPull();
      if (ev.sfx === "whoosh") playWhoosh();
      if (ev.kind) {
        sim.strikeAnim = 0.24;
        trauma = ev.trauma ?? 0.2;
        const p = contactPoint(w, h, design, sim.along);
        const n = reducedMotion ? 6 : ev.kind === "perfect" ? 40 : 22;
        for (let i = 0; i < n; i++) {
          const a = -Math.PI + Math.random() * Math.PI * 2,
            speed = 40 + Math.random() * 180;
          sparks.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * speed,
            vy: Math.sin(a) * speed,
            life: 0.25 + Math.random() * 0.35,
            size: Math.random() * 2 + 1,
            color: ev.kind === "perfect" ? "#ffe8a3" : "#ea813c",
          });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]!;
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += dt * 190;
        if (p.life <= 0) sparks.splice(i, 1);
      }
      trauma = Math.max(0, trauma - dt * 5);
      if (ev.finished && end < 0) end = 0.55;
      if (end >= 0 && !finished) {
        end -= dt;
        if (end <= 0) {
          finished = true;
          onFinished(sim);
        }
      }
      hudAcc += dt;
      if (hudAcc >= 0.035) {
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
          missStreak: sim.missStreak,
          broken: sim.broken,
        });
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (shake && !reducedMotion)
        ctx.translate(Math.sin(time * 73) * trauma * 2, Math.cos(time * 67) * trauma * 2);
      const target = workpiecePose(w, h, design, sim.phase, sim.reheating, sim.quenchFill);
      if (!visualPose || reducedMotion) visualPose = target;
      else {
        const t = 1 - Math.exp(-dt * 9);
        visualPose = {
          x: visualPose.x + (target.x - visualPose.x) * t,
          y: visualPose.y + (target.y - visualPose.y) * t,
          angle: visualPose.angle + (target.angle - visualPose.angle) * t,
          length: visualPose.length + (target.length - visualPose.length) * t,
        };
      }
      paintForge(ctx, w, h, images, design, sim, sparks, time, reducedMotion, visualPose);
      ctx.restore();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [design, images, shake, reducedMotion, onHud, onFinished, inputRef]);
  return (
    <canvas
      ref={ref}
      className="absolute inset-0 block h-full w-full touch-none"
      tabIndex={0}
      aria-keyshortcuts="Space Enter R"
      aria-label="Segure Espaço ou Enter para carregar, solte para agir. R reaquece. Forja: lâmina sobre a bigorna, tenaz à esquerda e martelo à direita"
    />
  );
}

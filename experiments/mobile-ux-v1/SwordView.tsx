import { useEffect, useRef } from "react";
import type { WeaponVisualSource } from "../../src/game/visuals/weaponGenome";
import { deriveWeaponVisualGenome } from "../../src/game/visuals/weaponGenome";
import { drawWeaponGenome, fitWeaponViewport } from "../../src/game/visuals/weaponRenderer";
import { drawFinishedSword } from "../../src/game/swordDraw";
import { PROFILES } from "../../src/game/catalog";

export function SwordView({ sword, className = "", label }: { sword: WeaponVisualSource; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(devicePixelRatio || 1, 2.75);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      if (sword.broken || sword.structuralState === "broken") {
        const factor = (0.62 + sword.design.length * 0.38) * PROFILES[sword.design.profile].length;
        drawFinishedSword(ctx, sword.design, w * 0.43, h * 0.86, Math.min(h * 0.68, w * 2.2) / factor, {
          angle: -Math.PI / 2, assembled: false, broken: true, shape: 1, heat: 0,
          quality: sword.quality, cracks: sword.cracks, warp: sword.warp, physicalProfile: sword.physicalProfile,
        });
        canvas.dataset.renderer = "legacy-broken";
        return;
      }
      const genome = deriveWeaponVisualGenome(sword);
      const viewport = fitWeaponViewport(genome, w - 26, h - 24, -Math.PI / 2);
      drawWeaponGenome(ctx, genome, { ...viewport, x: viewport.x + 13, y: viewport.y + 12 }, { lightOffset: 0.55, runicCharge: 0 });
      canvas.dataset.renderer = "dna";
    };
    const observer = new ResizeObserver(draw); observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [sword]);
  return <canvas ref={ref} className={`sword-view ${className}`} aria-label={label || `${sword.broken || sword.structuralState === "broken" ? "Fragmentos da lâmina" : "Espada inteira"}: ${sword.design.name}`} role="img" />;
}

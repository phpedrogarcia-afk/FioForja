import { useEffect, useRef } from "react";
import { PROFILES } from "../catalog";
import { drawFinishedSword } from "../swordDraw";
import { getWeaponRenderMode } from "../visuals/rendererAdapter";
import { deriveWeaponVisualGenome, type WeaponVisualSource } from "../visuals/weaponGenome";
import { drawWeaponGenome, fitWeaponViewport } from "../visuals/weaponRenderer";

/**
 * Desenha a arma inteira em um canvas responsivo.
 * Usa Weapon DNA quando o modo experimental está habilitado e mantém o
 * renderizador legado como fallback (inclusive para lâminas quebradas).
 */
export function WeaponPreview({
  sword,
  className = "",
  padded = true,
}: {
  sword: WeaponVisualSource;
  className?: string;
  padded?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const renderMode = getWeaponRenderMode();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.75);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const broken = sword.broken || sword.structuralState === "broken";
      const pad = padded ? 12 : 4;
      if (renderMode === "dna" && !broken) {
        const genome = deriveWeaponVisualGenome(sword);
        const viewport = fitWeaponViewport(genome, w - pad * 2, h - pad * 2, -Math.PI / 2);
        drawWeaponGenome(ctx, genome, { ...viewport, x: viewport.x + pad, y: viewport.y + pad });
        canvas.dataset.renderer = "dna";
      } else {
        const scale = Math.max(0.02, Math.min((h - pad * 2) / 500, (w - pad * 2) / 190));
        const factor = (0.62 + sword.design.length * 0.38) * PROFILES[sword.design.profile].length;
        ctx.translate(w / 2, h / 2 + 150 * scale);
        ctx.scale(scale, scale);
        drawFinishedSword(ctx, sword.design, 0, 0, 400 / factor, {
          angle: -Math.PI / 2,
          assembled: !broken,
          broken,
          quality: sword.quality,
          warp: sword.warp,
          cracks: sword.cracks,
          physicalProfile: sword.physicalProfile,
        });
        canvas.dataset.renderer = broken ? "legacy-broken" : "legacy";
      }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(canvas);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [sword, renderMode, padded]);

  return (
    <canvas
      ref={ref}
      className={"block h-full w-full " + className}
      role="img"
      aria-label={`${sword.broken || sword.structuralState === "broken" ? "Fragmentos da espada" : "Espada inteira"}: ${sword.design.name || "sem nome"}`}
    />
  );
}

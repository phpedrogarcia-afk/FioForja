import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { PROFILES } from "../catalog";
import { drawFinishedSword } from "../swordDraw";
import type { FinishedSword, SwordDesign } from "../types";
export function SwordPreview({
  design,
  sword,
  inspect = false,
  compact = false,
}: {
  design: SwordDesign;
  sword?: FinishedSword;
  inspect?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const draw = () => {
      const w = canvas.clientWidth,
        h = canvas.clientHeight,
        dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, h * 0.65);
      glow.addColorStop(0, "rgba(78,151,153,.16)");
      glow.addColorStop(1, "rgba(12,19,23,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      const scale = Math.min(w / 360, h / 560);
      const length = (h * 0.68) / (PROFILES[design.profile].length * (0.55 + design.length * 0.45));
      ctx.save();
      ctx.translate(w / 2 + pan.x, h * 0.77 + pan.y);
      ctx.scale(zoom, zoom);
      drawFinishedSword(ctx, design, 0, 0, length, {
        angle: -Math.PI / 2 + rotation,
        assembled: true,
        quality: sword?.quality ?? 95,
        shape: sword?.broken ? 0.65 : 1,
        broken: sword?.broken,
        widthScale: scale,
        rareRunes: sword?.boon === "runas" || sword?.boon === "runas-elfico",
        elven: sword?.boon === "elfico" || sword?.boon === "runas-elfico",
      });
      ctx.restore();
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [design, sword, zoom, rotation, pan]);
  return (
    <div className={`sword-stage ${compact ? "compact" : ""}`}>
      <canvas
        ref={ref}
        aria-label={`Espada ${sword?.title ?? design.name}`}
        style={{ touchAction: inspect ? "none" : "auto" }}
        onPointerDown={(e) => {
          if (!inspect || zoom === 1) return;
          drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      />
      {inspect ? (
        <div className="inspection-controls">
          <button
            aria-label="Diminuir zoom"
            disabled={zoom === 1}
            onClick={() => {
              setZoom((z) => Math.max(1, z - 0.25));
              setPan({ x: 0, y: 0 });
            }}
          >
            <ZoomOut size={18} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            aria-label="Aumentar zoom"
            disabled={zoom >= 2}
            onClick={() => setZoom((z) => Math.min(2, z + 0.25))}
          >
            <ZoomIn size={18} />
          </button>
          <button
            aria-label="Girar espada"
            onClick={() => setRotation((r) => (r === 0 ? 0.18 : 0))}
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
              setRotation(0);
            }}
          >
            Enquadrar
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GUARDS, POMMELS, PROFILES, STEELS, WRAPS } from "../catalog";
import { drawFinishedSword } from "../swordDraw";
import type { GuardId, PommelId, ProfileId, SteelId, SwordDesign, WrapId } from "../types";

interface Props {
  design: SwordDesign;
  onChange: (next: SwordDesign) => void;
  onBack: () => void;
  onForge: () => void;
}

export function DesignScreen({ design, onChange, onBack, onForge }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w / 2, h * 0.55, 20, w / 2, h * 0.55, w * 0.42);
    g.addColorStop(0, "rgba(196,92,38,0.18)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    drawFinishedSword(ctx, design, w / 2, h * 0.58, Math.min(w, h) * 0.92, {
      angle: -Math.PI / 2.08,
      assembled: true,
      heat: 0,
      shape: 1,
      quality: 80,
    });
  }, [design]);

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
        <h1 className="font-display text-sm uppercase tracking-[0.22em] text-muted">Projeto</h1>
        <span className="w-16" />
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pb-36">
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_40px_rgb(8_5_3_/_0.45)]">
          <canvas ref={canvasRef} className="h-56 w-full sm:h-72" />
        </div>

        <label className="mt-5 block font-display text-xs uppercase tracking-[0.16em] text-muted">
          Nome da lâmina
          <input
            className="mt-2 h-11 w-full rounded-md border border-border bg-elevated px-3 font-body text-base text-fg placeholder:text-subtle"
            maxLength={28}
            value={design.name}
            onChange={(e) => onChange({ ...design, name: e.target.value })}
            placeholder="Ex.: Juramento"
          />
        </label>

        <Section title="Perfil da lâmina">
          <ChipRow
            options={Object.entries(PROFILES).map(([id, v]) => ({
              id,
              label: v.name,
              hint: v.blurb,
            }))}
            value={design.profile}
            onChange={(id) => onChange({ ...design, profile: id as ProfileId })}
          />
        </Section>

        <Section title="Ferro">
          <ChipRow
            options={Object.entries(STEELS).map(([id, v]) => ({
              id,
              label: v.name,
              hint: v.blurb,
            }))}
            value={design.steel}
            onChange={(id) => onChange({ ...design, steel: id as SteelId })}
          />
        </Section>

        <Section title="Cabo">
          <ChipRow
            options={Object.entries(WRAPS).map(([id, v]) => ({ id, label: v.name }))}
            value={design.wrap}
            onChange={(id) => onChange({ ...design, wrap: id as WrapId })}
          />
        </Section>

        <Section title="Guarda">
          <ChipRow
            options={Object.entries(GUARDS).map(([id, v]) => ({ id, label: v.name }))}
            value={design.guard}
            onChange={(id) => onChange({ ...design, guard: id as GuardId })}
          />
        </Section>

        <Section title="Pomo">
          <ChipRow
            options={Object.entries(POMMELS).map(([id, v]) => ({ id, label: v.name }))}
            value={design.pommel}
            onChange={(id) => onChange({ ...design, pommel: id as PommelId })}
          />
        </Section>

        <Section title="Comprimento">
          <input
            type="range"
            min={0.75}
            max={1.2}
            step={0.01}
            value={design.length}
            onChange={(e) => onChange({ ...design, length: Number(e.target.value) })}
            className="mt-2 w-full accent-ember"
            aria-label="Comprimento da lâmina"
          />
        </Section>

        <Section title="Inscrição">
          <input
            className="mt-2 h-11 w-full rounded-md border border-border bg-elevated px-3 font-body text-base text-fg placeholder:text-subtle"
            maxLength={24}
            value={design.inscription}
            onChange={(e) => onChange({ ...design, inscription: e.target.value })}
            placeholder="Palavra na lâmina"
          />
          <label className="mt-3 flex min-h-11 items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={design.runes}
              onChange={(e) => onChange({ ...design, runes: e.target.checked })}
              className="size-4 accent-ember"
            />
            Gravar em runas
          </label>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-bg/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button size="lg" className="mx-auto flex w-full max-w-md" onClick={onForge}>
          Levar ao fogo
        </Button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-display text-xs uppercase tracking-[0.16em] text-muted">{title}</h2>
      {children}
    </section>
  );
}

function ChipRow({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string; hint?: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "min-h-12 rounded-md border px-3 py-2 text-left transition-colors duration-150",
              active
                ? "border-ember bg-elevated text-fg"
                : "border-border bg-surface text-muted hover:border-iron",
            )}
          >
            <span className="block font-display text-sm tracking-wide">{opt.label}</span>
            {opt.hint ? <span className="mt-0.5 block text-xs text-subtle">{opt.hint}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

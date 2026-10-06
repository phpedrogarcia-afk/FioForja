import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HudSnapshot } from "../types";
import { metalColorCss } from "../swordDraw";

interface Props {
  hud: HudSnapshot;
  muted: boolean;
  onMute: () => void;
  onPull: () => void;
  onReheat: () => void;
  onQuit: () => void;
}

export function ForgeHud({ hud, muted, onMute, onPull, onReheat, onQuit }: Props) {
  const phaseLabel =
    hud.phase === "heat" ? "Aquecer" : hud.phase === "forge" ? "Martelar" : "Temperar";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
      <div className="pointer-events-auto flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-lg border border-border bg-bg/80 px-3 py-2">
            <p className="font-display text-[0.65rem] uppercase tracking-[0.2em] text-muted">{phaseLabel}</p>
            <p className="mt-1 max-w-[16rem] text-sm leading-snug text-fg sm:max-w-sm">{hud.message}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onMute} aria-label={muted ? "Ativar som" : "Silenciar"}>
              {muted ? "Som" : "Mudo"}
            </Button>
            <Button variant="ghost" size="sm" onClick={onQuit}>
              Sair
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:max-w-md">
          <Stat label="Calor" value={`${Math.round(hud.heat * 100)}%`} color={metalColorCss(hud.heat)} />
          <Stat label="Forma" value={`${Math.round(hud.shape * 100)}%`} />
          <Stat
            label={hud.phase === "forge" ? "Golpes" : "Qualidade"}
            value={hud.phase === "forge" ? `${hud.strikes}/${hud.maxStrikes}` : `${Math.round(hud.quality)}`}
          />
        </div>
      </div>

      <div className="pointer-events-auto mt-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {hud.phase === "heat" ? (
          <Button size="lg" className="w-full sm:w-auto" onClick={onPull}>
            Retirar do fogo
          </Button>
        ) : null}

        {hud.phase === "forge" ? (
          <div className="flex w-full flex-col gap-3 sm:max-w-xl">
            <ForceMeter
              force={hud.force}
              charging={hud.charging}
              center={hud.sweetCenter}
              width={hud.sweetWidth}
            />
            <p className="text-center text-sm text-muted sm:text-left">
              Segure na bigorna para carregar. Solte no brilho.
            </p>
            {hud.heat < 0.4 ? (
              <Button variant="secondary" size="md" className="w-full sm:w-auto" onClick={onReheat}>
                Reaquecer
              </Button>
            ) : null}
          </div>
        ) : null}

        {hud.phase === "quench" ? (
          <div className="w-full sm:max-w-md">
            <div className="relative h-4 overflow-hidden rounded-sm border border-border bg-elevated">
              <div
                className="absolute inset-y-0 bg-ember-hot"
                style={{ width: `${hud.quenchFill * 100}%` }}
              />
              <div
                className="absolute inset-y-0 border-x border-good/80 bg-good/25"
                style={{ left: "42%", width: "20%" }}
              />
            </div>
            <p className="mt-2 text-center text-sm text-muted sm:text-left">
              Segure para mergulhar. Solte na faixa.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg/75 px-3 py-2">
      <p className="font-display text-[0.65rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="font-display text-lg tabular-nums text-fg" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function ForceMeter({
  force,
  charging,
  center,
  width,
}: {
  force: number;
  charging: boolean;
  center: number;
  width: number;
}) {
  const lo = Math.max(0, center - width / 2);
  return (
    <div className="relative h-8 overflow-hidden rounded-md border border-border bg-elevated">
      <div
        className="absolute inset-y-1 rounded-xs bg-good/30"
        style={{ left: `${lo * 100}%`, width: `${width * 100}%` }}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-good"
        style={{ left: `${center * 100}%` }}
      />
      <div
        className={cn(
          "absolute top-0 h-full bg-ember transition-[width] duration-75",
          charging ? "opacity-100" : "opacity-80",
        )}
        style={{ width: `${force * 100}%` }}
      />
      <div
        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fg bg-ember-hot"
        style={{ left: `${force * 100}%` }}
      />
    </div>
  );
}

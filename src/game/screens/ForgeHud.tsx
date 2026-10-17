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
  onSelectZone?: (zone: import("../types").ForgeZone) => void;
  onSelectHammer?: (hammer: import("../types").HammerType) => void;
  unlockedHammers?: import("../types").HammerType[];
  onQuit: () => void;
}

export function ForgeHud({
  hud,
  muted,
  unlockedHammers,
  onMute,
  onPull,
  onReheat,
  onSelectZone,
  onSelectHammer,
  onQuit,
}: Props) {
  const phaseLabel =
    hud.phase === "heat" ? "Aquecer" : hud.phase === "forge" ? "Martelar" : "Temperar";

  const integrityColor =
    hud.integrity < 35 ? "#ef4444" : hud.integrity < 65 ? "#f59e0b" : "#10b981";

  const activeZone = hud.targetZone || "mid";
  const activeHammer = hud.activeHammer || "standard";

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
      <div className="pointer-events-auto flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="rounded-lg border border-border bg-bg/85 px-3 py-2 shadow-lg backdrop-blur-xs">
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

        {/* Crack / Structural Failure Warning Banner */}
        {hud.cracks > 0 && !hud.broken && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/50 bg-red-950/80 px-3 py-2 text-red-200 shadow-md backdrop-blur-xs animate-pulse sm:max-w-md">
            <span className="text-lg">⚠️</span>
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider text-red-400">Risco Crítico:</span> {hud.cracks} trinca(s) no metal! Reaqueça antes do próximo golpe!
            </div>
          </div>
        )}

        {hud.broken && (
          <div className="flex items-center gap-2 rounded-md border border-red-600 bg-black/90 px-3 py-2 text-red-300 shadow-xl backdrop-blur-xs sm:max-w-md">
            <span className="text-xl">💥</span>
            <div className="text-xs font-display tracking-wide">
              <span className="font-bold uppercase text-red-500">Lâmina Quebrada:</span> Choque estrutural fatal na bigorna.
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 sm:max-w-md">
          <Stat label="Calor" value={`${Math.round(hud.heat * 100)}%`} color={metalColorCss(hud.heat)} />
          <Stat label="Forma" value={`${Math.round(hud.shape * 100)}%`} />
          <Stat label="Integridade" value={`${Math.round(hud.integrity)}%`} color={integrityColor} />
          <Stat
            label={hud.phase === "forge" ? "Golpes" : "Qualidade"}
            value={hud.phase === "forge" ? `${hud.strikes}/${hud.maxStrikes}` : `${Math.round(hud.quality)}`}
          />
        </div>

        {/* Multi-Zone Targeting & Tool Selectors (During Forge Phase) */}
        {hud.phase === "forge" && !hud.broken && (
          <div className="flex flex-col gap-2 rounded-lg border border-[#23324d] bg-[#0c101c]/90 p-2.5 shadow-md backdrop-blur-xs sm:max-w-md">
            <div className="flex items-center justify-between text-[0.65rem] font-display uppercase tracking-wider text-slate-400">
              <span>Zona da Lâmina [1, 2, 3]</span>
              <span>Ferramenta [H]</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              {/* Blade Zones */}
              <div className="flex gap-1.5">
                {[
                  { id: "base" as const, label: "Base [1]", count: hud.zoneProgress?.base || 0 },
                  { id: "mid" as const, label: "Centro [2]", count: hud.zoneProgress?.mid || 0 },
                  { id: "tip" as const, label: "Ponta [3]", count: hud.zoneProgress?.tip || 0 },
                ].map((z) => (
                  <button
                    key={z.id}
                    onClick={() => onSelectZone?.(z.id)}
                    className={`rounded px-2 py-1 text-xs font-display transition-colors ${
                      activeZone === z.id
                        ? "border border-amber-500 bg-amber-500/20 text-amber-300 font-bold shadow-xs"
                        : "border border-border bg-surface text-slate-400 hover:text-fg"
                    }`}
                  >
                    {z.label} <span className="opacity-70">({z.count})</span>
                  </button>
                ))}
              </div>

              {/* Hammers */}
              <div className="flex gap-1">
                {[
                  { id: "precision" as const, label: "⚒️ Pena" },
                  { id: "standard" as const, label: "🔨 Padrão" },
                  { id: "sledge" as const, label: "🪓 Marreta" },
                ].map((h) => {
                  const isUnlocked = !unlockedHammers || unlockedHammers.includes(h.id);
                  return (
                    <button
                      key={h.id}
                      disabled={!isUnlocked}
                      onClick={() => isUnlocked && onSelectHammer?.(h.id)}
                      title={isUnlocked ? h.label : `${h.label} (Bloqueado na Oficina)`}
                      className={`rounded px-1.5 py-1 text-[0.7rem] font-display transition-colors ${
                        activeHammer === h.id
                          ? "border border-blue-400 bg-blue-500/20 text-blue-200 font-semibold"
                          : isUnlocked
                          ? "border border-border bg-surface text-slate-400 hover:text-fg"
                          : "border border-border/40 bg-surface/30 text-slate-600 cursor-not-allowed opacity-40"
                      }`}
                    >
                      {h.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pointer-events-auto mt-auto flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {hud.phase === "heat" ? (
          <Button size="lg" className="w-full sm:w-auto shadow-lg" onClick={onPull}>
            Retirar do fogo para a bigorna
          </Button>
        ) : null}

        {hud.phase === "forge" && !hud.broken ? (
          <div className="flex w-full flex-col gap-3 sm:max-w-xl">
            <ForceMeter
              force={hud.force}
              charging={hud.charging}
              center={hud.sweetCenter}
              width={hud.sweetWidth}
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Segure na bigorna para carregar · Solte na faixa iluminada</span>
              <span className="hidden sm:inline">[Espaço / Clique]</span>
            </div>
            {hud.heat < 0.58 ? (
              <Button
                variant={hud.heat < 0.38 ? "danger" : "secondary"}
                size="md"
                className="w-full sm:w-auto shadow-md"
                onClick={onReheat}
              >
                🔥 Reaquecer na fornalha (R)
              </Button>
            ) : null}
          </div>
        ) : null}

        {hud.phase === "quench" && !hud.broken ? (
          <div className="w-full sm:max-w-md">
            <div className="relative h-4 overflow-hidden rounded-sm border border-border bg-elevated">
              <div
                className="absolute inset-y-0 bg-ember-hot transition-[width] duration-75"
                style={{ width: `${hud.quenchFill * 100}%` }}
              />
              <div
                className="absolute inset-y-0 border-x border-good/80 bg-good/25"
                style={{ left: "44%", width: "16%" }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-muted sm:text-left">
              Segure para mergulhar no banho de óleo/água. Solte na faixa verde!
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-border bg-bg/85 px-2.5 py-2 shadow-xs backdrop-blur-xs">
      <p className="font-display text-[0.62rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="font-display text-base font-semibold tabular-nums text-fg" style={color ? { color } : undefined}>
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
    <div className="relative h-9 overflow-hidden rounded-md border border-border bg-elevated shadow-inner">
      <div
        className="absolute inset-y-1 rounded-xs bg-good/35 border-x border-good"
        style={{ left: `${lo * 100}%`, width: `${width * 100}%` }}
      />
      <div
        className="absolute top-0 h-full w-0.5 bg-good shadow-[0_0_8px_#10b981]"
        style={{ left: `${center * 100}%` }}
      />
      <div
        className={cn(
          "absolute top-0 h-full bg-linear-to-r from-ember/80 to-ember-hot transition-[width] duration-75",
          charging ? "opacity-100" : "opacity-85",
        )}
        style={{ width: `${force * 100}%` }}
      />
      <div
        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-fg bg-ember-hot shadow-[0_0_10px_#f97316]"
        style={{ left: `${force * 100}%` }}
      />
    </div>
  );
}

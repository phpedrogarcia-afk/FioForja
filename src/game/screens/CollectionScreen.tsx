import { useMemo, useState } from "react";
import { ArrowRight, FlaskConical, Hammer, ShieldCheck, Sparkles, Star, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WeaponPreview } from "../components/WeaponPreview";
import { Sheet } from "../components/Sheet";
import {
  CANONICAL_PRESETS,
  FAMILIES,
  GUARDS,
  POMMELS,
  PROFILES,
  RUNES_COMPENDIUM,
  STEELS,
  WRAPS,
  gradeFor,
} from "../catalog";
import { evaluateBlueprintStatus } from "../blueprints";
import { getMaterialStock, getRequiredMaterialForSteel } from "../materials";
import type {
  CareerStats,
  FinishedSword,
  FusionCore,
  InventoryComponent,
  PlayerInventory,
  PlayerWallet,
  RarityGrade,
} from "../types";

type CollectionTab = "arsenal" | "compendio" | "componentes" | "runas" | "nucleos" | "comparar";
type ComponentCategory = InventoryComponent["category"];

const TABS: Array<{ id: CollectionTab; label: string }> = [
  { id: "arsenal", label: "Arsenal" },
  { id: "compendio", label: "Compêndio" },
  { id: "componentes", label: "Peças" },
  { id: "runas", label: "Runas" },
  { id: "nucleos", label: "Núcleos" },
  { id: "comparar", label: "Comparar" },
];

const RARITY_STYLE: Record<string, string> = {
  Comum: "border-stone-600 bg-stone-800/80 text-stone-200",
  Incomum: "border-emerald-700 bg-emerald-950/60 text-emerald-200",
  Rara: "border-sky-700 bg-sky-950/60 text-sky-200",
  Épica: "border-violet-700 bg-violet-950/60 text-violet-200",
  Lendária: "border-amber-600 bg-amber-950/60 text-amber-200",
  Relíquia: "border-rose-600 bg-rose-950/60 text-rose-200",
};

function RarityChip({ rarity }: { rarity?: RarityGrade }) {
  return (
    <span
      className={
        "rounded border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider " +
        (RARITY_STYLE[rarity || "Comum"] || RARITY_STYLE.Comum)
      }
    >
      {rarity || "Comum"}
    </span>
  );
}

function statsOf(sword: FinishedSword) {
  return {
    atk: sword.damage ?? sword.baseDamage ?? 0,
    def: sword.defense ?? sword.baseDefense ?? 0,
    agi: sword.agility ?? sword.baseAgility ?? 0,
    dur: sword.durability ?? sword.baseDurability ?? 0,
  };
}

function AttributeBar({ sword }: { sword: FinishedSword }) {
  const stats = statsOf(sword);
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {[
        ["P.ATK", stats.atk],
        ["DEF", stats.def],
        ["AGI", stats.agi],
        ["DUR", stats.dur],
      ].map(([label, value]) => (
        <div key={String(label)} className="rounded border border-border/80 bg-black/25 px-1 py-1 text-center">
          <p className="text-[0.55rem] uppercase tracking-wider text-muted">{label}</p>
          <p className="font-display text-sm font-bold tabular-nums text-[#e8dcc4]">{value}</p>
        </div>
      ))}
    </div>
  );
}

function heritageHeadline(core: FusionCore): string {
  if (!core.heritage) return "Herança registrada no núcleo";
  const biases: Array<[number, string]> = [
    [core.heritage.attackBias, "Afinidade ofensiva predominante"],
    [core.heritage.defenseBias, "Têmpera defensiva predominante"],
    [core.heritage.agilityBias, "Equilíbrio ágil predominante"],
    [core.heritage.durabilityBias, "Resiliência estrutural predominante"],
  ];
  biases.sort((a, b) => b[0] - a[0]);
  return biases[0][0] > 0 ? biases[0][1] : "Memória de metal equilibrada";
}

function signed(value: number | undefined): string {
  const n = value || 0;
  return n >= 0 ? `+${n}` : String(n);
}

interface Props {
  swords: FinishedSword[];
  inventory: PlayerInventory;
  wallet: PlayerWallet;
  career: CareerStats;
  onInstallComponent: (swordId: string, componentId: string) => boolean;
  onToggleFavorite: (swordId: string) => boolean;
  onUpgrade: (sword: FinishedSword) => boolean;
  onPrepareCore: (core: FusionCore) => void;
  onGoShop: () => void;
  onGoForge: () => void;
}

/**
 * Coleção: Arsenal real, compêndio, peças, runas, núcleos e comparação.
 * Inspeção lê o estado canônico (a espada é recalculada pela transação e
 * relida da galeria), nunca uma cópia local divergente.
 */
export function CollectionScreen({
  swords,
  inventory,
  wallet,
  career,
  onInstallComponent,
  onToggleFavorite,
  onUpgrade,
  onPrepareCore,
  onGoShop,
  onGoForge,
}: Props) {
  const [tab, setTab] = useState<CollectionTab>("arsenal");
  const [rarityFilter, setRarityFilter] = useState<"Todas" | RarityGrade>("Todas");
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [pickerCategory, setPickerCategory] = useState<ComponentCategory | null>(null);
  const [installComponentId, setInstallComponentId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<[string | null, string | null]>([null, null]);

  const arsenal = useMemo(
    () =>
      swords
        .filter((s) => !s.isTraining)
        .filter((s) => rarityFilter === "Todas" || (s.rarity || "Comum") === rarityFilter)
        .sort((a, b) => b.createdAt - a.createdAt),
    [swords, rarityFilter],
  );

  const inspected = swords.find((s) => s.id === inspectId) || null;
  const components = inventory.components || [];
  const cores = inventory.fusionCores || [];
  const compareA = swords.find((s) => s.id === compareIds[0]) || null;
  const compareB = swords.find((s) => s.id === compareIds[1]) || null;

  const installComponent = (swordId: string, componentId: string) => {
    const ok = onInstallComponent(swordId, componentId);
    setNotice(ok ? "Peça instalada e atributos recalculados." : null);
    if (ok) setPickerCategory(null);
  };

  const openComponentPicker = (category: ComponentCategory) => {
    setNotice(null);
    setPickerCategory(category);
  };

  return (
    <main className="mx-auto w-full max-w-2xl space-y-3 px-3 pt-3 pb-6">
      <header>
        <p className="font-display text-[0.62rem] uppercase tracking-[0.24em] text-amber-400/90">O Arsenal</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-amber-50">Coleção</h1>
        <p className="mt-1 text-xs text-muted">A arma é a heroína. Cada peça conta a história da forja.</p>
      </header>

      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1" role="tablist" aria-label="Categorias da Coleção">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => {
              setTab(item.id);
              setNotice(null);
            }}
            className={
              "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold " +
              (tab === item.id
                ? "border-amber-500 bg-amber-500/20 text-amber-100"
                : "border-border bg-surface text-muted")
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice ? (
        <p role="status" className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      ) : null}

      {tab === "arsenal" ? (
        <section aria-label="Arsenal" className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted">{arsenal.length} arma(s) no Arsenal</p>
            <select
              aria-label="Filtrar por raridade"
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value as "Todas" | RarityGrade)}
              className="min-h-9 rounded-md border border-border bg-surface px-2 text-xs text-fg"
            >
              {["Todas", "Comum", "Incomum", "Rara", "Épica", "Lendária", "Relíquia"].map((rarity) => (
                <option key={rarity} value={rarity}>{rarity}</option>
              ))}
            </select>
          </div>

          {arsenal.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center">
              <Hammer size={30} className="mx-auto text-amber-700" />
              <p className="mt-2 font-display text-sm text-amber-100">Nenhuma lâmina aqui ainda.</p>
              <Button size="sm" className="mt-3 bg-amber-600 font-display text-xs font-bold text-stone-950" onClick={onGoForge}>
                Forjar a primeira
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {arsenal.map((sword) => {
                const broken = sword.broken || sword.structuralState === "broken";
                const stats = statsOf(sword);
                return (
                  <button
                    key={sword.id}
                    type="button"
                    onClick={() => {
                      setNotice(null);
                      setInspectId(sword.id);
                    }}
                    className="overflow-hidden rounded-xl border border-border bg-surface text-left hover:border-amber-600/70"
                  >
                    <div className="relative h-28 bg-[radial-gradient(ellipse_at_50%_45%,#242a33,#0d1015)]">
                      <WeaponPreview sword={sword} />
                      <span className="absolute top-1.5 left-1.5"><RarityChip rarity={sword.rarity} /></span>
                      {sword.favorite ? (
                        <span className="absolute top-1.5 right-1.5 rounded bg-amber-500/20 p-1 text-amber-300" title="Protegida">
                          <ShieldCheck size={13} />
                        </span>
                      ) : null}
                      {broken ? (
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-red-950/80 px-1.5 py-0.5 text-[0.58rem] font-bold text-red-200">
                          Fragmentos
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1 p-2">
                      <h3 className="truncate font-display text-xs font-bold text-amber-50">{sword.design.name || "Sem nome"}</h3>
                      <p className="text-[0.6rem] text-muted">Q{sword.quality} · {gradeFor(sword.quality)}</p>
                      <p className="text-[0.6rem] tabular-nums text-[#d8c8ab]">
                        ⚔ {stats.atk} · 🛡 {stats.def} · 🌀 {stats.agi} · 🔨 {stats.dur}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {tab === "compendio" ? (
        <section aria-label="Compêndio" className="space-y-2">
          {CANONICAL_PRESETS.map((preset) => {
            const status = evaluateBlueprintStatus(preset, inventory, career, swords);
            const material = getRequiredMaterialForSteel(preset.design.steel);
            return (
              <article key={preset.id} className="rounded-lg border border-border bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-sm font-bold text-amber-50">{preset.name}</h3>
                    <p className="text-[0.65rem] text-muted">
                      {STEELS[preset.design.steel]?.name} · {PROFILES[preset.design.profile]?.name}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 rounded border px-1.5 py-0.5 text-[0.58rem] font-bold uppercase " +
                      (status.state === "locked"
                        ? "border-red-700/60 bg-red-950/40 text-red-200"
                        : status.state === "mastered"
                          ? "border-amber-600 bg-amber-950/50 text-amber-200"
                          : "border-emerald-700/60 bg-emerald-950/40 text-emerald-200")
                    }
                  >
                    {status.isMastered ? "Dominada" : status.isCrafted ? "Fabricada" : status.state === "locked" ? "Bloqueada" : status.hasMaterial ? "Pronta" : "Falta metal"}
                  </span>
                </div>
                <p className="mt-1.5 text-[0.68rem] leading-relaxed text-[#cdbb9d]">{status.requirementText}</p>
                <p className="mt-1 text-[0.62rem] text-muted">
                  {material.icon} {material.name}: {getMaterialStock(inventory.materials, material.key)} em estoque
                </p>
              </article>
            );
          })}
        </section>
      ) : null}

      {tab === "componentes" ? (
        <section aria-label="Componentes" className="space-y-3">
          {(["guard", "wrap", "pommel", "rune"] as const).map((category) => {
            const items = components.filter((c) => c.category === category);
            return (
              <div key={category}>
                <h3 className="mb-1.5 font-display text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                  {category === "guard" ? "Guardas" : category === "wrap" ? "Cabos" : category === "pommel" ? "Pomos" : "Runas"} · {items.length}
                </h3>
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[0.68rem] text-muted">
                    Nenhuma peça solta. Compre na Loja ou funda quatro no Craft.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-surface p-2.5">
                        <span aria-hidden className="text-xl">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-xs font-bold text-amber-50">{item.name}</p>
                          <p className="text-[0.6rem] text-muted">
                            {item.rarity} · {["damageBonus", "defenseBonus", "agilityBonus", "durabilityBonus"]
                              .filter((key) => (item.statModifier as Record<string, number | undefined>)?.[key])
                              .map((key) => `${key.replace("Bonus", "").toUpperCase()} +${(item.statModifier as Record<string, number>)[key]}`)
                              .join(" · ") || "Sem bônus"}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="shrink-0 text-[0.68rem]"
                          onClick={() => setInstallComponentId(item.id)}
                        >
                          <Wrench size={13} /> Instalar
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <Button variant="secondary" className="w-full text-xs" onClick={onGoShop}>
            Comprar peças na Loja
          </Button>
        </section>
      ) : null}

      {tab === "runas" ? (
        <section aria-label="Runas" className="space-y-2">
          {RUNES_COMPENDIUM.map((rune) => {
            const owned = (inventory.components || []).filter(
              (c) => c.category === "rune" && c.componentKey.includes(rune.symbol),
            );
            return (
              <article key={rune.name} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface p-2.5">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border border-amber-800/60 bg-black/30 text-lg text-amber-300">
                  {rune.symbol}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xs font-bold text-amber-50">{rune.name}</h3>
                  <p className="text-[0.62rem] text-muted">{rune.school} · {rune.rarity}</p>
                  <p className="mt-0.5 text-[0.68rem] leading-snug text-[#cdbb9d]">{rune.effect}</p>
                  <p className="mt-0.5 text-[0.6rem] text-muted">Peças soltas: {owned.length}</p>
                </div>
              </article>
            );
          })}
          <Button variant="secondary" className="w-full text-xs" onClick={() => setTab("componentes")}>
            Instalar uma runa numa espada
          </Button>
        </section>
      ) : null}

      {tab === "nucleos" ? (
        <section aria-label="Núcleos de fusão" className="space-y-2">
          {cores.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface/60 p-6 text-center">
              <FlaskConical size={30} className="mx-auto text-amber-700" />
              <p className="mt-2 font-display text-sm text-amber-100">Nenhum núcleo guardado.</p>
              <p className="mt-1 text-[0.68rem] text-muted">Funda quatro espadas da mesma raridade no Craft.</p>
              <Button size="sm" variant="secondary" className="mt-3 text-xs" onClick={() => setTab("arsenal")}>
                Ver Arsenal
              </Button>
            </div>
          ) : (
            cores.map((core) => (
              <article key={core.id} className="rounded-xl border border-amber-700/50 bg-[#1d1710] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <RarityChip rarity={core.rarity} />
                    <h3 className="mt-1 font-display text-sm font-bold text-amber-50">{core.name}</h3>
                  </div>
                  <span className="shrink-0 rounded border border-amber-700/60 bg-black/30 px-1.5 py-0.5 text-[0.6rem] text-amber-300">
                    +{core.bonusQuality}% Q
                  </span>
                </div>
                <p className="mt-1 text-[0.68rem] text-[#d8c8ab]">{heritageHeadline(core)}</p>
                <div className="mt-1.5 grid grid-cols-4 gap-1 text-center text-[0.6rem]">
                  {[
                    ["ATK", core.heritage?.attackBias],
                    ["DEF", core.heritage?.defenseBias],
                    ["AGI", core.heritage?.agilityBias],
                    ["DUR", core.heritage?.durabilityBias],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded border border-border/70 bg-black/25 py-1">
                      <p className="text-muted">{label}</p>
                      <p className="font-display text-xs font-bold text-amber-200">{signed(Number(value || 0))}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-1.5 text-[0.62rem] leading-snug text-muted">
                  {core.inheritedPerks.length > 0 ? core.inheritedPerks.join(" · ") : "Sem traço especial herdado."}
                  {" "}· Origem: {core.consumedSwordIds.length} doadoras consumidas.
                </p>
                <p className="mt-1 text-[0.6rem] text-amber-400/80">Ainda precisa ser forjado na bigorna.</p>
                <Button
                  size="sm"
                  className="mt-2 w-full bg-amber-600 font-display text-xs font-bold text-stone-950"
                  onClick={() => onPrepareCore(core)}
                >
                  <Hammer size={14} /> Preparar na Forja
                </Button>
              </article>
            ))
          )}
        </section>
      ) : null}

      {tab === "comparar" ? (
        <section aria-label="Comparação de espadas" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[0, 1].map((slot) => (
              <label key={slot} className="text-[0.62rem] uppercase tracking-wider text-muted">
                Espada {slot + 1}
                <select
                  aria-label={`Escolher espada ${slot + 1} para comparar`}
                  value={compareIds[slot] || ""}
                  onChange={(event) => {
                    const next: [string | null, string | null] = [...compareIds];
                    next[slot] = event.target.value || null;
                    setCompareIds(next);
                  }}
                  className="mt-1 min-h-10 w-full rounded-md border border-border bg-surface px-2 text-xs text-fg"
                >
                  <option value="">Selecionar…</option>
                  {swords.filter((s) => !s.isTraining).map((s) => (
                    <option key={s.id} value={s.id}>{s.design.name} (Q{s.quality})</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {compareA || compareB ? (
            <div className="grid grid-cols-2 gap-2">
              {[compareA, compareB].map((sword, index) => (
                <div key={index} className="overflow-hidden rounded-lg border border-border bg-surface">
                  {sword ? (
                    <>
                      <div className="h-28 bg-[radial-gradient(ellipse_at_50%_45%,#242a33,#0d1015)]">
                        <WeaponPreview sword={sword} />
                      </div>
                      <div className="space-y-1 p-2">
                        <RarityChip rarity={sword.rarity} />
                        <p className="truncate font-display text-xs font-bold text-amber-50">{sword.design.name}</p>
                        <p className="text-[0.6rem] text-muted">Q{sword.quality} · {gradeFor(sword.quality)}</p>
                        <AttributeBar sword={sword} />
                      </div>
                    </>
                  ) : (
                    <div className="grid h-full min-h-40 place-items-center p-3 text-center text-[0.68rem] text-muted">
                      Escolha uma arma
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {compareA && compareB ? (
            <table className="w-full text-xs">
              <caption className="sr-only">Diferença de atributos</caption>
              <thead>
                <tr className="text-[0.6rem] uppercase tracking-wider text-muted">
                  <th className="py-1 text-left">Atributo</th>
                  <th className="py-1 text-right">A</th>
                  <th className="py-1 text-right">B</th>
                  <th className="py-1 text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {(["atk", "def", "agi", "dur"] as const).map((key) => {
                  const a = statsOf(compareA)[key];
                  const b = statsOf(compareB)[key];
                  const delta = b - a;
                  return (
                    <tr key={key} className="border-t border-border/60">
                      <td className="py-1 uppercase text-muted">{key}</td>
                      <td className="py-1 text-right tabular-nums">{a}</td>
                      <td className="py-1 text-right tabular-nums">{b}</td>
                      <td className={"py-1 text-right font-bold tabular-nums " + (delta > 0 ? "text-emerald-300" : delta < 0 ? "text-red-300" : "text-muted")}>
                        {delta > 0 ? `+${delta}` : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : null}
        </section>
      ) : null}

      {/* Inspeção detalhada */}
      <Sheet
        open={inspected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setInspectId(null);
            setPickerCategory(null);
            setNotice(null);
          }
        }}
        eyebrow="Inspeção"
        title={inspected?.design.name || ""}
        description={inspected ? `${inspected.rarity || "Comum"} · Qualidade ${inspected.quality} · ${gradeFor(inspected.quality)}` : undefined}
      >
        {inspected ? (
          <div className="space-y-3">
            <div className="h-52 rounded-xl border border-border bg-[radial-gradient(ellipse_at_50%_45%,#242a33,#0d1015)]">
              <WeaponPreview sword={inspected} />
            </div>

            <AttributeBar sword={inspected} />

            <div className="flex flex-wrap gap-1.5 text-[0.62rem]">
              <span className="rounded border border-border bg-black/25 px-1.5 py-1 text-muted">
                Estado: {inspected.broken || inspected.structuralState === "broken" ? "Fragmentos" : inspected.structuralState || "estável"}
              </span>
              <span className="rounded border border-border bg-black/25 px-1.5 py-1 text-muted">
                Durabilidade: {statsOf(inspected).dur}%
              </span>
              {inspected.upgradesApplied ? (
                <span className="rounded border border-border bg-black/25 px-1.5 py-1 text-muted">
                  Refinos: {inspected.upgradesApplied}/3
                </span>
              ) : null}
            </div>

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-border bg-surface p-3 text-[0.68rem]">
              {[
                ["Família", FAMILIES[inspected.design.family || "royal"]?.name],
                ["Perfil", PROFILES[inspected.design.profile]?.name],
                ["Material", STEELS[inspected.design.steel]?.name],
                ["Guarda", GUARDS[inspected.design.guard]?.name],
                ["Cabo", WRAPS[inspected.design.wrap]?.name],
                ["Pomo", POMMELS[inspected.design.pommel]?.name],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-[0.58rem] uppercase tracking-wider text-muted">{label}</dt>
                  <dd className="text-[#e8dcc4]">{value || "—"}</dd>
                </div>
              ))}
            </dl>

            {inspected.design.inscription ? (
              <p className="rounded-lg border border-border bg-black/25 px-3 py-2 text-xs italic text-[#cdbb9d]">
                “{inspected.design.inscription}”
              </p>
            ) : null}

            <section>
              <h3 className="mb-1.5 flex items-center gap-1.5 font-display text-[0.62rem] uppercase tracking-[0.18em] text-muted">
                <Wrench size={12} /> Montagem
              </h3>
              <div className="space-y-1.5">
                {(["guard", "wrap", "pommel", "rune"] as const).map((category) => {
                  const installed = inspected.installedComponents?.[category];
                  return (
                    <div key={category} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="text-[0.58rem] uppercase tracking-wider text-muted">
                          {category === "guard" ? "Guarda" : category === "wrap" ? "Cabo" : category === "pommel" ? "Pomo" : "Runa"}
                        </p>
                        <p className="truncate text-[0.7rem] text-[#e8dcc4]">
                          {installed ? installed.name : "Peça de forja padrão"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 text-[0.65rem]"
                        disabled={inspected.broken}
                        onClick={() => openComponentPicker(category)}
                      >
                        {installed ? "Trocar" : "Instalar"}
                      </Button>
                    </div>
                  );
                })}
              </div>
              {pickerCategory ? (
                <div className="mt-2 rounded-lg border border-amber-700/50 bg-[#231a10] p-2.5">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-wider text-amber-300">
                    Peças disponíveis
                  </p>
                  {components.filter((c) => c.category === pickerCategory).length === 0 ? (
                    <div className="mt-1.5">
                      <p className="text-[0.68rem] text-muted">Nenhuma peça solta desta categoria no inventário.</p>
                      <Button size="sm" variant="secondary" className="mt-2 w-full text-xs" onClick={onGoShop}>
                        Comprar na Loja
                      </Button>
                    </div>
                  ) : (
                    <ul className="mt-1.5 space-y-1">
                      {components
                        .filter((c) => c.category === pickerCategory)
                        .map((item) => (
                          <li key={item.id}>
                            <button
                              type="button"
                              onClick={() => installComponent(inspected.id, item.id)}
                              className="flex w-full items-center justify-between gap-2 rounded border border-border bg-black/25 px-2 py-1.5 text-left text-[0.68rem] hover:border-amber-600/70"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-[#e8dcc4]">{item.name}</span>
                                <span className="block text-[0.6rem] text-muted">{item.rarity}</span>
                              </span>
                              <ArrowRight size={14} className="shrink-0 text-amber-300" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </section>

            {inspected.fusionHistory ? (
              <section className="rounded-lg border border-violet-700/40 bg-violet-950/20 p-2.5">
                <h3 className="flex items-center gap-1.5 font-display text-[0.62rem] uppercase tracking-[0.18em] text-violet-300">
                  <Sparkles size={12} /> Histórico de fusão
                </h3>
                <p className="mt-1 text-[0.68rem] text-[#e2d2b4]">{inspected.fusionHistory.coreName}</p>
                <p className="text-[0.62rem] text-muted">
                  {inspected.fusionHistory.parentIds.length} doadoras ·{" "}
                  {new Date(inspected.fusionHistory.date).toLocaleDateString("pt-BR")}
                </p>
                <p className="mt-0.5 text-[0.62rem] text-violet-200/80">
                  {inspected.fusionHistory.inheritedPerks.join(" · ") || "Sem traço herdado"}
                </p>
              </section>
            ) : null}

            {inspected.perks && inspected.perks.length > 0 ? (
              <section>
                <h3 className="mb-1 font-display text-[0.62rem] uppercase tracking-[0.18em] text-muted">Propriedades</h3>
                <ul className="flex flex-wrap gap-1">
                  {inspected.perks.map((perk) => (
                    <li key={perk} className="rounded border border-border bg-black/25 px-1.5 py-0.5 text-[0.62rem] text-[#d8c8ab]">
                      {perk}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="text-[0.6rem] leading-relaxed text-muted">
              Origem: forjada em {new Date(inspected.createdAt).toLocaleDateString("pt-BR")}
              {inspected.forgeRunId ? ` · run ${inspected.forgeRunId.slice(-8)}` : ""}.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="text-xs"
                onClick={() => {
                  const ok = onToggleFavorite(inspected.id);
                  if (ok) setNotice(inspected.favorite ? "Proteção removida." : "Espada protegida contra fusão.");
                }}
              >
                <ShieldCheck size={14} /> {inspected.favorite ? "Desproteger" : "Proteger"}
              </Button>
              <Button
                variant="secondary"
                className="text-xs"
                disabled={
                  inspected.broken ||
                  (inspected.upgradesApplied || 0) >= 3 ||
                  wallet.gold < 60 * ((inspected.upgradesApplied || 0) + 1) ||
                  wallet.rubies < ((inspected.upgradesApplied || 0) >= 1 ? 1 : 0)
                }
                onClick={() => {
                  const ok = onUpgrade(inspected);
                  if (ok) setNotice("Lâmina refinada na bancada.");
                }}
              >
                <Star size={14} /> Refinar
              </Button>
            </div>
          </div>
        ) : null}
      </Sheet>

      {/* Escolha de espada para instalar componente avulso */}
      <Sheet
        open={installComponentId !== null}
        onOpenChange={(open) => !open && setInstallComponentId(null)}
        eyebrow="Bancada"
        title="Instalar em qual espada?"
        description="Só lâminas íntegras aceitam montagem. A troca devolve a peça anterior ao inventário."
      >
        <ul className="space-y-1.5">
          {swords.filter((s) => !s.isTraining && !s.broken && s.structuralState !== "broken").length === 0 ? (
            <li className="rounded-lg border border-dashed border-border p-3 text-xs text-muted">
              Nenhuma lâmina íntegra disponível.
            </li>
          ) : (
            swords
              .filter((s) => !s.isTraining && !s.broken && s.structuralState !== "broken")
              .map((sword) => (
                <li key={sword.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!installComponentId) return;
                      installComponent(sword.id, installComponentId);
                      setInstallComponentId(null);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-left text-xs hover:border-amber-600/70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display font-bold text-amber-50">{sword.design.name}</span>
                      <span className="block text-[0.62rem] text-muted">{sword.rarity} · Q{sword.quality}</span>
                    </span>
                    <ArrowRight size={15} className="shrink-0 text-amber-300" />
                  </button>
                </li>
              ))
          )}
        </ul>
      </Sheet>
    </main>
  );
}

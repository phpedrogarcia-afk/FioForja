import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CANONICAL_PRESETS,
  FAMILIES,
  GUARDS,
  POMMELS,
  RUNES_COMPENDIUM,
  STEELS,
  WORKSHOP_EQUIPMENT,
  WRAPS,
} from "../catalog";
import { drawFinishedSword } from "../swordDraw";
import type { CareerStats, FinishedSword, PlayerInventory, PlayerWallet, RarityGrade, SwordDesign } from "../types";
import { RevealScreen } from "./RevealScreen";
import { RewardsScreen } from "./RewardsScreen";
import { generateForgeRewards } from "../sim";
import { defaultInventory, defaultWallet } from "../save";

interface Props {
  swords: FinishedSword[];
  onBack: () => void;
  onForge: () => void;
  wallet?: PlayerWallet;
  inventory?: PlayerInventory;
  career?: CareerStats;
  onBuyTool?: (toolId: string) => boolean;
  onSelectPreset?: (design: SwordDesign) => void;
}

type GalleryTab = "arsenal" | "compendio" | "componentes" | "runas" | "oficina" | "legado";

export function GalleryScreen({
  swords,
  onBack,
  onForge,
  wallet = defaultWallet,
  inventory = defaultInventory,
  career,
  onBuyTool,
  onSelectPreset,
}: Props) {
  const [currentTab, setCurrentTab] = useState<GalleryTab>("arsenal");
  const [selectedSword, setSelectedSword] = useState<FinishedSword | null>(null);
  const [inspectRewards, setInspectRewards] = useState(false);
  const [filterRarity, setFilterRarity] = useState<string>("Todas");
  const [filterFamily, setFilterFamily] = useState<string>("Todas");

  if (selectedSword) {
    if (inspectRewards) {
      return (
        <RewardsScreen
          sword={selectedSword}
          rewards={generateForgeRewards(selectedSword)}
          onClaim={() => setInspectRewards(false)}
          onGallery={() => {
            setInspectRewards(false);
            setSelectedSword(null);
          }}
          onAgain={onForge}
        />
      );
    }
    return (
      <RevealScreen
        sword={selectedSword}
        onClaimRewards={() => setInspectRewards(true)}
        onAgain={onForge}
        onGallery={() => setSelectedSword(null)}
        onTitle={onBack}
      />
    );
  }

  // Filtered Arsenal
  const filteredSwords = swords.filter((s) => {
    const matchRarity = filterRarity === "Todas" || (s.rarity || "Comum") === filterRarity;
    const matchFamily = filterFamily === "Todas" || (s.design.family || "royal") === filterFamily;
    return matchRarity && matchFamily;
  });

  // Calculate career statistics for Legado
  const totalForged = swords.length;
  const masterpieces = swords.filter((s) => s.quality >= 95).length;
  const legendaries = swords.filter((s) => s.rarity === "Lendária" || s.quality >= 95).length;
  const relics = swords.filter((s) => s.rarity === "Relíquia").length;
  const brokenBlades = swords.filter((s) => s.structuralState === "broken" || s.quality <= 15).length;
  const highestQuality = swords.length > 0 ? Math.max(...swords.map((s) => s.quality)) : 0;

  // Material masteries
  const steelCounts: Record<string, number> = {};
  swords.forEach((s) => {
    steelCounts[s.design.steel] = (steelCounts[s.design.steel] || 0) + 1;
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[#070a10] px-3 pb-16 pt-[max(0.75rem,env(safe-area-inset-top))] text-fg sm:px-6">
      {/* Top Header */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between border-b border-[#1e293b] pb-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Menu Principal
        </Button>
        <div className="text-center">
          <h1 className="font-display text-base font-bold uppercase tracking-[0.22em] text-amber-200">
            A Grande Galeria
          </h1>
          <p className="text-[0.7rem] uppercase tracking-wider text-slate-400">
            Arsenal · Compêndio · Coleção · Legado
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 rounded-lg border border-amber-900/40 bg-black/50 px-3 py-1 font-display text-xs">
            <span className="text-amber-300 font-bold">🪙 {wallet.gold.toLocaleString()}</span>
            <span className="text-red-400 font-bold">💎 {wallet.rubies}</span>
            <span className="text-cyan-400 font-bold">🔷 {wallet.diamonds}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onForge}>
            + Forjar Nova
          </Button>
        </div>
      </header>

      {/* 6-Pillar Tab Navigation Bar */}
      <nav className="mx-auto mt-4 flex w-full max-w-5xl flex-wrap justify-center gap-1.5 border-b border-[#1b2434] pb-3 sm:justify-start">
        {[
          { id: "arsenal" as const, label: "Arsenal", count: swords.length, icon: "⚔️" },
          { id: "compendio" as const, label: "Compêndio", count: `${CANONICAL_PRESETS.length} Obras`, icon: "📜" },
          { id: "componentes" as const, label: "Componentes", count: "32", icon: "🛡️" },
          { id: "runas" as const, label: "Runas", count: RUNES_COMPENDIUM.length, icon: "ᚠ" },
          { id: "oficina" as const, label: "Oficina", count: WORKSHOP_EQUIPMENT.length, icon: "⚒️" },
          { id: "legado" as const, label: "Legado", count: `${masterpieces} Obra(s)`, icon: "🏆" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-display tracking-wider transition-all ${
              currentTab === tab.id
                ? "border border-amber-500 bg-amber-500/20 text-amber-200 font-bold shadow-md shadow-amber-950/30"
                : "border border-border/70 bg-[#0d1320] text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            <span className="rounded-full bg-black/40 px-1.5 py-0.2 text-[0.62rem] text-slate-400">
              {tab.count}
            </span>
          </button>
        ))}
      </nav>

      {/* PILLAR 1: ARSENAL */}
      {currentTab === "arsenal" && (
        <div className="mx-auto mt-4 w-full max-w-5xl">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#1b263b] bg-[#0c121e] p-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-display text-[0.7rem] uppercase tracking-wider text-slate-400 mr-1">Raridade:</span>
              {["Todas", "Relíquia", "Lendária", "Épica", "Rara", "Incomum", "Comum"].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRarity(r)}
                  className={`rounded px-2 py-0.5 text-xs font-display transition-colors ${
                    filterRarity === r
                      ? "bg-amber-500 text-black font-bold"
                      : "bg-[#141c2c] text-slate-400 hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="font-display text-[0.7rem] uppercase tracking-wider text-slate-400">Família:</span>
              <select
                value={filterFamily}
                onChange={(e) => setFilterFamily(e.target.value)}
                className="rounded border border-border bg-[#141c2c] px-2 py-1 text-xs text-slate-200 focus:outline-hidden"
              >
                <option value="Todas">Todas as Famílias</option>
                {Object.entries(FAMILIES).map(([id, fam]) => (
                  <option key={id} value={id}>
                    {fam.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Swords Grid */}
          {swords.length === 0 ? (
            <div className="mx-auto mt-20 max-w-md text-center text-muted">
              <p className="text-base text-slate-300">Nenhuma lâmina forjada ainda.</p>
              <p className="mt-2 text-xs text-slate-500">
                O fogo da forna e a bigorna esperam pelo seu primeiro projeto de maestria.
              </p>
              <Button className="mt-6" size="lg" onClick={onForge}>
                Iniciar Primeira Forja
              </Button>
            </div>
          ) : filteredSwords.length === 0 ? (
            <div className="mt-16 text-center text-slate-400">
              <p>Nenhuma espada encontrada com os filtros selecionados.</p>
            </div>
          ) : (
            <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {filteredSwords.map((s) => {
                const rarity = s.rarity || "Comum";
                const isBroken = s.structuralState === "broken" || s.quality <= 15;
                const rarityStyles: Record<RarityGrade, string> = {
                  Relíquia: "border-rose-500/70 bg-rose-950/25 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
                  Lendária: "border-amber-500/70 bg-amber-950/25 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
                  Épica: "border-purple-500/70 bg-purple-950/25 text-purple-300",
                  Rara: "border-blue-500/70 bg-blue-950/25 text-blue-300",
                  Incomum: "border-emerald-500/70 bg-emerald-950/25 text-emerald-300",
                  Comum: "border-slate-700 bg-slate-900/40 text-slate-400",
                };

                return (
                  <li
                    key={s.id}
                    onClick={() => setSelectedSword(s)}
                    className="group cursor-pointer overflow-hidden rounded-xl border border-[#202c40] bg-[#0b101a] shadow-lg transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/80 hover:shadow-[0_10px_35px_rgba(0,0,0,0.85)]"
                  >
                    <Thumb sword={s} />
                    <div className="p-3.5">
                      <div className="flex items-center justify-between">
                        <span className={`rounded-sm border px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider ${rarityStyles[rarity] || rarityStyles.Comum}`}>
                          {rarity}
                        </span>
                        <span className="font-display text-xs text-slate-300 tabular-nums">
                          Q: {s.quality} · {s.grade}
                        </span>
                      </div>
                      <h3 className="mt-2 font-display text-base font-semibold text-fg group-hover:text-amber-200">
                        {s.design.name || "Lâmina Sem Nome"}
                      </h3>

                      {/* Metallurgy Attributes Mini-Bar */}
                      <div className="mt-2.5 flex items-center justify-between rounded bg-[#131b2c] px-2 py-1 text-[0.7rem] text-slate-300">
                        <span>ATK: {s.damage ?? "--"}</span>
                        <span>DEF: {s.defense ?? "--"}</span>
                        <span>AGI: {s.agility ?? "--"}</span>
                        <span>DUR: {s.durability ?? "--"}%</span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span className="text-[0.68rem] text-slate-400">
                          {isBroken ? "💥 Fratura Estrutural" : FAMILIES[s.design.family || "royal"]?.name || "Aço Nobre"}
                        </span>
                        <span className="text-[0.7rem] font-display text-amber-400/90 group-hover:translate-x-0.5 transition-transform">
                          Mesa de Inspeção →
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* PILLAR 2: COMPÊNDIO */}
      {currentTab === "compendio" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Families Overview */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              As 9 Famílias Canônicas do FioForja
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Cada linhagem possui sua própria silhueta, resposta metalúrgica, runas e história de maestria.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {Object.entries(FAMILIES).map(([id, fam]) => {
                const count = swords.filter((s) => (s.design.family || "royal") === id).length;
                return (
                  <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs font-bold" style={{ color: fam.badgeColor }}>
                        {fam.name}
                      </span>
                      <span className="text-[0.65rem] text-slate-400">Forjadas: {count}</span>
                    </div>
                    <p className="mt-1 text-[0.72rem] text-slate-300 leading-snug">{fam.fantasy}</p>
                    <p className="mt-1 text-[0.65rem] text-slate-500 italic">{fam.naturalRarity}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Canonical Masterpieces (Signed Legendaries & Relics) */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Obras-Primas e Relíquias Assinadas
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Lendárias e Relíquias únicas da mitologia do jogo. Conquiste-as forjando cada projeto com maestria.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {CANONICAL_PRESETS.map((preset) => {
                const matchingSword = swords.find((s) => s.design.name === preset.name);
                const discovered = !!matchingSword;

                return (
                  <div
                    key={preset.id}
                    className={`overflow-hidden rounded-xl border transition-all ${
                      discovered
                        ? "border-amber-500/80 bg-[#0f1524] shadow-md shadow-amber-950/20"
                        : "border-[#1e283b] bg-[#090d16] opacity-85"
                    }`}
                  >
                    <div className="relative">
                      {discovered && matchingSword ? (
                        <Thumb sword={matchingSword} />
                      ) : (
                        <div className="flex h-44 w-full flex-col items-center justify-center bg-[#070b14] text-slate-600">
                          <span className="text-4xl opacity-20">🗡️</span>
                          <span className="mt-2 font-display text-xs uppercase tracking-widest text-slate-500">
                            Silhueta Oculta
                          </span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 rounded-sm bg-black/70 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-amber-400">
                        {preset.rarity}
                      </div>
                    </div>

                    <div className="p-3.5">
                      <h3 className="font-display text-base font-bold text-fg">
                        {discovered ? preset.name : "???"}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 italic">
                        "{preset.lore}"
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-[#1a2335] pt-2 text-[0.7rem] text-slate-400">
                        <span>Família: {FAMILIES[preset.family]?.name}</span>
                        {discovered ? (
                          <span className="text-emerald-400 font-semibold">✓ Conquistada</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (onSelectPreset) {
                                onSelectPreset(preset.design);
                              } else {
                                onForge();
                              }
                            }}
                            className="font-display text-amber-400 hover:underline"
                          >
                            Forjar Projeto →
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 3: COMPONENTES */}
      {currentTab === "componentes" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Cabos */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Cabos e Empunhaduras Desbloqueados
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {Object.entries(WRAPS).map(([id, w]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <div className="flex items-center gap-2">
                    <span className="size-4 rounded-full border border-black/40" style={{ backgroundColor: w.color }} />
                    <span className="font-display text-xs font-semibold text-fg">{w.name}</span>
                  </div>
                  <p className="mt-1.5 text-[0.72rem] text-slate-400">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guardas */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Guardas e Quilhões
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {Object.entries(GUARDS).map(([id, g]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <span className="font-display text-xs font-semibold text-amber-200">{g.name}</span>
                  <p className="mt-1.5 text-[0.72rem] text-slate-400">{g.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pomos */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Pomos de Contrapeso
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              {Object.entries(POMMELS).map(([id, p]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <span className="font-display text-xs font-semibold text-slate-200">{p.name}</span>
                  <p className="mt-1.5 text-[0.72rem] text-slate-400">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Metais */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
              Ligas e Metais Metalúrgicos
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Object.entries(STEELS).map(([id, s]) => (
                <div key={id} className="rounded-lg border border-[#1b2536] bg-[#0a0f18] p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs font-bold text-amber-100">{s.name}</span>
                    <span className="text-[0.65rem] text-slate-400">Dureza: {Math.round(s.hardness * 100)}%</span>
                  </div>
                  <p className="mt-1 text-[0.72rem] text-slate-300">{s.blurb}</p>
                  <div className="mt-2 text-[0.65rem] text-slate-500">
                    Faixa Térmica: {Math.round(s.heatMin * 100)}% – {Math.round(s.heatMax * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 4: RUNAS */}
      {currentTab === "runas" && (
        <div className="mx-auto mt-4 w-full max-w-5xl">
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-cyan-300">
              Coleção de Runas Primordiais (Elder Futhark)
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Inscrições sagradas que vibram quando o ferro atinge ressonância na bigorna e despertam ao término da têmpera.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {RUNES_COMPENDIUM.map((rune) => (
                <div
                  key={rune.symbol}
                  className="rounded-lg border border-[#1c273a] bg-[#0a0f19] p-3.5 transition-all hover:border-cyan-500/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 items-center justify-center rounded-md bg-cyan-950/40 font-display text-xl text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                        {rune.symbol}
                      </span>
                      <div>
                        <h3 className="font-display text-xs font-bold text-slate-200">{rune.name}</h3>
                        <span className="text-[0.65rem] font-semibold text-cyan-400">Escola: {rune.school}</span>
                      </div>
                    </div>
                    <span className="rounded bg-[#141b2b] px-1.5 py-0.5 text-[0.6rem] font-bold uppercase text-amber-300">
                      {rune.rarity}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs text-slate-300 font-medium leading-relaxed">
                    ⚡ {rune.effect}
                  </p>
                  <p className="mt-1.5 text-[0.7rem] text-slate-500 italic">
                    "{rune.lore}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 5: OFICINA */}
      {currentTab === "oficina" && (
        <div className="mx-auto mt-4 w-full max-w-5xl">
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300">
                  Equipamentos da Ferraria Medieval
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Ferramentas de forja adquiridas com ouro e gemas que alteram diretamente a cinética do martelo, rebote da bigorna e velocidade do fogo.
                </p>
              </div>
              <div className="flex items-center gap-3 self-start rounded border border-amber-500/30 bg-black/60 px-3 py-1 text-xs font-display sm:self-auto">
                <span className="font-bold text-amber-300">🪙 {wallet.gold.toLocaleString()}</span>
                <span className="font-bold text-red-400">💎 {wallet.rubies}</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3">
              {WORKSHOP_EQUIPMENT.map((tool) => {
                const isUnlocked = tool.unlockedByDefault || inventory.unlockedTools.includes(tool.id);
                const canAfford = wallet.gold >= tool.costGold && wallet.rubies >= tool.costRubies;

                return (
                  <div
                    key={tool.id}
                    className="flex flex-col justify-between rounded-lg border border-[#1b263b] bg-[#0a0f18] p-3.5 transition-all hover:border-amber-500/50"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{tool.icon}</span>
                          <div>
                            <h3 className="font-display text-xs font-bold text-slate-200">{tool.name}</h3>
                            <span className="text-[0.65rem] capitalize text-slate-400">{tool.category}</span>
                          </div>
                        </div>
                        <span className="rounded bg-[#141b2a] px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-300">
                          {tool.rarity}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-amber-200">{tool.stats}</p>
                      <p className="mt-1.5 text-[0.72rem] text-slate-400">{tool.description}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-[#1b263b] pt-2.5 text-xs">
                      <span className="font-semibold text-amber-300">
                        {tool.costGold === 0 ? "Padrão da Oficina" : `${tool.costGold.toLocaleString()} 🪙 ${tool.costRubies ? `+ ${tool.costRubies} 💎` : ""}`}
                      </span>
                      {isUnlocked ? (
                        <span className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[0.7rem] font-bold text-emerald-400">
                          ✓ Adquirido
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          disabled={!canAfford}
                          onClick={() => onBuyTool?.(tool.id)}
                          className="bg-amber-600 text-xs font-bold text-stone-950 hover:bg-amber-500 disabled:opacity-50"
                        >
                          Adquirir
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PILLAR 6: LEGADO */}
      {currentTab === "legado" && (
        <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
          {/* Blacksmith Career Dashboard */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wider text-amber-300">
              Carreira do Mestre Ferreiro
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              O registro histórico de cada golpe, vitória e aprendizado conquistado diante da bigorna.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              <StatCard label="Espadas Forjadas" value={totalForged} />
              <StatCard label="Obras-Primas (Q≥95)" value={masterpieces} color="#10b981" />
              <StatCard label="Lendárias" value={legendaries} color="#f59e0b" />
              <StatCard label="Relíquias" value={relics} color="#f43f5e" />
              <StatCard label="Maior Qualidade" value={`${highestQuality}/100`} color="#38bdf8" />
              <StatCard label="Lâminas Quebradas" value={brokenBlades} color="#ef4444" />
            </div>
          </div>

          {/* Material Masteries */}
          <div className="rounded-xl border border-[#1e2a3e] bg-[#0d1320] p-5">
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-slate-200">
              Domínio Metalúrgico por Material
            </h3>
            <div className="mt-3 space-y-3">
              {[
                { id: "iron", name: "Ferro do Ferreiro", goal: 5 },
                { id: "steel", name: "Aço Nobre do Reino", goal: 10 },
                { id: "damascus", name: "Aço de Damasco", goal: 15 },
                { id: "blacksteel", name: "Aço Negro", goal: 15 },
                { id: "elven_silver", name: "Prata Élfica Sagrada", goal: 20 },
                { id: "meteor", name: "Meteorito Celestial", goal: 25 },
                { id: "ancient_alloy", name: "Liga Ancestral das Relíquias", goal: 30 },
              ].map((m) => {
                const count = steelCounts[m.id] || 0;
                const pct = Math.min(100, Math.round((count / m.goal) * 100));
                return (
                  <div key={m.id} className="rounded-lg border border-[#1a2334] bg-[#0a0f19] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-semibold text-slate-200">{m.name}</span>
                      <span className="text-slate-400">
                        {count} / {m.goal} lâminas ({pct}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#131b2c]">
                      <div
                        className="h-full bg-linear-to-r from-amber-600 to-amber-400 transition-[width] duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-lg border border-[#1b2536] bg-[#090d16] p-3 text-center">
      <p className="font-display text-[0.62rem] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 font-display text-xl font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}

function Thumb({ sword }: { sword: FinishedSword }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
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

    // Deep velvet texture gradient for thumbnail
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, "#131828");
    bg.addColorStop(1, "#090d18");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const isBroken = sword.structuralState === "broken" || sword.quality <= 15;
    drawFinishedSword(ctx, sword.design, w / 2, h * 0.58, Math.min(w, h) * 0.92, {
      assembled: !isBroken,
      quality: sword.quality,
      warp: sword.warp,
      cracks: sword.cracks ?? (isBroken ? 2 : 0),
      broken: isBroken,
    });
  }, [sword]);
  return <canvas ref={ref} className="h-44 w-full bg-[#0d1220]" />;
}

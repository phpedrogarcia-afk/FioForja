import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FinishedSword, FusionCore, InventoryComponent, PlayerInventory, PlayerWallet, RarityGrade } from "../types.ts";
import {
  fuseComponents,
  fuseSwords,
  getFusionOdds,
  RARITY_RANK_VALUES,
  RANK_VALUE_TO_RARITY,
  type ComponentFusionOutcome,
  type SwordFusionOutcome,
} from "../fusion.ts";
import { playFusionHum, playFusionSuccess } from "../audio.ts";

interface Props {
  swords: FinishedSword[];
  inventory: PlayerInventory;
  wallet: PlayerWallet;
  onApplyComponentFusion: (outcome: ComponentFusionOutcome) => void;
  onApplySwordFusion: (outcome: SwordFusionOutcome) => void;
  onForgeCore?: (core: FusionCore) => void;
}

type FusionMode = "swords" | "components";

export function FusionStationScreen({
  swords,
  inventory,
  wallet,
  onApplyComponentFusion,
  onApplySwordFusion,
  onForgeCore,
}: Props) {
  const [mode, setMode] = useState<FusionMode>("swords");
  const [selectedSwordIds, setSelectedSwordIds] = useState<string[]>([]);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [useCatalyst, setUseCatalyst] = useState(false);
  const [transmuting, setTransmuting] = useState(false);
  const [lastSwordResult, setLastSwordResult] = useState<SwordFusionOutcome | null>(null);
  const [lastCompResult, setLastCompResult] = useState<ComponentFusionOutcome | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Eligible swords for fusion: not broken
  const eligibleSwords = swords.filter((s) => !s.broken && s.structuralState !== "broken");
  const selectedSwords = eligibleSwords.filter((s) => selectedSwordIds.includes(s.id));

  // Eligible components for fusion
  const components = inventory.components || [];
  const selectedComponents = components.filter((c) => selectedComponentIds.includes(c.id));

  const toggleSelectSword = (id: string) => {
    setErrorMessage(null);
    if (selectedSwordIds.includes(id)) {
      setSelectedSwordIds(selectedSwordIds.filter((x) => x !== id));
    } else {
      if (selectedSwordIds.length >= 4) return;
      setSelectedSwordIds([...selectedSwordIds, id]);
    }
  };

  const toggleSelectComponent = (id: string) => {
    setErrorMessage(null);
    const item = components.find((c) => c.id === id);
    if (!item) return;

    if (selectedComponentIds.includes(id)) {
      setSelectedComponentIds(selectedComponentIds.filter((x) => x !== id));
    } else {
      if (selectedComponentIds.length >= 4) return;
      // Category check: must match first selected component
      if (selectedComponents.length > 0 && selectedComponents[0].category !== item.category) {
        setErrorMessage(`Selecione apenas componentes da categoria "${selectedComponents[0].category}".`);
        return;
      }
      setSelectedComponentIds([...selectedComponentIds, id]);
    }
  };

  const handleTransmuteSwords = () => {
    if (selectedSwords.length !== 4) return;
    setErrorMessage(null);
    setTransmuting(true);
    playFusionHum();

    setTimeout(() => {
      try {
        const outcome = fuseSwords(selectedSwords, { useCatalyst });
        if (wallet.gold < outcome.goldCost || wallet.rubies < outcome.rubiesCost) {
          setErrorMessage("Recursos insuficientes na carteira para pagar a transmutação.");
          setTransmuting(false);
          return;
        }

        onApplySwordFusion(outcome);
        playFusionSuccess();
        setLastSwordResult(outcome);
        setSelectedSwordIds([]);
      } catch (err: any) {
        setErrorMessage(err.message || "Falha na fusão.");
      } finally {
        setTransmuting(false);
      }
    }, 900);
  };

  const handleTransmuteComponents = () => {
    if (selectedComponents.length !== 4) return;
    setErrorMessage(null);
    setTransmuting(true);
    playFusionHum();

    setTimeout(() => {
      try {
        const outcome = fuseComponents(selectedComponents, { useCatalyst });
        if (wallet.gold < outcome.goldCost) {
          setErrorMessage("Ouro insuficiente na carteira para pagar a transmutação.");
          setTransmuting(false);
          return;
        }

        onApplyComponentFusion(outcome);
        playFusionSuccess();
        setLastCompResult(outcome);
        setSelectedComponentIds([]);
      } catch (err: any) {
        setErrorMessage(err.message || "Falha na fusão.");
      } finally {
        setTransmuting(false);
      }
    }, 850);
  };

  const catalystCount = inventory.materials?.catalyst_astral || 0;
  const hasCatalysts = catalystCount > 0;
  const fusionFragments = inventory.materials?.fusion_fragment || 0;

  // Calculate live base rarity and canonical fusion odds
  const rarities: RarityGrade[] = mode === "swords"
    ? selectedSwords.map((s) => s.rarity || "Comum")
    : selectedComponents.map((c) => c.rarity);
  const avgRarityRank = rarities.length === 4
    ? Math.round(rarities.reduce((acc, r) => acc + (RARITY_RANK_VALUES[r] || 1), 0) / 4)
    : 1;
  const baseRarity: RarityGrade = RANK_VALUE_TO_RARITY[avgRarityRank] || "Comum";
  const liveOdds = getFusionOdds(baseRarity, mode, useCatalyst && hasCatalysts);

  return (
    <div className="mx-auto mt-4 w-full max-w-5xl space-y-6">
      {/* Banner de Identidade do Crisol */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-amber-600/50 bg-linear-to-b from-stone-900 via-stone-950 to-black p-5 shadow-[0_0_40px_rgba(217,119,6,0.25)]">
        <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <span className="text-2xl">🔥</span>
              <h2 className="font-display text-lg font-bold tracking-wider text-amber-200 sm:text-xl">
                O CRISOL DE FUSÃO DO FERREIRO
              </h2>
            </div>
            <p className="mt-1 max-w-xl text-xs text-amber-300/80">
              {mode === "swords"
                ? "Combine 4 espadas para extrair um Núcleo de Fusão Superior. O núcleo exige forjamento manual na bigorna — o ferreiro forja o troféu!"
                : "Una 4 componentes do mesmo tipo para forjar um componente mestre com bônus físicos elevados."}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-900/60 bg-black/60 px-4 py-2 font-display text-xs">
            <span className="text-amber-400">🧩 Fragmentos: <strong>{fusionFragments}</strong></span>
            <span className="text-slate-500">|</span>
            <span className="text-purple-300">🔮 Catalisadores: <strong>{catalystCount}</strong></span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="mt-5 flex gap-2 border-t border-amber-900/40 pt-4">
          <button
            onClick={() => {
              setMode("swords");
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-semibold transition-all ${
              mode === "swords"
                ? "border border-amber-500 bg-amber-500/25 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "border border-stone-800 bg-stone-900/60 text-slate-400 hover:text-white"
            }`}
          >
            <span>⚔️ Fusão de Espadas (4x → Núcleo)</span>
          </button>
          <button
            onClick={() => {
              setMode("components");
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-display font-semibold transition-all ${
              mode === "components"
                ? "border border-amber-500 bg-amber-500/25 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                : "border border-stone-800 bg-stone-900/60 text-slate-400 hover:text-white"
            }`}
          >
            <span>🛡️ Fusão de Componentes (4x)</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-500/60 bg-red-950/40 px-4 py-2.5 text-center font-display text-xs text-red-200">
          ⚠️ {errorMessage}
        </div>
      )}

      {/* RESULT MODAL BANNER FOR SWORD FUSION */}
      {lastSwordResult && (
        <div className="relative rounded-xl border-2 border-amber-400 bg-linear-to-b from-stone-900 via-amber-950/40 to-stone-950 p-5 shadow-[0_0_35px_rgba(245,158,11,0.4)]">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <span className="font-display text-[0.68rem] uppercase tracking-widest text-amber-400">
                {lastSwordResult.tierJump === "exceptional"
                  ? "🌟 TRANSMUTAÇÃO EXCEPCIONAL (+2 NÍVEIS)!"
                  : lastSwordResult.tierJump === "superior"
                    ? "✨ TRANSMUTAÇÃO SUPERIOR (+1 NÍVEL)!"
                    : "⚡ NÚCLEO CONDENSADO (MESMO NÍVEL APRIMORADO)"}
              </span>
              <h3 className="mt-1 font-display text-lg font-bold text-amber-100">
                {lastSwordResult.resultCore.name}
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Raridade: <strong className="text-amber-300">{lastSwordResult.resultCore.rarity}</strong> · Aço: {lastSwordResult.resultCore.steel} · Bônus de Qualidade: +{lastSwordResult.resultCore.bonusQuality}%
              </p>
              {lastSwordResult.fragmentsAwarded > 0 && (
                <p className="mt-1 text-xs text-cyan-300">
                  + {lastSwordResult.fragmentsAwarded}x Fragmentos de Fusão adicionados ao inventário (Proteção contra Azar).
                </p>
              )}
            </div>

            <div className="flex gap-2.5">
              {onForgeCore && (
                <Button
                  size="md"
                  className="bg-linear-to-r from-amber-600 to-amber-500 font-display font-bold text-black shadow-md hover:brightness-110"
                  onClick={() => onForgeCore(lastSwordResult.resultCore)}
                >
                  🔨 LEVAR PARA A BIGORNA AGORA
                </Button>
              )}
              <Button
                variant="secondary"
                size="md"
                onClick={() => setLastSwordResult(null)}
              >
                Concluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESULT MODAL BANNER FOR COMPONENT FUSION */}
      {lastCompResult && (
        <div className="relative rounded-xl border-2 border-cyan-400 bg-linear-to-b from-stone-900 via-cyan-950/40 to-stone-950 p-5 shadow-[0_0_35px_rgba(6,182,212,0.3)]">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <span className="font-display text-[0.68rem] uppercase tracking-widest text-cyan-400">
                {lastCompResult.tierJump === "exceptional"
                  ? "🌟 COMPONENTE EXCEPCIONAL (+2 NÍVEIS)!"
                  : lastCompResult.tierJump === "superior"
                    ? "✨ COMPONENTE MESTRE (+1 NÍVEL)!"
                    : "⚡ COMPONENTE REFINADO"}
              </span>
              <h3 className="mt-1 font-display text-lg font-bold text-cyan-100">
                {lastCompResult.resultComponent.name}
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Raridade: <strong className="text-cyan-300">{lastCompResult.resultComponent.rarity}</strong> · Categoria: {lastCompResult.resultComponent.category}
              </p>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setLastCompResult(null)}
            >
              Guardar no Inventário
            </Button>
          </div>
        </div>
      )}

      {/* CRISOL DE 4 SLOTS */}
      <div className="rounded-xl border border-stone-800 bg-[#090d15] p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
            {mode === "swords" ? "Slots de Armas Selecionadas (4 Obrigatórias)" : "Slots de Componentes (4 Obrigatórios)"}
          </h3>
          <span className="font-display text-xs text-amber-400">
            {mode === "swords" ? `${selectedSwords.length} / 4 Espadas` : `${selectedComponents.length} / 4 Peças`}
          </span>
        </div>

        {/* 4 Crucible Receptacles */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((slotIdx) => {
            const sword = mode === "swords" ? selectedSwords[slotIdx] : null;
            const comp = mode === "components" ? selectedComponents[slotIdx] : null;
            const isFilled = Boolean(sword || comp);

            return (
              <div
                key={slotIdx}
                className={`relative flex min-h-[140px] flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition-all ${
                  isFilled
                    ? "border-amber-500/80 bg-linear-to-b from-stone-900 to-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                    : "border-dashed border-stone-800 bg-black/40 text-slate-500"
                }`}
              >
                {sword ? (
                  <>
                    <span className="text-2xl">⚔️</span>
                    <p className="mt-2 line-clamp-1 font-display text-xs font-bold text-amber-100">
                      {sword.design.name || "Espada"}
                    </p>
                    <span className="mt-0.5 rounded px-1.5 py-0.2 text-[0.62rem] font-semibold text-amber-400">
                      {sword.rarity || "Comum"} (Q: {sword.quality})
                    </span>
                    <button
                      onClick={() => toggleSelectSword(sword.id)}
                      className="mt-2 text-[0.65rem] text-red-400 hover:text-red-300"
                    >
                      Remover ✕
                    </button>
                  </>
                ) : comp ? (
                  <>
                    <span className="text-2xl">{comp.icon || "🛡️"}</span>
                    <p className="mt-2 line-clamp-1 font-display text-xs font-bold text-cyan-100">
                      {comp.name}
                    </p>
                    <span className="mt-0.5 rounded px-1.5 py-0.2 text-[0.62rem] font-semibold text-cyan-400">
                      {comp.rarity}
                    </span>
                    <button
                      onClick={() => toggleSelectComponent(comp.id)}
                      className="mt-2 text-[0.65rem] text-red-400 hover:text-red-300"
                    >
                      Remover ✕
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-xl opacity-40">🔥</span>
                    <p className="mt-1 font-display text-xs">Vazio</p>
                    <span className="text-[0.65rem] text-slate-600">Selecione abaixo</span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Canonical Odds Readout */}
        {((mode === "swords" && selectedSwords.length === 4) || (mode === "components" && selectedComponents.length === 4)) && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-900/50 bg-black/60 p-3 font-display text-xs">
            <span className="text-slate-400">Probabilidades Canônicas:</span>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-amber-200">
                ⚡ Mesmo Tier ({baseRarity} Refinado): <strong>{Math.round(liveOdds.refined * 100)}%</strong>
              </span>
              <span className="text-emerald-300">
                ✨ Salto Superior (+1 Tier): <strong>{Math.round(liveOdds.superior * 100)}%</strong>
              </span>
              {liveOdds.exceptional > 0 && (
                <span className="text-purple-300 font-bold animate-pulse">
                  🌟 Salto Excepcional (+2 Tiers): <strong>{Math.round(liveOdds.exceptional * 100)}%</strong>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Catalyst Enhancer Checkbox */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-800/80 pt-4">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-display text-slate-300">
            <input
              type="checkbox"
              disabled={!hasCatalysts}
              checked={useCatalyst && hasCatalysts}
              onChange={(e) => setUseCatalyst(e.target.checked)}
              className="size-4 rounded border-amber-600 accent-amber-500"
            />
            <span>Usar Catalisador Astral (Potencializa chances de Salto Superior e Excepcional)</span>
            {!hasCatalysts && <span className="text-[0.68rem] text-stone-500">(Nenhum em estoque)</span>}
          </label>

          {/* Action Button */}
          {mode === "swords" ? (
            <Button
              size="lg"
              disabled={selectedSwords.length !== 4 || transmuting}
              onClick={handleTransmuteSwords}
              className="bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 font-display font-bold text-black shadow-lg shadow-amber-950/40 hover:brightness-110 active:scale-98"
            >
              {transmuting ? "TRANSMUTANDO NO FOGO..." : "TRANSMUTAR 4 ESPADAS EM NÚCLEO 🔥"}
            </Button>
          ) : (
            <Button
              size="lg"
              disabled={selectedComponents.length !== 4 || transmuting}
              onClick={handleTransmuteComponents}
              className="bg-linear-to-r from-cyan-600 via-cyan-500 to-cyan-600 font-display font-bold text-black shadow-lg shadow-cyan-950/40 hover:brightness-110 active:scale-98"
            >
              {transmuting ? "FALINDO NO CRISOL..." : "TRANSMUTAR 4 COMPONENTES 🛡️"}
            </Button>
          )}
        </div>
      </div>

      {/* SELETOR DE ITENS DISPONÍVEIS */}
      <div className="rounded-xl border border-stone-800 bg-[#090d15] p-5">
        <h3 className="font-display text-xs font-bold uppercase tracking-wider text-slate-300">
          {mode === "swords" ? "Espadas Disponíveis no Arsenal" : "Componentes em Estoque"}
        </h3>

        {mode === "swords" ? (
          eligibleSwords.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-500">
              Nenhuma espada íntegra disponível para fusão. Forje novas armas no menu principal!
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {eligibleSwords.map((s) => {
                const isSelected = selectedSwordIds.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSelectSword(s.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-amber-400 bg-amber-950/30 shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                        : "border-stone-800 bg-stone-900/50 hover:border-stone-600"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-bold text-amber-200">{s.design.name}</span>
                      <span className="rounded bg-black/50 px-1.5 py-0.2 text-[0.62rem] text-amber-400">
                        {s.rarity || "Comum"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[0.68rem] text-slate-400">
                      <span>Qualidade: {s.quality}%</span>
                      <span>ATK: {s.damage ?? "--"} · DEF: {s.defense ?? "--"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          components.length === 0 ? (
            <p className="mt-4 text-center text-xs text-slate-500">
              Nenhum componente raro no inventário. Consiga componentes através de drops na forja!
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {components.map((c) => {
                const isSelected = selectedComponentIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => toggleSelectComponent(c.id)}
                    className={`cursor-pointer rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_12px_rgba(6,182,212,0.25)]"
                        : "border-stone-800 bg-stone-900/50 hover:border-stone-600"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-bold text-cyan-200">{c.name}</span>
                      <span className="rounded bg-black/50 px-1.5 py-0.2 text-[0.62rem] text-cyan-400">
                        {c.rarity}
                      </span>
                    </div>
                    <p className="mt-1 text-[0.68rem] text-slate-400">{c.description}</p>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* NÚCLEOS DE FUSÃO PRONTOS PARA FORJA */}
      {(inventory.fusionCores || []).length > 0 && (
        <div className="rounded-xl border border-amber-600/40 bg-[#0e121a] p-5">
          <h3 className="font-display text-xs font-bold uppercase tracking-wider text-amber-300">
            ⚒️ Núcleos de Fusão Aguardando Forjamento na Bigorna
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Estes núcleos resultam de fusões anteriores. Escolha um para forjá-lo com bônus de qualidade e perícias herdadas:
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {inventory.fusionCores.map((core) => (
              <div
                key={core.id}
                className="flex items-center justify-between rounded-lg border border-amber-500/50 bg-stone-900/80 p-3.5"
              >
                <div>
                  <h4 className="font-display text-sm font-bold text-amber-100">{core.name}</h4>
                  <p className="text-[0.68rem] text-amber-300">
                    Raridade: <strong>{core.rarity}</strong> · Família: {core.family} · Aço: {core.steel}
                  </p>
                  <p className="mt-0.5 text-[0.65rem] text-slate-400">
                    Perícias herdadas: {core.inheritedPerks.join(", ") || "Nenhuma"}
                  </p>
                </div>
                {onForgeCore && (
                  <Button
                    size="sm"
                    className="bg-amber-500 font-display text-xs font-bold text-black hover:bg-amber-400"
                    onClick={() => onForgeCore(core)}
                  >
                    Forjar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

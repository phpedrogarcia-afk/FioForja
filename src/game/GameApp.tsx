import { useCallback, useEffect, useRef, useState } from "react";
import { ForgeCanvas } from "./ForgeCanvas";
import { loadGameImages, type GameImages } from "./assets";
import {
  isMuted,
  playCoinJingle,
  playLootFanfare,
  playUpgradeChime,
  resumeAudio,
  setMuted,
  unlockAudio,
} from "./audio";
import { generateForgeRewards, isForgeSnapshotValid } from "./sim";
import { defaultCareer, defaultEquippedGear, defaultInventory, defaultWallet, loadSave, writeSave } from "./save";
import type { ComponentFusionOutcome, SwordFusionOutcome } from "./fusion";
import {
  executeSwordFusionTransaction,
  executeComponentFusionTransaction,
  executeComponentInstallTransaction,
  executeUpgradeSwordTransaction,
  executeShopPurchaseTransaction,
  executeClaimRewardsTransaction,
  executeFinishSwordTransaction,
  executeForgeCheckpointTransaction,
  executeStartForgeTransaction,
  executeCancelForgeTransaction,
  executeDeliverCommissionTransaction,
  executeRecycleScrapTransaction,
  retryPersistSave,
} from "./transactions";
import { Button } from "@/components/ui/button";
import { BottomNav } from "./components/BottomNav";
import { WORKSHOP_SECTIONS } from "./components/workshopSections";
import { WorkshopHome } from "./screens/WorkshopHome";
import { CollectionScreen } from "./screens/CollectionScreen";
import { ShopScreen } from "./screens/ShopScreen";
import { CraftScreen } from "./screens/CraftScreen";
import { DesignScreen } from "./screens/DesignScreen";
import { ForgeHud } from "./screens/ForgeHud";
import { RevealScreen } from "./screens/RevealScreen";
import { RewardsScreen } from "./screens/RewardsScreen";
import type {
  ActiveForgeAttempt,
  CareerStats,
  FinishedSword,
  ForgeRewardsData,
  ForgeSnapshot,
  FusionCore,
  HudSnapshot,
  PlayerInventory,
  PlayerWallet,
  SaveData,
  Screen,
  SimState,
  SwordDesign,
  WorkshopSection,
} from "./types";
import type { SimInput } from "./sim";
import { DEFAULT_DESIGN, WORKSHOP_EQUIPMENT } from "./catalog";
import type { ShopArticle } from "./shop";
import { getWeaponRenderMode, setWeaponRenderMode, type WeaponRenderMode } from "./visuals/rendererAdapter";

const EMPTY_HUD: HudSnapshot = {
  phase: "heat",
  heat: 0.1,
  shape: 0,
  quality: 40,
  force: 0,
  charging: false,
  sweetCenter: 0.66,
  sweetWidth: 0.16,
  strikes: 0,
  maxStrikes: 8,
  quenchFill: 0,
  message: "",
  warp: 0,
  integrity: 100,
  structuralState: "stable",
  cracks: 0,
  broken: false,
};

const MAIN_SCREENS: Screen[] = ["home", "collection", "forgePrep", "shop", "craft"];

/**
 * Uma oficina, um estado. Loja, Coleção, Craft e Forja leem e escrevem o mesmo
 * save; cada mutação passa por uma transação canônica e é refletida aqui.
 */
export function GameApp() {
  const save = useRef(loadSave());
  const [screen, setScreen] = useState<Screen>("home");
  const [weaponRenderMode, setWeaponRenderModeState] = useState<WeaponRenderMode>(() => getWeaponRenderMode());
  const [design, setDesign] = useState<SwordDesign>(DEFAULT_DESIGN);
  const [gallery, setGallery] = useState<FinishedSword[]>([]);
  const [wallet, setWallet] = useState<PlayerWallet>(defaultWallet);
  const [inventory, setInventory] = useState<PlayerInventory>(defaultInventory);
  const [career, setCareer] = useState<CareerStats>(defaultCareer);
  const [forgeAttempt, setForgeAttempt] = useState<ActiveForgeAttempt | null>(null);
  const [activeCore, setActiveCore] = useState<FusionCore | null>(null);
  const [prepCore, setPrepCore] = useState<FusionCore | null>(null);
  const [images, setImages] = useState<GameImages | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [finished, setFinished] = useState<FinishedSword | null>(null);
  const [muted, setMutedUi] = useState(false);
  const [forgeKey, setForgeKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pendingFailedSave, setPendingFailedSave] = useState<{ sword: FinishedSword; uncommittedSave: SaveData } | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState<ActiveForgeAttempt | null>(null);
  const [confirmExitForge, setConfirmExitForge] = useState(false);

  const inputRef = useRef<SimInput>({ charging: false, action: false, reheat: false });
  const designRef = useRef(design);
  designRef.current = design;

  const showError = useCallback((msg: string) => {
    setErrorToast(msg);
    window.setTimeout(() => setErrorToast(null), 4800);
  }, []);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 3200);
  }, []);

  /** Reflete o save canônico em todos os consumidores de estado. */
  const sync = useCallback((next: SaveData) => {
    save.current = next;
    setGallery(next.gallery);
    setWallet(next.wallet);
    setInventory(next.inventory);
    setCareer(next.career);
  }, []);

  const persist = useCallback((patch: Partial<SaveData>): import("./types").SaveResult => {
    const next = { ...save.current, ...patch };
    const res = writeSave(next);
    if (res.ok) {
      save.current = next;
    } else {
      console.error("[FioForja] Falha na persistência:", res.error, res.code);
    }
    return res;
  }, []);

  /** Navegação com entrada de histórico para o gesto/botão Voltar do Android. */
  const go = useCallback((next: Screen) => {
    setScreen(next);
    setFlash(null);
    if (typeof window === "undefined") return;
    try {
      window.history.pushState({ fioSection: next, fio: true }, "", "#" + next);
    } catch {
      /* histórico indisponível não bloqueia a navegação */
    }
  }, []);

  useEffect(() => {
    const loaded = loadSave();
    save.current = loaded;
    setGallery(loaded.gallery);
    setDesign(loaded.lastDesign);
    setWallet(loaded.wallet || defaultWallet);
    setInventory(loaded.inventory || defaultInventory);
    setCareer(loaded.career || defaultCareer);
    setMutedUi(loaded.muted);

    if (typeof window !== "undefined") {
      try {
        window.history.replaceState({ fioSection: "home", fio: true }, "", "#home");
      } catch {
        /* ignore */
      }
    }

    if (
      loaded.activeForgeAttempt &&
      (loaded.activeForgeAttempt.status === "PREPARED" ||
        loaded.activeForgeAttempt.status === "ACTIVE" ||
        !loaded.activeForgeAttempt.status)
    ) {
      setRecoveryAttempt(loaded.activeForgeAttempt);
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMq = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    void loadGameImages().then(setImages);
    setMuted(loaded.muted);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Voltar: durante a fabricação abre a saída segura, nunca cancela sozinho.
  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      if (screen === "forge") {
        setConfirmExitForge(true);
        return;
      }
      if (screen === "reveal" || screen === "rewards") {
        setScreen("collection");
        return;
      }
      const next = (event.state as { fioSection?: Screen } | null)?.fioSection;
      setScreen(next && MAIN_SCREENS.includes(next) ? next : "home");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [screen]);

  const resumeAttempt = useCallback(
    (attempt: ActiveForgeAttempt) => {
      if (!isForgeSnapshotValid(attempt.snapshot)) {
        showError("Esta tentativa antiga não possui checkpoint físico compatível. Cancele para recuperar os insumos.");
        return;
      }
      setForgeAttempt(attempt);
      setActiveCore(attempt.snapshot.state.activeCore || null);
      setDesign(attempt.design);
      inputRef.current = { charging: false, action: false, reheat: false };
      unlockAudio();
      setHud(EMPTY_HUD);
      setFinished(null);
      setForgeKey((k) => k + 1);
      setRecoveryAttempt(null);
      go("forge");
    },
    [go, showError],
  );

  const startForge = useCallback(
    (isTraining = false) => {
      unlockAudio();
      const res = executeStartForgeTransaction(save.current, designRef.current, {
        isTraining,
        activeCoreId: prepCore?.id,
      });
      if (!res.success) {
        showError(res.error || "Não foi possível iniciar a forja.");
        if (res.code === "INSUFFICIENT_MATERIALS") go("shop");
        return false;
      }
      save.current = res.save;
      setForgeAttempt(res.payload!);
      setDesign(res.payload!.design);
      setActiveCore(res.payload!.snapshot?.state.activeCore || null);
      setInventory(res.save.inventory);
      setPrepCore(null);
      inputRef.current = { charging: false, action: false, reheat: false };
      setHud(EMPTY_HUD);
      setFinished(null);
      setForgeKey((k) => k + 1);
      go("forge");
      return true;
    },
    [go, prepCore, showError],
  );

  const handlePrepareCore = useCallback(
    (core: FusionCore) => {
      const live = save.current.inventory.fusionCores.find((c) => c.id === core.id);
      if (!live) {
        showError("Este núcleo já não está disponível no inventário.");
        return;
      }
      const coreDesign: SwordDesign = {
        name: live.name.split("—")[1]?.trim() || "Espada do Crisol",
        family: live.family,
        profile: live.profile,
        steel: live.steel,
        guard: "cross",
        pommel: "disc",
        wrap: "leather",
        inscription: "",
        runes: ["Lendária", "Relíquia", "Épica"].includes(live.rarity),
        length: 0.75,
      };
      setPrepCore(live);
      setDesign(coreDesign);
      persist({ lastDesign: coreDesign });
      go("forgePrep");
    },
    [go, persist, showError],
  );

  const onHud = useCallback((next: HudSnapshot) => {
    setHud(next);
  }, []);

  const handleCheckpoint = useCallback((snapshot: ForgeSnapshot): string | null => {
    const res = executeForgeCheckpointTransaction(save.current, snapshot);
    if (!res.success) return res.error || "Não foi possível gravar o último ponto da forja.";
    const goldChanged = save.current.wallet.gold !== res.save.wallet.gold;
    save.current = res.save;
    if (goldChanged) setWallet(res.save.wallet);
    return null;
  }, []);

  const handleClaimRewards = useCallback(
    (rewards: ForgeRewardsData) => {
      const res = executeClaimRewardsTransaction(save.current, rewards, finished);
      if (!res.success) {
        showError(res.error || "Erro ao resgatar recompensas.");
        return;
      }
      sync(res.save);
      const rarityOrder: import("./types").RarityGrade[] = ["Relíquia", "Lendária", "Épica", "Rara", "Incomum", "Comum"];
      const highest = rarityOrder.find((r) => rewards.items.some((it) => it.rarity === r)) || "Comum";
      playLootFanfare(highest);
    },
    [finished, showError, sync],
  );

  const handleApplyComponentFusion = useCallback(
    (outcome: ComponentFusionOutcome): boolean => {
      const res = executeComponentFusionTransaction(save.current, outcome);
      if (!res.success) {
        showError(res.error || "Falha na fusão de componentes.");
        return false;
      }
      sync(res.save);
      return true;
    },
    [showError, sync],
  );

  const handleApplySwordFusion = useCallback(
    (outcome: SwordFusionOutcome): boolean => {
      const res = executeSwordFusionTransaction(save.current, outcome);
      if (!res.success) {
        showError(res.error || "Falha na fusão de espadas.");
        return false;
      }
      sync(res.save);
      return true;
    },
    [showError, sync],
  );

  const handleBuyArticle = useCallback(
    (article: ShopArticle): boolean => {
      const res = executeShopPurchaseTransaction(save.current, {
        id: article.id,
        name: article.name,
        type: article.type,
        costGold: article.costGold,
        costRubies: article.costRubies,
        quantity: 1,
        componentData: article.componentData
          ? { name: article.name, ...article.componentData }
          : undefined,
      });
      if (!res.success) {
        showError(res.error || "Falha na aquisição do item.");
        return false;
      }
      sync(res.save);
      playCoinJingle();
      showFlash(`${article.name} entregue ao inventário.`);
      return true;
    },
    [showError, showFlash, sync],
  );

  const handleEquipTool = useCallback(
    (toolId: string) => {
      const currentInventory = save.current.inventory || defaultInventory;
      const tool = WORKSHOP_EQUIPMENT.find((item) => item.id === toolId);
      if (!tool || (!tool.unlockedByDefault && !currentInventory.unlockedTools.includes(toolId))) return false;
      const currentEquipped = currentInventory.equipped || defaultEquippedGear;
      const nextEquipped = { ...currentEquipped };
      if (toolId.startsWith("hammer_")) nextEquipped.hammer = toolId.replace("hammer_", "") as never;
      else if (toolId.startsWith("anvil_")) nextEquipped.anvil = toolId as never;
      else if (toolId.startsWith("furnace_")) nextEquipped.furnace = toolId as never;
      else if (toolId.startsWith("quench_")) nextEquipped.quench = toolId as never;

      const nextInventory: PlayerInventory = { ...currentInventory, equipped: nextEquipped };
      const res = persist({ inventory: nextInventory });
      if (!res.ok) {
        showError(res.error || "Não foi possível gravar o equipamento da oficina.");
        return false;
      }
      setInventory(nextInventory);
      return true;
    },
    [persist, showError],
  );

  const handleUpgradeSword = useCallback(
    (targetSword: FinishedSword): boolean => {
      const res = executeUpgradeSwordTransaction(save.current, targetSword.id);
      if (!res.success) {
        showError(res.error || "Falha no refino da lâmina.");
        return false;
      }
      sync(res.save);
      playUpgradeChime();
      if (res.payload) setFinished(res.payload);
      return true;
    },
    [showError, sync],
  );

  const handleToggleFavorite = useCallback(
    (swordId: string): boolean => {
      const target = save.current.gallery.find((s) => s.id === swordId);
      if (!target) return false;
      const nextGallery = save.current.gallery.map((s) =>
        s.id === swordId ? { ...s, favorite: !s.favorite } : s,
      );
      const res = persist({ gallery: nextGallery });
      if (!res.ok) {
        showError(res.error || "Não foi possível guardar a proteção da espada.");
        return false;
      }
      setGallery(nextGallery);
      return true;
    },
    [persist, showError],
  );

  const onFinished = useCallback(
    (sim: SimState) => {
      const res = executeFinishSwordTransaction(
        save.current,
        sim,
        save.current.activeForgeAttempt?.design || designRef.current,
      );
      if (!res.success) {
        showError(res.error || "Falha ao registrar lâmina finalizada no armazenamento.");
        if (res.payload && res.uncommittedSave) {
          setPendingFailedSave({ sword: res.payload, uncommittedSave: res.uncommittedSave });
        }
        return;
      }
      sync(res.save);
      if (res.payload) setFinished(res.payload);
      setActiveCore(null);
      setPrepCore(null);
      window.setTimeout(() => go("reveal"), 800);
    },
    [go, showError, sync],
  );

  const handleRetryPersist = useCallback(() => {
    if (!pendingFailedSave) return;
    const res = retryPersistSave(pendingFailedSave.uncommittedSave);
    if (!res.success) {
      showError(res.error || "Falha persistente ao tentar salvar novamente.");
      return;
    }
    sync(res.save);
    setFinished(pendingFailedSave.sword);
    setActiveCore(null);
    setPendingFailedSave(null);
    go("reveal");
  }, [go, pendingFailedSave, showError, sync]);

  const handleCancelFailedPersist = useCallback(() => {
    setPendingFailedSave(null);
    setRecoveryAttempt(save.current.activeForgeAttempt || null);
    go("home");
  }, [go]);

  const handleDeliverCommission = useCallback(
    (commissionId: string, swordId: string): boolean => {
      const res = executeDeliverCommissionTransaction(save.current, commissionId, swordId);
      if (!res.success) {
        showError(res.error || "Falha na entrega da encomenda.");
        return false;
      }
      sync(res.save);
      playUpgradeChime();
      showFlash("Encomenda entregue e recompensa creditada.");
      return true;
    },
    [showError, showFlash, sync],
  );

  const handleRecycleScrap = useCallback((): boolean => {
    const res = executeRecycleScrapTransaction(save.current);
    if (!res.success) {
      showError(res.error || "Falha na reciclagem de sucata.");
      return false;
    }
    sync(res.save);
    playUpgradeChime();
    return true;
  }, [showError, sync]);

  const handleInstallComponent = useCallback(
    (swordId: string, componentId: string): boolean => {
      const res = executeComponentInstallTransaction(save.current, swordId, componentId, finished);
      if (!res.success) {
        showError(res.error || "Falha na montagem do componente.");
        return false;
      }
      sync(res.save);
      playUpgradeChime();
      if (res.payload && finished && finished.id === swordId) setFinished(res.payload);
      return true;
    },
    [finished, showError, sync],
  );

  const cancelForgeAndExit = useCallback(() => {
    inputRef.current.charging = false;
    const cancelRes = executeCancelForgeTransaction(save.current);
    if (!cancelRes.success) {
      showError(cancelRes.error || "Não foi possível gravar o cancelamento.");
      return;
    }
    save.current = cancelRes.save;
    sync(cancelRes.save);
    setActiveCore(null);
    setForgeAttempt(null);
    setPrepCore(null);
    setConfirmExitForge(false);
    go("home");
  }, [go, showError, sync]);

  useEffect(() => {
    if (screen !== "forge") return;
    const down = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("button, input, a, label")) return;
      e.preventDefault();
      inputRef.current.charging = true;
    };
    const up = () => {
      inputRef.current.charging = false;
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        inputRef.current.charging = true;
      }
      if (e.code === "KeyR" || e.key === "r" || e.key === "R") inputRef.current.reheat = true;
      if (e.code === "Digit1" || e.key === "1") inputRef.current.switchZone = "base";
      if (e.code === "Digit2" || e.key === "2") inputRef.current.switchZone = "mid";
      if (e.code === "Digit3" || e.key === "3") inputRef.current.switchZone = "tip";
      if (e.code === "KeyH" || e.key === "h" || e.key === "H") {
        const unlockedTools = inventory.unlockedTools || [];
        const availableHammers: import("./types").HammerType[] = ["standard"];
        if (unlockedTools.includes("hammer_precision")) availableHammers.push("precision");
        if (unlockedTools.includes("hammer_sledge")) availableHammers.push("sledge");
        const current = hud.activeHammer || "standard";
        const currentIdx = availableHammers.indexOf(current);
        inputRef.current.switchHammer = availableHammers[(currentIdx + 1) % availableHammers.length];
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        inputRef.current.charging = false;
      }
    };
    const currentInput = inputRef.current;
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      currentInput.charging = false;
    };
  }, [screen, hud.activeHammer, inventory.unlockedTools]);

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedUi(next);
    persist({ muted: next });
    unlockAudio();
  };

  const toggleWeaponRenderMode = () => {
    const nextMode = weaponRenderMode === "legacy" ? "dna" : "legacy";
    setWeaponRenderMode(nextMode);
    setWeaponRenderModeState(nextMode);
  };

  const activeAttempt = forgeAttempt || recoveryAttempt || save.current.activeForgeAttempt || null;
  const sectionTitle = WORKSHOP_SECTIONS.find((s) => s.id === (screen as WorkshopSection))?.title || "Início";
  const immersiveForge = screen === "forge";

  return (
    <>
      {immersiveForge ? (
        <div className="relative h-dvh overflow-hidden bg-bg">
          {images && forgeAttempt?.snapshot ? (
            <ForgeCanvas
              key={forgeKey}
              snapshot={forgeAttempt.snapshot}
              images={images}
              shake={save.current.shake}
              reducedMotion={reducedMotion}
              onHud={onHud}
              onFinished={onFinished}
              onCheckpoint={handleCheckpoint}
              inputRef={inputRef}
            />
          ) : (
            <div className="flex h-full items-center justify-center font-display text-muted">
              Acendendo o fogo da forja…
            </div>
          )}
          <ForgeHud
            hud={hud}
            muted={muted}
            unlockedHammers={(() => {
              const unlocked: import("./types").HammerType[] = ["standard"];
              if (inventory.unlockedTools.includes("hammer_precision")) unlocked.push("precision");
              if (inventory.unlockedTools.includes("hammer_sledge")) unlocked.push("sledge");
              return unlocked;
            })()}
            onMute={toggleMute}
            onPull={() => {
              inputRef.current.action = true;
            }}
            onReheat={() => {
              inputRef.current.reheat = true;
            }}
            onSelectZone={(zone) => {
              inputRef.current.switchZone = zone;
            }}
            onSelectHammer={(hammer) => {
              inputRef.current.switchHammer = hammer;
            }}
            onQuit={() => setConfirmExitForge(true)}
          />
        </div>
      ) : screen === "reveal" && finished ? (
        <RevealScreen
          sword={finished}
          wallet={wallet}
          inventory={inventory}
          onUpgrade={handleUpgradeSword}
          onInstallComponent={handleInstallComponent}
          onClaimRewards={() => go("rewards")}
          onAgain={() => go("forgePrep")}
          onGallery={() => go("collection")}
          onTitle={() => go("home")}
        />
      ) : screen === "rewards" && finished ? (
        <RewardsScreen
          sword={finished}
          rewards={finished.pendingRewards || generateForgeRewards(finished, { forgeRunId: finished.forgeRunId })}
          onClaim={handleClaimRewards}
          onGallery={() => go("collection")}
          onAgain={() => go("forgePrep")}
        />
      ) : (
        <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-[#120d09] px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="font-display text-sm tracking-[0.16em] text-amber-300">FIOFORJA</span>
              <span className="truncate font-display text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                {sectionTitle}
              </span>
            </div>
            <div
              aria-label="Carteira"
              className="flex shrink-0 items-center gap-1.5 text-[0.62rem] font-semibold tabular-nums text-[#e8dcc4]"
            >
              <span>🪙 {wallet.gold}</span>
              <span className="text-[#5b4a33]">·</span>
              <span>💎 {wallet.rubies}</span>
              <span className="text-[#5b4a33]">·</span>
              <span>💠 {wallet.diamonds}</span>
            </div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto overscroll-contain" hidden={screen !== "home"}>
              <WorkshopHome
                active={screen === "home"}
                swords={gallery}
                wallet={wallet}
                inventory={inventory}
                career={career}
                commissions={save.current.commissions}
                activeAttempt={activeAttempt}
                onResumeAttempt={() => activeAttempt && resumeAttempt(activeAttempt)}
                onForge={() => go("forgePrep")}
                onCollection={() => go("collection")}
                onCraft={() => go("craft")}
                onShop={() => go("shop")}
                onPrepareCore={handlePrepareCore}
                onDeliverCommission={handleDeliverCommission}
                weaponRenderMode={weaponRenderMode}
                onToggleRenderer={toggleWeaponRenderMode}
                muted={muted}
                onToggleMute={toggleMute}
              />
            </div>

            <div className="h-full overflow-y-auto overscroll-contain" hidden={screen !== "collection"}>
              <CollectionScreen
                active={screen === "collection"}
                swords={gallery}
                inventory={inventory}
                wallet={wallet}
                career={career}
                onInstallComponent={handleInstallComponent}
                onToggleFavorite={handleToggleFavorite}
                onUpgrade={handleUpgradeSword}
                onPrepareCore={handlePrepareCore}
                onGoShop={() => go("shop")}
                onGoForge={() => go("forgePrep")}
              />
            </div>

            <div className="h-full" hidden={screen !== "forgePrep"}>
              <DesignScreen
                embedded
                design={design}
                onChange={setDesign}
                onBack={() => go("home")}
                onForge={startForge}
                inventory={inventory}
                wallet={wallet}
                career={career}
                gallery={gallery}
                activeCore={prepCore}
                lockToCore={Boolean(prepCore)}
                onOpenShop={() => go("shop")}
                onCancelCore={() => setPrepCore(null)}
                activeAttempt={activeAttempt}
                onResumeAttempt={() => activeAttempt && resumeAttempt(activeAttempt)}
                onRecycleScrap={handleRecycleScrap}
              />
            </div>

            <div className="h-full overflow-y-auto overscroll-contain" hidden={screen !== "shop"}>
              <ShopScreen active={screen === "shop"} wallet={wallet} inventory={inventory} onPurchase={handleBuyArticle} onEquipTool={handleEquipTool} />
            </div>

            <div className="h-full overflow-y-auto overscroll-contain" hidden={screen !== "craft"}>
              <CraftScreen
                active={screen === "craft"}
                swords={gallery}
                inventory={inventory}
                wallet={wallet}
                onFuseSwords={handleApplySwordFusion}
                onFuseComponents={handleApplyComponentFusion}
                onPrepareCore={handlePrepareCore}
                onGoShop={() => go("shop")}
              />
            </div>
          </main>

          <BottomNav
            active={(MAIN_SCREENS.includes(screen) ? screen : "home") as WorkshopSection}
            onNavigate={(next) => {
              if (screen !== next) go(next);
            }}
          />
        </div>
      )}

      {flash ? (
        <div
          role="status"
          className="pointer-events-none fixed top-16 left-1/2 z-50 -translate-x-1/2 rounded-md border border-emerald-600/60 bg-emerald-950/95 px-3.5 py-2 text-xs text-emerald-100 shadow-2xl"
        >
          {flash}
        </div>
      ) : null}

      {errorToast && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-2.5 rounded-md border border-red-500/60 bg-red-950/95 px-4 py-2 font-display text-xs text-amber-200 shadow-2xl"
        >
          <span className="font-bold text-red-400">⚠️</span>
          <span>{errorToast}</span>
        </div>
      )}

      {confirmExitForge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm space-y-3 rounded-xl border border-amber-600/60 bg-[#120e0a] p-5 text-center">
            <div className="text-3xl">⚒️</div>
            <h3 className="font-display text-base font-bold text-amber-300">Sair da bigorna?</h3>
            <p className="text-xs leading-relaxed text-slate-300">
              A tentativa está protegida no save. Se sair agora, a forja é cancelada: antes do primeiro golpe o
              lingote volta; depois dele, você recupera sucata e perde o material.
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-amber-600 font-display text-xs font-bold text-slate-950 hover:bg-amber-500"
                onClick={() => {
                  setConfirmExitForge(false);
                  try {
                    window.history.pushState({ fioSection: "forge", fio: true }, "", "#forge");
                  } catch {
                    /* ignore */
                  }
                }}
              >
                Continuar martelando
              </Button>
              <Button variant="secondary" className="flex-1 text-xs" onClick={cancelForgeAndExit}>
                Sair e cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {recoveryAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md space-y-4 rounded-xl border border-amber-600/60 bg-[#120e0a] p-6 text-center shadow-2xl">
            <div className="text-3xl">⚒️</div>
            <h3 className="font-display text-base font-bold text-amber-300">Forja em Andamento Detectada</h3>
            <p className="text-xs leading-relaxed text-slate-300">
              {recoveryAttempt.isTraining
                ? "Uma sessão de treinamento do aprendiz foi interrompida na bigorna."
                : `Existe uma tentativa ativa de forja (${recoveryAttempt.design.name || "Lâmina"}) com matéria-prima alocada.`}
            </p>
            <div className="space-y-1.5 rounded-lg border border-amber-900/40 bg-black/50 p-3 text-left font-sans text-xs text-slate-300">
              <div><strong className="text-amber-400">Projeto:</strong> {recoveryAttempt.design.name || "Customizado"}</div>
              <div><strong className="text-amber-400">Liga Metálica:</strong> {recoveryAttempt.design.steel}</div>
              <div><strong className="text-amber-400">Progresso:</strong> {recoveryAttempt.status === "ACTIVE" ? "Tarugo deformado (Em forjamento)" : "Preparada na Bigorna (Sem marteladas)"}</div>
              <div><strong className="text-amber-400">Marteladas registradas:</strong> {recoveryAttempt.strikesCount || 0}</div>
            </div>
            <p className="text-xs text-amber-200/80">
              {isForgeSnapshotValid(recoveryAttempt.snapshot)
                ? "A metalurgia é retomada do último ponto confirmado. Golpes são salvos imediatamente; aquecimento e carga podem recuar até 1 segundo."
                : "Esta tentativa antiga não possui checkpoint físico compatível. Cancele para aplicar a recuperação dos insumos, sem inventar novo progresso."}
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button
                className="flex-1 bg-amber-600 font-display text-xs font-bold text-slate-950 hover:bg-amber-500"
                disabled={!isForgeSnapshotValid(recoveryAttempt.snapshot)}
                onClick={() => resumeAttempt(recoveryAttempt)}
              >
                Retomar ponto salvo
              </Button>
              <Button
                variant="secondary"
                className="flex-1 border-border font-display text-xs text-slate-400 hover:text-white"
                onClick={() => {
                  const res = executeCancelForgeTransaction(save.current, { strikesCount: recoveryAttempt.strikesCount });
                  if (res.success) {
                    sync(res.save);
                    if (res.payload?.refundedMaterial) {
                      showFlash("Tentativa cancelada: 100% dos insumos foram devolvidos ao inventário.");
                    } else if (res.payload?.scrapAwarded) {
                      showFlash("Tentativa cancelada: +1 sucata metálica recuperada.");
                    }
                    setRecoveryAttempt(null);
                  } else {
                    showError(res.error || "Não foi possível cancelar a tentativa.");
                  }
                }}
              >
                Cancelar / Abandonar
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingFailedSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-xl border border-red-500/60 bg-[#12080a] p-6 shadow-2xl">
            <h3 className="flex items-center gap-2 font-display text-base font-bold text-red-300">
              <span>⚠️</span> Falha de Gravação no Armazenamento
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              A lâmina forjada foi concluída, mas o navegador não conseguiu gravar o registro no armazenamento local.
            </p>
            <p className="mt-2 font-display text-xs text-amber-300/90">
              Seu núcleo, seus materiais e os atributos calculados da espada permanecem preservados em memória.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                className="flex-1 bg-amber-600 font-display text-xs font-bold text-black hover:bg-amber-500"
                onClick={handleRetryPersist}
              >
                🔄 Tentar Gravar Novamente
              </Button>
              <Button variant="secondary" className="flex-1 font-display text-xs" onClick={handleCancelFailedPersist}>
                Voltar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

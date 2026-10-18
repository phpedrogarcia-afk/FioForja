import { useCallback, useEffect, useRef, useState } from "react";
import { ForgeCanvas } from "./ForgeCanvas";
import { loadGameImages, type GameImages } from "./assets";
import { isMuted, playCoinJingle, playLootFanfare, playUpgradeChime, resumeAudio, setMuted, unlockAudio } from "./audio";
import { generateForgeRewards, applyStrikeRewardTransaction, type StrikeRewardTransactionResult } from "./sim";
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
  executeStrikeRewardTransaction,
  type ShopPurchaseItem,
} from "./transactions";
import { DesignScreen } from "./screens/DesignScreen";
import { ForgeHud } from "./screens/ForgeHud";
import { GalleryScreen } from "./screens/GalleryScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { RewardsScreen } from "./screens/RewardsScreen";
import { TitleScreen } from "./screens/TitleScreen";
import type { CareerStats, EquippedWorkshopGear, FinishedSword, ForgeRewardsData, FusionCore, HudSnapshot, PlayerInventory, PlayerWallet, Screen, SimState, SwordDesign } from "./types";
import type { SimInput } from "./sim";
import { DEFAULT_DESIGN, WORKSHOP_EQUIPMENT } from "./catalog";

export { applyStrikeRewardTransaction, type StrikeRewardTransactionResult };

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

export function GameApp() {
  const save = useRef(loadSave());
  const [screen, setScreen] = useState<Screen>("title");
  const [design, setDesign] = useState<SwordDesign>(DEFAULT_DESIGN);
  const [gallery, setGallery] = useState<FinishedSword[]>([]);
  const [wallet, setWallet] = useState<PlayerWallet>(defaultWallet);
  const [inventory, setInventory] = useState<PlayerInventory>(defaultInventory);
  const [career, setCareer] = useState<CareerStats>(defaultCareer);
  const [activeCore, setActiveCore] = useState<FusionCore | null>(null);
  const [images, setImages] = useState<GameImages | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [finished, setFinished] = useState<FinishedSword | null>(null);
  const [muted, setMutedUi] = useState(false);
  const [forgeKey, setForgeKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const showError = useCallback((msg: string) => {
    setErrorToast(msg);
    window.setTimeout(() => setErrorToast(null), 4500);
  }, []);
  const inputRef = useRef<SimInput>({ charging: false, action: false, reheat: false });
  const designRef = useRef(design);
  designRef.current = design;

  useEffect(() => {
    const loaded = loadSave();
    save.current = loaded;
    setGallery(loaded.gallery);
    setDesign(loaded.lastDesign);
    setWallet(loaded.wallet || defaultWallet);
    setInventory(loaded.inventory || defaultInventory);
    setCareer(loaded.career || defaultCareer);
    setMutedUi(loaded.muted);

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

  const persist = useCallback((patch: Partial<typeof save.current>): import("./types").SaveResult => {
    const next = { ...save.current, ...patch };
    const res = writeSave(next);
    if (res.ok) {
      save.current = next;
    } else {
      console.error("[FioForja] Falha na persistência:", res.error, res.code);
    }
    return res;
  }, []);

  const startForge = useCallback(() => {
    unlockAudio();
    setActiveCore(null);
    persist({ lastDesign: designRef.current });
    setHud(EMPTY_HUD);
    setFinished(null);
    setForgeKey((k) => k + 1);
    setScreen("forge");
  }, [persist]);

  const onHud = useCallback((next: HudSnapshot) => {
    setHud(next);
  }, []);

  const handleStrikeReward = useCallback((reward: { amount: number; id: string }) => {
    const res = executeStrikeRewardTransaction(save.current, reward);
    if (!res.success) return;
    save.current = res.save;
    setWallet(res.save.wallet);
  }, []);

  const handleClaimRewards = useCallback((rewards: ForgeRewardsData) => {
    const res = executeClaimRewardsTransaction(save.current, rewards, finished);
    if (!res.success) {
      showError(res.error || "Erro ao resgatar recompensas.");
      return;
    }
    save.current = res.save;
    setWallet(res.save.wallet);
    setInventory(res.save.inventory);

    // Fanfare for highest rarity
    const rarityOrder: import("./types").RarityGrade[] = ["Relíquia", "Lendária", "Épica", "Rara", "Incomum", "Comum"];
    const highest = rarityOrder.find((r) => rewards.items.some((it) => it.rarity === r)) || "Comum";
    playLootFanfare(highest);
  }, [finished, showError]);

  const handleApplyComponentFusion = useCallback((outcome: ComponentFusionOutcome) => {
    const res = executeComponentFusionTransaction(save.current, outcome);
    if (!res.success) {
      showError(res.error || "Falha na fusão de componentes.");
      return;
    }
    save.current = res.save;
    setWallet(res.save.wallet);
    setInventory(res.save.inventory);
  }, [showError]);

  const handleApplySwordFusion = useCallback((outcome: SwordFusionOutcome) => {
    const res = executeSwordFusionTransaction(save.current, outcome);
    if (!res.success) {
      showError(res.error || "Falha na fusão de espadas.");
      return;
    }
    save.current = res.save;
    setWallet(res.save.wallet);
    setInventory(res.save.inventory);
    setGallery(res.save.gallery);
  }, [showError]);

  const handleForgeCore = useCallback((core: FusionCore) => {
    const coreInInventory = save.current.inventory?.fusionCores?.some((c) => c.id === core.id);
    if (!coreInInventory) return;

    setActiveCore(core);
    const coreDesign: SwordDesign = {
      name: core.name.split("—")[1]?.trim() || "Espada do Crisol",
      family: core.family,
      profile: core.profile,
      steel: core.steel,
      guard: "cross",
      pommel: "disc",
      wrap: "leather",
      inscription: "",
      runes: core.rarity === "Lendária" || core.rarity === "Relíquia" || core.rarity === "Épica",
      length: 0.75,
    };
    setDesign(coreDesign);
    persist({ lastDesign: coreDesign });
    unlockAudio();
    setHud(EMPTY_HUD);
    setFinished(null);
    setForgeKey((k) => k + 1);
    setScreen("forge");
  }, [persist]);

  const handleBuyTool = useCallback((toolId: string): boolean => {
    const tool = WORKSHOP_EQUIPMENT.find((t) => t.id === toolId);
    if (!tool) return false;
    const res = executeShopPurchaseTransaction(save.current, {
      id: tool.id,
      name: tool.name,
      type: "tool",
      costGold: tool.costGold,
      costRubies: tool.costRubies,
    });
    if (!res.success) {
      showError(res.error || "Falha na aquisição da ferramenta.");
      return false;
    }
    save.current = res.save;
    setWallet(res.save.wallet);
    setInventory(res.save.inventory);
    return true;
  }, [showError]);

  const handleBuyShopItem = useCallback((item: ShopPurchaseItem): boolean => {
    const res = executeShopPurchaseTransaction(save.current, item);
    if (!res.success) {
      showError(res.error || "Falha na aquisição do item.");
      return false;
    }
    save.current = res.save;
    setWallet(res.save.wallet);
    setInventory(res.save.inventory);
    playCoinJingle();
    return true;
  }, [showError]);

  const handleSelectPreset = useCallback((presetDesign: SwordDesign) => {
    setDesign(presetDesign);
    persist({ lastDesign: presetDesign });
    setScreen("design");
  }, [persist]);

  const handleEquipTool = useCallback((toolId: string) => {
    const currentInventory = save.current.inventory || defaultInventory;
    const currentEquipped: EquippedWorkshopGear = currentInventory.equipped || defaultEquippedGear;
    const nextEquipped: EquippedWorkshopGear = { ...currentEquipped };

    if (toolId.startsWith("hammer_")) {
      nextEquipped.hammer = toolId.replace("hammer_", "") as any;
    } else if (toolId.startsWith("anvil_")) {
      nextEquipped.anvil = toolId as any;
    } else if (toolId.startsWith("furnace_")) {
      nextEquipped.furnace = toolId as any;
    } else if (toolId.startsWith("quench_")) {
      nextEquipped.quench = toolId as any;
    }

    const nextInventory: PlayerInventory = {
      ...currentInventory,
      equipped: nextEquipped,
    };
    setInventory(nextInventory);
    persist({ inventory: nextInventory });
  }, [persist]);

  const handleUpgradeSword = useCallback((targetSword: FinishedSword): boolean => {
    const res = executeUpgradeSwordTransaction(save.current, targetSword.id);
    if (!res.success) {
      showError(res.error || "Falha no refino da lâmina.");
      return false;
    }
    save.current = res.save;
    playUpgradeChime();
    setWallet(res.save.wallet);
    setGallery(res.save.gallery);
    if (res.payload) {
      setFinished(res.payload);
    }
    return true;
  }, [showError]);

  const onFinished = useCallback((sim: SimState) => {
    const res = executeFinishSwordTransaction(save.current, sim, designRef.current);
    if (!res.success) {
      showError(res.error || "Falha ao registrar lâmina finalizada.");
    }
    save.current = res.save;
    setCareer(res.save.career);
    setInventory(res.save.inventory);
    setGallery(res.save.gallery);
    if (res.payload) {
      setFinished(res.payload);
    }
    if (sim.activeCore) {
      setActiveCore(null);
    }
    window.setTimeout(() => setScreen("reveal"), 800);
  }, [showError]);

  const handleInstallComponent = useCallback((swordId: string, componentId: string): boolean => {
    const res = executeComponentInstallTransaction(save.current, swordId, componentId, finished);
    if (!res.success) {
      showError(res.error || "Falha na montagem do componente.");
      return false;
    }
    save.current = res.save;
    playUpgradeChime();
    setInventory(res.save.inventory);
    setGallery(res.save.gallery);
    if (res.payload && finished && finished.id === swordId) {
      setFinished(res.payload);
    }
    return true;
  }, [finished, showError]);

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
      if (e.code === "KeyR" || e.key === "r" || e.key === "R") {
        inputRef.current.reheat = true;
      }
      if (e.code === "Digit1" || e.key === "1") {
        inputRef.current.switchZone = "base";
      }
      if (e.code === "Digit2" || e.key === "2") {
        inputRef.current.switchZone = "mid";
      }
      if (e.code === "Digit3" || e.key === "3") {
        inputRef.current.switchZone = "tip";
      }
      if (e.code === "KeyH" || e.key === "h" || e.key === "H") {
        const unlockedTools = inventory.unlockedTools || [];
        const availableHammers: import("./types").HammerType[] = ["standard"];
        if (unlockedTools.includes("hammer_precision")) availableHammers.push("precision");
        if (unlockedTools.includes("hammer_sledge")) availableHammers.push("sledge");
        const current = hud.activeHammer || "standard";
        const currentIdx = availableHammers.indexOf(current);
        const nextIdx = (currentIdx + 1) % availableHammers.length;
        inputRef.current.switchHammer = availableHammers[nextIdx];
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

  const renderScreen = () => {
    if (screen === "title") {
      return (
        <TitleScreen
          galleryCount={gallery.length}
          onStart={() => {
            unlockAudio();
            setScreen("design");
          }}
          onGallery={() => setScreen("gallery")}
        />
      );
    }

    if (screen === "design") {
      return (
        <DesignScreen
          design={design}
          onChange={setDesign}
          onBack={() => setScreen("title")}
          onForge={startForge}
        />
      );
    }

    if (screen === "gallery") {
      return (
        <GalleryScreen
          swords={gallery}
          wallet={wallet}
          inventory={inventory}
          career={career}
          onBack={() => setScreen("title")}
          onForge={() => setScreen("design")}
          onBuyTool={handleBuyTool}
          onBuyShopItem={handleBuyShopItem}
          onEquipTool={handleEquipTool}
          onSelectPreset={handleSelectPreset}
          onUpgrade={handleUpgradeSword}
          onApplyComponentFusion={handleApplyComponentFusion}
          onApplySwordFusion={handleApplySwordFusion}
          onForgeCore={handleForgeCore}
          onInstallComponent={handleInstallComponent}
        />
      );
    }

    if (screen === "reveal" && finished) {
      return (
        <RevealScreen
          sword={finished}
          wallet={wallet}
          inventory={inventory}
          onUpgrade={handleUpgradeSword}
          onInstallComponent={handleInstallComponent}
          onClaimRewards={() => setScreen("rewards")}
          onAgain={() => setScreen("design")}
          onGallery={() => setScreen("gallery")}
          onTitle={() => setScreen("title")}
        />
      );
    }

    if (screen === "rewards" && finished) {
      const rewards = finished.pendingRewards || generateForgeRewards(finished, { forgeRunId: finished.forgeRunId });
      return (
        <RewardsScreen
          sword={finished}
          rewards={rewards}
          onClaim={handleClaimRewards}
          onGallery={() => setScreen("gallery")}
          onAgain={() => setScreen("design")}
        />
      );
    }

    const unlockedHammers: import("./types").HammerType[] = ["standard"];
    if (inventory.unlockedTools.includes("hammer_precision")) unlockedHammers.push("precision");
    if (inventory.unlockedTools.includes("hammer_sledge")) unlockedHammers.push("sledge");

    return (
      <div className="relative h-dvh overflow-hidden bg-bg">
        {images ? (
          <ForgeCanvas
            key={forgeKey}
            design={design}
            activeCore={activeCore}
            images={images}
            shake={save.current.shake}
            reducedMotion={reducedMotion}
            onHud={onHud}
            onFinished={onFinished}
            onStrikeReward={handleStrikeReward}
            inputRef={inputRef}
            inventory={inventory}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-muted">
            Acendendo o fogo da forja…
          </div>
        )}
        <ForgeHud
          hud={hud}
          muted={muted}
          unlockedHammers={unlockedHammers}
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
          onQuit={() => {
            inputRef.current.charging = false;
            setScreen("title");
          }}
        />
      </div>
    );
  };

  return (
    <>
      {renderScreen()}
      {errorToast && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-950/95 border border-red-500/60 rounded-md text-amber-200 text-xs shadow-2xl font-display flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2"
        >
          <span className="text-red-400 font-bold">⚠️</span>
          <span>{errorToast}</span>
        </div>
      )}
    </>
  );
}

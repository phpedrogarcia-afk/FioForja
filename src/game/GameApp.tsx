import { useCallback, useEffect, useRef, useState } from "react";
import { ForgeCanvas } from "./ForgeCanvas";
import { loadGameImages, type GameImages } from "./assets";
import { isMuted, playCoinJingle, playLootFanfare, playUpgradeChime, resumeAudio, setMuted, unlockAudio } from "./audio";
import { generateForgeRewards, isForgeSnapshotValid, applyStrikeRewardTransaction, type StrikeRewardTransactionResult } from "./sim";
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
  type ShopPurchaseItem,
} from "./transactions";
import { Button } from "@/components/ui/button";
import { DesignScreen } from "./screens/DesignScreen";
import { ForgeHud } from "./screens/ForgeHud";
import { GalleryScreen } from "./screens/GalleryScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { RewardsScreen } from "./screens/RewardsScreen";
import { TitleScreen } from "./screens/TitleScreen";
import type { ActiveForgeAttempt, CareerStats, EquippedWorkshopGear, FinishedSword, ForgeRewardsData, ForgeSnapshot, FusionCore, HudSnapshot, PlayerInventory, PlayerWallet, SaveData, Screen, SimState, SwordDesign } from "./types";
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
  const [forgeAttempt, setForgeAttempt] = useState<ActiveForgeAttempt | null>(null);
  const [activeCore, setActiveCore] = useState<FusionCore | null>(null);
  const [images, setImages] = useState<GameImages | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [finished, setFinished] = useState<FinishedSword | null>(null);
  const [muted, setMutedUi] = useState(false);
  const [forgeKey, setForgeKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [pendingFailedSave, setPendingFailedSave] = useState<{ sword: FinishedSword; uncommittedSave: SaveData } | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState<ActiveForgeAttempt | null>(null);
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

  const startForge = useCallback((isTraining = false) => {
    unlockAudio();
    const res = executeStartForgeTransaction(save.current, designRef.current, {
      isTraining,
      activeCoreId: activeCore?.id,
    });
    if (!res.success) {
      showError(res.error || "Não foi possível iniciar a forja.");
      return false;
    }
    save.current = res.save;
    setForgeAttempt(res.payload!);
    setDesign(res.payload!.design);
    setActiveCore(res.payload!.snapshot?.state.activeCore || null);
    setInventory(res.save.inventory);
    inputRef.current = { charging: false, action: false, reheat: false };
    setHud(EMPTY_HUD);
    setFinished(null);
    setForgeKey((k) => k + 1);
    setScreen("forge");
    return true;
  }, [activeCore, showError]);

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

  const handleForgeCore = useCallback((selectedCore: FusionCore) => {
    const core = save.current.inventory.fusionCores.find(c => c.id === selectedCore.id);
    if (!core) { showError("Este núcleo já não está disponível."); return; }
    const coreDesign: SwordDesign = {
      name: core.name.split("—")[1]?.trim() || "Espada do Crisol",
      family: core.family, profile: core.profile, steel: core.steel,
      guard: "cross", pommel: "disc", wrap: "leather", inscription: "",
      runes: ["Lendária", "Relíquia", "Épica"].includes(core.rarity), length: .75,
    };
    const res = executeStartForgeTransaction(save.current, coreDesign, { activeCoreId: core.id });
    if (!res.success) { showError(res.error || "Não foi possível preparar a forja do núcleo."); return; }
    save.current = res.save;
    setForgeAttempt(res.payload!);
    setActiveCore(res.payload!.snapshot?.state.activeCore || null);
    setDesign(res.payload!.design);
    setInventory(res.save.inventory);
    inputRef.current = { charging: false, action: false, reheat: false };
    unlockAudio(); setHud(EMPTY_HUD); setFinished(null);
    setForgeKey(k => k + 1); setScreen("forge");
  }, [showError]);

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
    const res = executeFinishSwordTransaction(save.current, sim, save.current.activeForgeAttempt?.design || designRef.current);
    if (!res.success) {
      showError(res.error || "Falha ao registrar lâmina finalizada no armazenamento.");
      if (res.payload && res.uncommittedSave) {
        setPendingFailedSave({ sword: res.payload, uncommittedSave: res.uncommittedSave });
      }
      return;
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

  const handleRetryPersist = useCallback(() => {
    if (!pendingFailedSave) return;
    const res = retryPersistSave(pendingFailedSave.uncommittedSave);
    if (!res.success) {
      showError(res.error || "Falha persistente ao tentar salvar novamente.");
      return;
    }
    save.current = res.save;
    setCareer(res.save.career);
    setInventory(res.save.inventory);
    setGallery(res.save.gallery);
    setFinished(pendingFailedSave.sword);
    setActiveCore(null);
    setPendingFailedSave(null);
    setScreen("reveal");
  }, [pendingFailedSave, showError]);

  const handleCancelFailedPersist = useCallback(() => {
    setPendingFailedSave(null);
    setRecoveryAttempt(save.current.activeForgeAttempt || null);
    setScreen("title");
  }, []);

  const handleDeliverCommission = useCallback((commissionId: string, swordId: string): boolean => {
    const res = executeDeliverCommissionTransaction(save.current, commissionId, swordId);
    if (!res.success) {
      showError(res.error || "Falha na entrega da encomenda.");
      return false;
    }
    save.current = res.save;
    playUpgradeChime();
    setWallet(res.save.wallet);
    setInventory(res.save.inventory);
    setGallery(res.save.gallery);
    return true;
  }, [showError]);

  const handleRecycleScrap = useCallback((): boolean => {
    const res = executeRecycleScrapTransaction(save.current);
    if (!res.success) {
      showError(res.error || "Falha na reciclagem de sucata.");
      return false;
    }
    save.current = res.save;
    playUpgradeChime();
    setInventory(res.save.inventory);
    return true;
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
          inventory={inventory}
          wallet={wallet}
          career={career}
          gallery={gallery}
          activeCore={activeCore}
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
          commissions={save.current.commissions}
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
          onDeliverCommission={handleDeliverCommission}
          onRecycleScrap={handleRecycleScrap}
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
            const cancelRes = executeCancelForgeTransaction(save.current);
            if (!cancelRes.success) { showError(cancelRes.error || "Não foi possível gravar o cancelamento."); return; }
            save.current = cancelRes.save;
            setInventory(cancelRes.save.inventory);
            setActiveCore(null);
            setForgeAttempt(null);
            setScreen("title");
          }}
        />
      </div>
    );
  };

  return (
    <>
      {renderScreen()}
      {recoveryAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="max-w-md w-full rounded-xl border border-amber-600/60 bg-[#120e0a] p-6 shadow-2xl text-center space-y-4">
            <div className="text-3xl">⚒️</div>
            <h3 className="font-display text-base font-bold text-amber-300">
              Forja em Andamento Detectada
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {recoveryAttempt.isTraining
                ? "Uma sessão de treinamento do aprendiz foi interrompida na bigorna."
                : `Existe uma tentativa ativa de forja (${recoveryAttempt.design.name || "Lâmina"}) com matéria-prima alocada.`}
            </p>
            <div className="p-3 bg-black/50 border border-amber-900/40 rounded-lg text-left text-xs space-y-1.5 text-slate-300 font-sans">
              <div><strong className="text-amber-400">Projeto:</strong> {recoveryAttempt.design.name || "Customizado"}</div>
              <div><strong className="text-amber-400">Liga Metálica:</strong> {recoveryAttempt.design.steel}</div>
              <div><strong className="text-amber-400">Progresso:</strong> {recoveryAttempt.status === "ACTIVE" ? "Tarugo deformado (Em forjamento)" : "Preparada na Bigorna (Sem marteladas)"}</div>
              <div><strong className="text-amber-400">Marteladas registradas:</strong> {recoveryAttempt.strikesCount || 0}</div>
            </div>
            <p className="text-xs text-amber-200/80">{isForgeSnapshotValid(recoveryAttempt.snapshot) ? "A metalurgia é retomada do último ponto confirmado. Golpes são salvos imediatamente; aquecimento e carga podem recuar até 1 segundo." : "Esta tentativa antiga não possui checkpoint físico compatível. Cancele para aplicar a recuperação dos insumos, sem inventar novo progresso."}</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-display font-bold text-xs"
                disabled={!isForgeSnapshotValid(recoveryAttempt.snapshot)}
                onClick={() => {
                  if (!isForgeSnapshotValid(recoveryAttempt.snapshot)) return;
                  setForgeAttempt(recoveryAttempt);
                  setActiveCore(recoveryAttempt.snapshot.state.activeCore || null);
                  inputRef.current = { charging: false, action: false, reheat: false };
                  setDesign(recoveryAttempt.design);
                  setRecoveryAttempt(null);
                  unlockAudio();
                  setHud(EMPTY_HUD);
                  setFinished(null);
                  setForgeKey((k) => k + 1);
                  setScreen("forge");
                }}
              >
                Retomar ponto salvo
              </Button>
              <Button
                variant="secondary"
                className="flex-1 border-border text-slate-400 hover:text-white text-xs font-display"
                onClick={() => {
                  const res = executeCancelForgeTransaction(save.current, { strikesCount: recoveryAttempt.strikesCount });
                  if (res.success) {
                    save.current = res.save;
                    setInventory(res.save.inventory);
                    if (res.payload?.refundedMaterial) {
                      showError("Tentativa cancelada: 100% dos insumos foram devolvidos ao inventário.");
                    } else if (res.payload?.scrapAwarded) {
                      showError("Tentativa cancelada: Tarugo descartado com +1 Sucata metálica recuperada.");
                    }
                    setRecoveryAttempt(null);
                  } else { showError(res.error || "Não foi possível cancelar a tentativa."); }
                }}
              >
                Cancelar / Abandonar
              </Button>
            </div>
          </div>
        </div>
      )}
      {errorToast && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-red-950/95 border border-red-500/60 rounded-md text-amber-200 text-xs shadow-2xl font-display flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2"
        >
          <span className="text-red-400 font-bold">⚠️</span>
          <span>{errorToast}</span>
        </div>
      )}
      {pendingFailedSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in">
          <div className="max-w-md w-full rounded-xl border border-red-500/60 bg-[#12080a] p-6 shadow-2xl">
            <h3 className="font-display text-base font-bold text-red-300 flex items-center gap-2">
              <span>⚠️</span> Falha de Gravação no Armazenamento
            </h3>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              A lâmina forjada foi concluída, mas o navegador não conseguiu gravar o registro no armazenamento local.
            </p>
            <p className="mt-2 text-xs text-amber-300/90 font-display">
              Seu núcleo, seus materiais e os atributos calculados da espada permanecem preservados em memória.
            </p>
            <div className="mt-5 flex gap-2.5">
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-black font-display font-bold text-xs"
                onClick={handleRetryPersist}
              >
                🔄 Tentar Gravar Novamente
              </Button>
              <Button
                variant="secondary"
                className="flex-1 border-border text-slate-400 hover:text-white text-xs"
                onClick={handleCancelFailedPersist}
              >
                ✕ Manter Estado Anterior
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

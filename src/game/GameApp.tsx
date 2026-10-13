import { useCallback, useEffect, useRef, useState } from "react";
import { ForgeCanvas } from "./ForgeCanvas";
import { loadGameImages, type GameImages } from "./assets";
import { resumeAudio, setMuted, unlockAudio, isMuted } from "./audio";
import { finishSword } from "./sim";
import { claimRewards, recycleScrap } from "./collection";
import { rollReward } from "./rewards";
import { loadSave, migrateSave, writeSave } from "./save";
import { DesignScreen } from "./screens/DesignScreen";
import { ForgeHud } from "./screens/ForgeHud";
import { GalleryScreen } from "./screens/GalleryScreen";
import { RewardsScreen } from "./screens/RewardsScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { TitleScreen } from "./screens/TitleScreen";
import type { FinishedSword, HudSnapshot, Screen, SimState, SwordDesign } from "./types";
import type { SimInput } from "./sim";

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
  integrity: 1,
  missStreak: 0,
  broken: false,
};

export function GameApp() {
  const [initialSave] = useState(() => migrateSave(null));
  const save = useRef(initialSave);
  const [collection, setCollection] = useState(initialSave.collection);
  const [saveError, setSaveError] = useState(false);
  const hudRef = useRef(EMPTY_HUD);
  const [screen, setScreen] = useState<Screen>("title");
  const [design, setDesign] = useState<SwordDesign>(save.current.lastDesign);
  const [gallery, setGallery] = useState<FinishedSword[]>(save.current.gallery);
  const [images, setImages] = useState<GameImages | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [finished, setFinished] = useState<FinishedSword | null>(null);
  const [muted, setMutedUi] = useState(save.current.muted);
  const [forgeKey, setForgeKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const inputRef = useRef<SimInput>({ charging: false, action: false, reheat: false });
  const designRef = useRef(design);
  designRef.current = design;

  useEffect(() => {
    // SSR and the initial browser frame must match; read browser storage after hydration.
    const stored = loadSave();
    save.current = stored;
    setCollection(stored.collection);
    setDesign(stored.lastDesign);
    setGallery(stored.gallery);
    setMutedUi(stored.muted);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMq = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    void loadGameImages().then(setImages);
    setMuted(stored.muted);
    const onVis = () => {
      if (document.visibilityState === "visible") resumeAudio();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const persist = useCallback((patch: Partial<typeof save.current>) => {
    save.current = { ...save.current, ...patch };
    setSaveError(!writeSave(save.current));
  }, []);

  const startForge = useCallback(() => {
    unlockAudio();
    persist({ lastDesign: designRef.current });
    setHud(EMPTY_HUD);
    hudRef.current = EMPTY_HUD;
    inputRef.current = { charging: false, action: false, reheat: false };
    setFinished(null);
    setForgeKey((k) => k + 1);
    setScreen("forge");
  }, [persist]);

  const onHud = useCallback((next: HudSnapshot) => {
    hudRef.current = next;
    setHud(next);
  }, []);

  const onFinished = useCallback(
    (sim: SimState) => {
      const scored = finishSword(sim, designRef.current);
      const reward = rollReward({
        design: designRef.current,
        quality: scored.quality,
        heatScore: scored.heatScore,
        forgeScore: scored.forgeScore,
        quenchScore: scored.quenchScore,
        warp: scored.warp,
        perfects: scored.perfects,
        strikes: scored.strikes,
        broken: scored.broken,
        performance: scored.performance,
      });
      const sword: FinishedSword = {
        id: crypto.randomUUID(),
        design: designRef.current,
        quality: scored.quality,
        grade: reward.grade,
        heatScore: scored.heatScore,
        forgeScore: scored.forgeScore,
        quenchScore: scored.quenchScore,
        warp: scored.warp,
        createdAt: Date.now(),
        rarity: reward.rarity,
        title: reward.title,
        stats: reward.stats,
        boon: reward.boon,
        broken: scored.broken,
        rank: reward.rank,
        performance: reward.performance,
        drops: reward.drops,
        history: scored.history,
        reheats: scored.reheats,
      };
      setFinished(sword);
      const nextGallery = [sword, ...save.current.gallery];
      setGallery(nextGallery);
      persist({ gallery: nextGallery });
      setScreen("reveal");
    },
    [persist],
  );

  useEffect(() => {
    if (screen !== "forge") return;
    let active = false;
    const down = (e: PointerEvent) => {
      if (!(e.target instanceof HTMLCanvasElement) || e.button !== 0) return;
      e.preventDefault();
      e.target.focus();
      active = true;
      inputRef.current.charging = true;
    };
    const up = () => {
      if (!active) return;
      active = false;
      inputRef.current.charging = false;
      if (hudRef.current.phase === "heat") inputRef.current.action = true;
    };
    const cancel = () => {
      active = false;
      inputRef.current.charging = false;
      inputRef.current.cancel = true;
    };
    const interactive = (e: KeyboardEvent) =>
      (e.target as HTMLElement)?.closest("button,input,a,select,textarea");
    const keyDown = (e: KeyboardEvent) => {
      if (interactive(e) || e.repeat) return;
      if (e.code === "KeyR") {
        inputRef.current.reheat = true;
        return;
      }
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        active = true;
        inputRef.current.charging = true;
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (active && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        up();
      }
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", cancel);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
      inputRef.current = { charging: false, action: false, reheat: false };
    };
  }, [screen]);

  const claim = () => {
    if (!finished) return;
    const next = claimRewards(save.current.collection, finished.id, finished.drops ?? []);
    setCollection(next);
    persist({ collection: next });
  };
  const recycle = () => {
    const next = recycleScrap(save.current.collection);
    setCollection(next);
    persist({ collection: next });
  };
  const exportSave = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(save.current, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "FioForja-arsenal.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const notice = saveError ? (
    <div className="save-notice" role="alert">
      O navegador não conseguiu salvar. Exporte seu arsenal no Legado antes de fechar.
    </div>
  ) : null;

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedUi(next);
    persist({ muted: next });
    unlockAudio();
    if (screen === "forge")
      document.querySelector<HTMLCanvasElement>("canvas[aria-keyshortcuts]")?.focus();
  };

  if (screen === "title") {
    return (
      <>
        {notice}
        <TitleScreen
          galleryCount={gallery.length}
          onStart={() => {
            unlockAudio();
            setScreen("design");
          }}
          onGallery={() => setScreen("gallery")}
        />
      </>
    );
  }

  if (screen === "design") {
    return (
      <>
        {notice}
        <DesignScreen
          collection={collection}
          design={design}
          onChange={setDesign}
          onBack={() => setScreen("title")}
          onForge={startForge}
        />
      </>
    );
  }

  if (screen === "gallery") {
    return (
      <>
        {notice}
        <GalleryScreen
          swords={gallery}
          collection={collection}
          onInspect={(s) => {
            setFinished(s);
            setScreen("reveal");
          }}
          onRecycle={recycle}
          onExport={exportSave}
          onBack={() => setScreen("title")}
          onForge={() => setScreen("design")}
        />
      </>
    );
  }

  if (screen === "rewards" && finished)
    return (
      <>
        {notice}
        <RewardsScreen
          sword={finished}
          claimed={collection.claimed.includes(finished.id)}
          onClaim={claim}
          onBack={() => setScreen("reveal")}
          onGallery={() => setScreen("gallery")}
        />
      </>
    );

  if (screen === "reveal" && finished) {
    return (
      <>
        {notice}
        <RevealScreen
          sword={finished}
          claimed={collection.claimed.includes(finished.id)}
          onRewards={finished.drops?.length ? () => setScreen("rewards") : undefined}
          onAgain={() => setScreen("design")}
          onGallery={() => setScreen("gallery")}
          onTitle={() => setScreen("title")}
        />
      </>
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-bg">
      {notice}
      {images ? (
        <ForgeCanvas
          key={forgeKey}
          design={design}
          images={images}
          shake={save.current.shake}
          reducedMotion={reducedMotion}
          onHud={onHud}
          onFinished={onFinished}
          inputRef={inputRef}
        />
      ) : (
        <div className="flex h-full items-center justify-center font-display text-muted">
          Acendendo a forja…
        </div>
      )}
      <ForgeHud
        hud={hud}
        design={design}
        muted={muted}
        onMute={toggleMute}
        onPull={() => {
          inputRef.current.action = true;
          document.querySelector<HTMLCanvasElement>("canvas[aria-keyshortcuts]")?.focus();
        }}
        onReheat={() => {
          inputRef.current.reheat = true;
          document.querySelector<HTMLCanvasElement>("canvas[aria-keyshortcuts]")?.focus();
        }}
        onQuit={() => {
          inputRef.current.charging = false;
          setScreen("title");
        }}
      />
    </div>
  );
}

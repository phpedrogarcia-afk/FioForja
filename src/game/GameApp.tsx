import { useCallback, useEffect, useRef, useState } from "react";
import { ForgeCanvas } from "./ForgeCanvas";
import { loadGameImages, type GameImages } from "./assets";
import { resumeAudio, setMuted, unlockAudio, isMuted } from "./audio";
import { finishSword, generateForgeRewards } from "./sim";
import { loadSave, writeSave } from "./save";
import { DesignScreen } from "./screens/DesignScreen";
import { ForgeHud } from "./screens/ForgeHud";
import { GalleryScreen } from "./screens/GalleryScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { RewardsScreen } from "./screens/RewardsScreen";
import { TitleScreen } from "./screens/TitleScreen";
import type { FinishedSword, HudSnapshot, Screen, SimState, SwordDesign } from "./types";
import type { SimInput } from "./sim";
import { DEFAULT_DESIGN } from "./catalog";

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
  const [images, setImages] = useState<GameImages | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(EMPTY_HUD);
  const [finished, setFinished] = useState<FinishedSword | null>(null);
  const [muted, setMutedUi] = useState(false);
  const [forgeKey, setForgeKey] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const inputRef = useRef<SimInput>({ charging: false, action: false, reheat: false });
  const designRef = useRef(design);
  designRef.current = design;

  useEffect(() => {
    const loaded = loadSave();
    save.current = loaded;
    setGallery(loaded.gallery);
    setDesign(loaded.lastDesign);
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

  const persist = useCallback((patch: Partial<typeof save.current>) => {
    save.current = { ...save.current, ...patch };
    writeSave(save.current);
  }, []);

  const startForge = useCallback(() => {
    unlockAudio();
    persist({ lastDesign: designRef.current });
    setHud(EMPTY_HUD);
    setFinished(null);
    setForgeKey((k) => k + 1);
    setScreen("forge");
  }, [persist]);

  const onHud = useCallback((next: HudSnapshot) => {
    setHud(next);
  }, []);

  const onFinished = useCallback((sim: SimState) => {
    const sword = finishSword(sim, designRef.current);
    setFinished(sword);

    if (!sim.broken) {
      const nextGallery = [sword, ...save.current.gallery].slice(0, 48);
      setGallery(nextGallery);
      persist({ gallery: nextGallery });
    }

    window.setTimeout(() => setScreen("reveal"), 800);
  }, [persist]);

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
        const order: Array<import("./types").HammerType> = ["standard", "precision", "sledge"];
        const current = hud.activeHammer || "standard";
        const nextIdx = (order.indexOf(current) + 1) % order.length;
        inputRef.current.switchHammer = order[nextIdx];
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
  }, [screen, hud.activeHammer]);

  const toggleMute = () => {
    const next = !isMuted();
    setMuted(next);
    setMutedUi(next);
    persist({ muted: next });
    unlockAudio();
  };

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
        onBack={() => setScreen("title")}
        onForge={() => setScreen("design")}
      />
    );
  }

  if (screen === "reveal" && finished) {
    return (
      <RevealScreen
        sword={finished}
        onClaimRewards={() => setScreen("rewards")}
        onAgain={() => setScreen("design")}
        onGallery={() => setScreen("gallery")}
        onTitle={() => setScreen("title")}
      />
    );
  }

  if (screen === "rewards" && finished) {
    const rewards = generateForgeRewards(finished);
    return (
      <RewardsScreen
        sword={finished}
        rewards={rewards}
        onClaim={() => {}}
        onGallery={() => setScreen("gallery")}
        onAgain={() => setScreen("design")}
      />
    );
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-bg">
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
          Acendendo o fogo da forja…
        </div>
      )}
      <ForgeHud
        hud={hud}
        muted={muted}
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
}

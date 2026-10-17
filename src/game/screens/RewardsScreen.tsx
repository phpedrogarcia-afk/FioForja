import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FinishedSword, ForgeRewardsData } from "../types";

interface Props {
  sword: FinishedSword;
  rewards: ForgeRewardsData;
  onClaim: (rewards: ForgeRewardsData) => void;
  onGallery: () => void;
  onAgain: () => void;
}

export function RewardsScreen({ sword, rewards, onClaim, onGallery, onAgain }: Props) {
  const [claimed, setClaimed] = useState(false);

  const handleClaim = () => {
    if (claimed) return;
    setClaimed(true);
    onClaim(rewards);
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-between overflow-hidden bg-[#0a0705] px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-fg">
      {/* Background image: anvil with glowing chest */}
      <img
        src="/game/rewards-chest.jpg"
        alt="Forge Rewards"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-screen"
      />

      {/* Atmospheric lighting gradients */}
      <div className="pointer-events-none absolute inset-0 bg-radial from-transparent via-[#080503]/75 to-[#050302]" />

      {/* Top Resource & Rank Bar (matching Reference Image 3) */}
      <header className="relative z-10 mx-auto flex w-full max-w-2xl items-center justify-between rounded-lg border border-amber-900/40 bg-black/60 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs font-display sm:gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm">🪙</span>
            <span className="font-bold text-amber-200 tabular-nums">{rewards.gold.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-red-400 text-sm">💎</span>
            <span className="font-bold text-red-200 tabular-nums">{rewards.rubies}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-cyan-400 text-sm">🔷</span>
            <span className="font-bold text-cyan-200 tabular-nums">{rewards.diamonds}</span>
          </div>
        </div>
        <div className="font-display text-xs tracking-wider">
          <span className="text-muted">Player Rank: </span>
          <span className="font-bold text-amber-300">{rewards.rank}</span>
        </div>
      </header>

      {/* Main Title Banner in Gothic Frame */}
      <div className="relative z-10 mt-6 text-center">
        <div className="inline-block rounded-xl border-2 border-amber-600/60 bg-linear-to-b from-stone-900/90 to-stone-950/95 px-6 py-3 shadow-[0_0_30px_rgba(217,119,6,0.35)] backdrop-blur-md">
          <p className="font-display text-[0.65rem] uppercase tracking-[0.28em] text-amber-400">
            Vitória do Ferreiro
          </p>
          <h1 className="mt-1 font-display text-xl font-bold tracking-widest text-amber-100 sm:text-2xl">
            FORGE REWARDS - PERFORMANCE: RANK {rewards.rank}
          </h1>
          <p className="mt-1 text-xs text-amber-300/80">
            {sword.design.name ? sword.design.name.toUpperCase() : "LÂMINA FORJADA COM MAESTRIA"}
          </p>
        </div>
      </div>

      {/* 4 Glowing Reward Cards (matching Reference Image 3) */}
      <div className="relative z-10 mx-auto my-auto mt-8 grid w-full max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {rewards.items.map((item) => (
          <div
            key={item.id}
            className="group relative flex flex-col items-center rounded-xl border border-amber-500/40 bg-stone-900/80 p-3 text-center shadow-[0_8px_25px_rgba(0,0,0,0.6)] backdrop-blur-sm transition-transform duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]"
          >
            {/* Golden glow aura behind icon */}
            <div className="relative flex size-16 items-center justify-center rounded-lg border border-amber-600/30 bg-radial from-amber-500/20 to-black/60 shadow-inner">
              <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                {item.icon}
              </span>
            </div>

            <p className="mt-2.5 font-display text-xs font-semibold tracking-wide text-amber-100">
              {item.name}
            </p>
            <p className="mt-0.5 text-[0.65rem] uppercase tracking-wider text-amber-400/90">
              {item.rarity}
            </p>
            <p className="mt-1 line-clamp-2 text-[0.65rem] text-slate-400">
              {item.description}
            </p>
          </div>
        ))}
      </div>

      {/* Action Footer Buttons (matching Reference Image 3) */}
      <footer className="relative z-10 mx-auto mt-8 flex w-full max-w-sm flex-col gap-2.5 text-center">
        <Button
          size="lg"
          disabled={claimed}
          className="w-full bg-linear-to-r from-amber-600 via-amber-500 to-amber-600 py-3 text-base font-bold tracking-widest text-stone-950 shadow-[0_0_25px_rgba(217,119,6,0.6)] hover:brightness-110 active:scale-98"
          onClick={handleClaim}
        >
          {claimed ? "RECOMPENSAS COLETADAS ✓" : "CLAIM REWARDS"}
        </Button>

        <Button
          variant="secondary"
          size="md"
          className="w-full border-amber-900/50 bg-stone-900/80 font-display text-xs tracking-wider text-amber-200/90 hover:bg-stone-800"
          onClick={onGallery}
        >
          [Back to Inventory / Ver no Arsenal]
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full font-display text-xs tracking-wider text-muted hover:text-fg"
          onClick={onAgain}
        >
          [View Forge History / Forjar Outra Lâmina]
        </Button>
      </footer>
    </div>
  );
}

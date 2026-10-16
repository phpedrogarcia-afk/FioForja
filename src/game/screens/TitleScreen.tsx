import { Button } from "@/components/ui/button";

interface Props {
  onStart: () => void;
  onGallery: () => void;
  galleryCount: number;
}

export function TitleScreen({ onStart, onGallery, galleryCount }: Props) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-end overflow-hidden bg-bg px-5 pb-10 pt-[max(2rem,env(safe-area-inset-top))] sm:justify-center sm:pb-16">
      <img
        src="/game/bg-forge.jpg"
        alt="FioForja - Oficina Medieval"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-stone-950/40 via-stone-950/70 to-stone-950/95" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <p className="font-display text-xs uppercase tracking-[0.32em] text-amber-500 font-semibold drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
          Oficina de Forja Medieval
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold tracking-[0.2em] text-amber-100 sm:text-7xl drop-shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
          FIOFORJA
        </h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-300 sm:text-base">
          Aqui, você não encontra espadas lendárias em baús. Cada gume, têmpera e runa nascem do calor da fornalha e da precisão do seu martelo sobre a bigorna.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-linear-to-r from-amber-600 to-amber-500 py-3 text-base font-bold tracking-wider text-black shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-98"
            onClick={onStart}
          >
            Entrar na Forja
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full border-amber-900/50 bg-stone-900/80 font-display tracking-wider text-amber-200 hover:bg-stone-800"
            onClick={onGallery}
          >
            Arsenal do Ferreiro{galleryCount > 0 ? ` · ${galleryCount}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(20_14_10_/_0.25)_0%,rgb(20_14_10_/_0.55)_45%,rgb(20_14_10_/_0.92)_100%)]" />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <p className="font-display text-xs uppercase tracking-[0.28em] text-ember-hot">Oficina real</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-[0.18em] text-fg sm:text-7xl">
          A FORJA
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-muted">
          Customize a lâmina, o cabo e as inscrições. A força do martelo decide se a espada nasce ou se parte.
        </p>
        <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
          <Button size="lg" className="w-full" onClick={onStart}>
            Entrar na forja
          </Button>
          <Button variant="secondary" size="lg" className="w-full" onClick={onGallery}>
            Galeria{galleryCount > 0 ? ` · ${galleryCount}` : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const ASSET_URLS = {
  bg: "/game/bg-forge.jpg",
  hand: "/game/hand.png",
  strike: "/game/hand-strike.png",
  sparks: "/game/sparks.png",
  fire: "/game/fire.png",
  anvil: "/game/anvil.png",
} as const;

export type GameImages = Record<keyof typeof ASSET_URLS, HTMLImageElement | null>;

function loadOne(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function loadGameImages(): Promise<GameImages> {
  const entries = await Promise.all(
    (Object.keys(ASSET_URLS) as (keyof typeof ASSET_URLS)[]).map(async (key) => {
      const img = await loadOne(ASSET_URLS[key]);
      return [key, img] as const;
    }),
  );
  return Object.fromEntries(entries) as GameImages;
}

export function drawSheetFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cols: number,
  rows: number,
  index: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
) {
  const col = index % cols;
  const row = Math.floor(index / cols) % rows;
  const sw = img.width / cols;
  const sh = img.height / rows;
  ctx.drawImage(img, col * sw, row * sh, sw, sh, dx, dy, dw, dh);
}

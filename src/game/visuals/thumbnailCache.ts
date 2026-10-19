// Static arsenal cards reuse identical pixels; inspection keeps interactive lighting.
import { deriveWeaponVisualGenome, type WeaponVisualSource } from "./weaponGenome.ts";
import { drawWeaponGenome, fitWeaponViewport } from "./weaponRenderer.ts";

const MAX_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 96;
interface Entry { canvas: HTMLCanvasElement; bytes: number }
const cache = new Map<string, Entry>();
let bytes = 0;
let hits = 0;
let misses = 0;

export function clearWeaponThumbnailCache(): void {
  cache.clear();
  bytes = hits = misses = 0;
}

export function weaponThumbnailCacheStats() {
  return { entries: cache.size, bytes, hits, misses };
}

/** Full genome is the key: component replacement, forging marks and refinements cannot go stale. */
export function drawWeaponThumbnail(
  ctx: CanvasRenderingContext2D,
  sword: WeaponVisualSource,
  width: number,
  height: number,
  pixelRatio = 1,
): { cacheHit: boolean } {
  if (![width, height, pixelRatio].every(Number.isFinite) || width <= 0 || height <= 0 || pixelRatio <= 0) {
    throw new RangeError("Invalid thumbnail dimensions");
  }
  const ratio = Math.min(pixelRatio, 2);
  const genome = deriveWeaponVisualGenome(sword);
  const key = JSON.stringify([width, height, ratio, genome]);
  let entry = cache.get(key);
  const cacheHit = !!entry;
  if (entry) {
    hits += 1;
    cache.delete(key);
    cache.set(key, entry);
  } else {
    misses += 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    const raster = canvas.getContext("2d");
    if (!raster) throw new Error("Canvas 2D unavailable");
    raster.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawWeaponGenome(raster, genome, fitWeaponViewport(genome, width, height), {});
    entry = { canvas, bytes: canvas.width * canvas.height * 4 };
    if (entry.bytes <= MAX_BYTES) {
      cache.set(key, entry);
      bytes += entry.bytes;
      while (bytes > MAX_BYTES || cache.size > MAX_ENTRIES) {
        const oldest = cache.keys().next().value!;
        bytes -= cache.get(oldest)!.bytes;
        cache.delete(oldest);
      }
    }
  }
  ctx.drawImage(entry.canvas, 0, 0, entry.canvas.width, entry.canvas.height, 0, 0, width, height);
  return { cacheHit };
}

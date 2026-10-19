// FioForja — WEAPON DNA RENDERER ADAPTER
//
// Bridge between the existing game screens and the new Weapon DNA engine.
// Design goals:
//   * Zero gameplay impact: the legacy renderer stays the default.
//   * Opt-in only: an experimental selector (URL parameter or localStorage)
//     switches a screen to the DNA renderer; nothing is migrated or mutated.
//   * No save schema changes, no economy/loot/fusion/progression involvement.
//
// How to integrate a screen later (see docs/specs/weapon-visual-dna.md):
//
//   ctx.save();
//   const drawn = drawSwordByMode(ctx, sword, { x, y, lengthPx });
//   if (!drawn) drawFinishedSword(ctx, sword.design, x, y, lengthPx, legacyOpts);
//   ctx.restore();
//
// or, for a DNA-only preview (visual lab, future gallery):
//   drawDnaSword(ctx, sword, boxWidth, boxHeight);

import { drawFinishedSword } from "../swordDraw.ts";
import type { DrawSwordOptions } from "../swordDraw.ts";
import type { FinishedSword } from "../types.ts";
import { deriveWeaponVisualGenome } from "./weaponGenome.ts";
import type { WeaponVisualSource } from "./weaponGenome.ts";
import { drawWeaponGenome, drawWeaponFromSword, fitWeaponViewport } from "./weaponRenderer.ts";
import type { DrawWeaponOptions, WeaponViewport } from "./types.ts";

export type WeaponRenderMode = "legacy" | "dna";

export const WEAPON_RENDER_MODE_STORAGE_KEY = "fioforja.weaponRenderMode";
export const WEAPON_RENDER_MODE_URL_PARAM = "weaponRender";

let currentMode: WeaponRenderMode = "legacy";
let modeResolved = false;

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseMode(value: string | null | undefined): WeaponRenderMode | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "dna" || normalized === "weapon-dna" || normalized === "weapondna") return "dna";
  if (normalized === "legacy" || normalized === "classic") return "legacy";
  return null;
}

/** Resolve once: URL parameter wins over persisted preference over default. */
export function resolveWeaponRenderMode(): WeaponRenderMode {
  if (modeResolved) return currentMode;
  let urlMode: WeaponRenderMode | null = null;
  try {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      urlMode = parseMode(url.searchParams.get(WEAPON_RENDER_MODE_URL_PARAM));
    }
  } catch {
    /* URL unavailable (SSR / workers): keep the default. */
  }
  let storedMode: WeaponRenderMode | null = null;
  if (urlMode === null) {
    try {
      storedMode = parseMode(safeStorage()?.getItem(WEAPON_RENDER_MODE_STORAGE_KEY));
    } catch {
      /* A storage object can exist while reads are denied. */
    }
  }
  currentMode = urlMode ?? storedMode ?? "legacy";
  modeResolved = true;
  return currentMode;
}

export function getWeaponRenderMode(): WeaponRenderMode {
  return resolveWeaponRenderMode();
}

export function setWeaponRenderMode(mode: WeaponRenderMode): void {
  currentMode = mode;
  modeResolved = true;
  const storage = safeStorage();
  try {
    storage?.setItem(WEAPON_RENDER_MODE_STORAGE_KEY, mode);
  } catch {
    /* storage may be unavailable in private mode: the in-memory value still works. */
  }
}

export function isWeaponDnaEnabled(): boolean {
  return getWeaponRenderMode() === "dna";
}

function legacyOptionsFrom(sword: WeaponVisualSource): DrawSwordOptions {
  const source = sword as WeaponVisualSource;
  return {
    quality: source.quality ?? 70,
    warp: source.warp ?? 0,
    cracks: source.cracks ?? 0,
    broken: source.broken ?? false,
    physicalProfile: source.physicalProfile,
    runicCharge: source.structuralState === "stable" ? 0.35 : 0.1,
  };
}

/**
 * Draws a finished sword with the active renderer.
 * Returns true when the Weapon DNA engine handled the draw, false when the
 * caller should fall back to the legacy renderer itself.
 */
export function drawSwordByMode(
  ctx: CanvasRenderingContext2D,
  sword: FinishedSword | WeaponVisualSource,
  viewport: WeaponViewport,
  options: DrawWeaponOptions = {},
): boolean {
  if (!isWeaponDnaEnabled()) return false;
  drawWeaponFromSword(ctx, sword, viewport, options);
  return true;
}

/** Convenience for screens that position the guard the same way as legacy. */
export function drawSwordByModeAt(
  ctx: CanvasRenderingContext2D,
  sword: FinishedSword | WeaponVisualSource,
  x: number,
  y: number,
  lengthPx: number,
  options: DrawWeaponOptions & { legacy?: DrawSwordOptions } = {},
): boolean {
  if (!isWeaponDnaEnabled()) return false;
  const angle = -Math.PI / 2.15;
  drawWeaponFromSword(ctx, sword, { x, y, lengthPx, angle }, options);
  return true;
}

/** DNA-only draw, auto-fitted inside a box. Used by the visual lab and previews. */
export function drawDnaSwordInBox(
  ctx: CanvasRenderingContext2D,
  sword: WeaponVisualSource,
  boxWidth: number,
  boxHeight: number,
  options: DrawWeaponOptions = {},
): void {
  const genome = deriveWeaponVisualGenome(sword);
  const viewport = fitWeaponViewport(genome, boxWidth, boxHeight);
  drawWeaponGenome(ctx, genome, viewport, options);
}

/** Explicit legacy path for parity tests and comparison captures. */
export function drawLegacySword(
  ctx: CanvasRenderingContext2D,
  sword: FinishedSword | WeaponVisualSource,
  x: number,
  y: number,
  lengthPx: number,
  options: DrawSwordOptions = {},
): void {
  drawFinishedSword(ctx, sword.design, x, y, lengthPx, { ...legacyOptionsFrom(sword), ...options });
}

/** Both renderers back to back, for A/B evidence generation. */
export function drawDnaAndLegacy(
  ctx: CanvasRenderingContext2D,
  sword: FinishedSword | WeaponVisualSource,
  legacy: { x: number; y: number; lengthPx: number },
  dna: WeaponViewport,
  options: DrawWeaponOptions = {},
): void {
  drawLegacySword(ctx, sword, legacy.x, legacy.y, legacy.lengthPx);
  drawWeaponFromSword(ctx, sword, dna, options);
}

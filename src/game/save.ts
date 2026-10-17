import type { CareerStats, FinishedSword, PlayerInventory, PlayerWallet, SwordDesign } from "./types.ts";
import { DEFAULT_DESIGN } from "./catalog.ts";

const KEY = "a-forja-save";
const VERSION = 4;

export interface SaveData {
  version: number;
  gallery: FinishedSword[];
  lastDesign: SwordDesign;
  wallet: PlayerWallet;
  inventory: PlayerInventory;
  career: CareerStats;
  muted: boolean;
  shake: boolean;
}

export const defaultWallet: PlayerWallet = {
  gold: 850,
  rubies: 35,
  diamonds: 20,
};

export const defaultInventory: PlayerInventory = {
  unlockedProfiles: ["short", "long", "falchion", "saber"],
  unlockedSteels: ["iron", "steel"],
  unlockedGuards: ["cross", "curved", "ring"],
  unlockedPommels: ["disc", "sphere", "cross"],
  unlockedWraps: ["leather", "braided", "linen"],
  unlockedRunes: ["fehu", "uruz"],
  unlockedTools: ["hammer_standard", "anvil_standard", "furnace_standard", "quench_water"],
  materials: {
    iron_ingot: 8,
    steel_ingot: 4,
    scrap: 0,
    refined_iron: 1,
  },
};

export const defaultCareer: CareerStats = {
  totalForged: 0,
  masterpieces: 0,
  legendaries: 0,
  relics: 0,
  brokenBlades: 0,
  highestQuality: 0,
  totalValueEarned: 0,
};

const defaults: SaveData = {
  version: VERSION,
  gallery: [],
  lastDesign: DEFAULT_DESIGN,
  wallet: defaultWallet,
  inventory: defaultInventory,
  career: defaultCareer,
  muted: false,
  shake: true,
};

export function migrateSave(raw: any): SaveData {
  if (!raw || typeof raw !== "object") return structuredClone(defaults);

  const rawGallery: FinishedSword[] = Array.isArray(raw.gallery) ? raw.gallery : [];
  const gallery = rawGallery.slice(0, 48).map((sword) => ({
    ...sword,
    design: {
      ...DEFAULT_DESIGN,
      ...(sword.design || {}),
      profile: sword.design?.profile || "long",
      steel: sword.design?.steel || "iron",
    },
    quality: Number.isFinite(sword.quality) ? sword.quality : 50,
  }));

  // Reconstruct or populate career stats from actual gallery history
  const totalForged = Math.max(raw.career?.totalForged ?? 0, gallery.length);
  const masterpieces = Math.max(
    raw.career?.masterpieces ?? 0,
    gallery.filter((s) => s.quality >= 95).length,
  );
  const legendaries = Math.max(
    raw.career?.legendaries ?? 0,
    gallery.filter((s) => s.rarity === "Lendária").length,
  );
  const relics = Math.max(
    raw.career?.relics ?? 0,
    gallery.filter((s) => s.rarity === "Relíquia").length,
  );
  const brokenBlades = Math.max(
    raw.career?.brokenBlades ?? 0,
    gallery.filter((s) => s.structuralState === "broken" || s.quality <= 15).length,
  );
  const highestQuality = Math.max(
    raw.career?.highestQuality ?? 0,
    ...gallery.map((s) => s.quality || 0),
    0,
  );

  const career: CareerStats = {
    totalForged,
    masterpieces,
    legendaries,
    relics,
    brokenBlades,
    highestQuality,
    totalValueEarned: raw.career?.totalValueEarned ?? 0,
  };

  // Wallet persistence with fallback starting capital
  const wallet: PlayerWallet = {
    gold: typeof raw.wallet?.gold === "number" ? raw.wallet.gold : defaultWallet.gold,
    rubies: typeof raw.wallet?.rubies === "number" ? raw.wallet.rubies : defaultWallet.rubies,
    diamonds: typeof raw.wallet?.diamonds === "number" ? raw.wallet.diamonds : defaultWallet.diamonds,
  };

  // Inventory persistence with defaults ensured
  const rawInv = raw.inventory || {};
  const inventory: PlayerInventory = {
    unlockedProfiles: Array.isArray(rawInv.unlockedProfiles) && rawInv.unlockedProfiles.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedProfiles, ...rawInv.unlockedProfiles]))
      : [...defaultInventory.unlockedProfiles],
    unlockedSteels: Array.isArray(rawInv.unlockedSteels) && rawInv.unlockedSteels.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedSteels, ...rawInv.unlockedSteels]))
      : [...defaultInventory.unlockedSteels],
    unlockedGuards: Array.isArray(rawInv.unlockedGuards) && rawInv.unlockedGuards.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedGuards, ...rawInv.unlockedGuards]))
      : [...defaultInventory.unlockedGuards],
    unlockedPommels: Array.isArray(rawInv.unlockedPommels) && rawInv.unlockedPommels.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedPommels, ...rawInv.unlockedPommels]))
      : [...defaultInventory.unlockedPommels],
    unlockedWraps: Array.isArray(rawInv.unlockedWraps) && rawInv.unlockedWraps.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedWraps, ...rawInv.unlockedWraps]))
      : [...defaultInventory.unlockedWraps],
    unlockedRunes: Array.isArray(rawInv.unlockedRunes) && rawInv.unlockedRunes.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedRunes, ...rawInv.unlockedRunes]))
      : [...defaultInventory.unlockedRunes],
    unlockedTools: Array.isArray(rawInv.unlockedTools) && rawInv.unlockedTools.length > 0
      ? Array.from(new Set([...defaultInventory.unlockedTools, ...rawInv.unlockedTools]))
      : [...defaultInventory.unlockedTools],
    materials: {
      ...defaultInventory.materials,
      ...(rawInv.materials || {}),
    },
  };

  return {
    version: VERSION,
    gallery,
    lastDesign: { ...DEFAULT_DESIGN, ...(raw.lastDesign || {}) },
    wallet,
    inventory,
    career,
    muted: Boolean(raw.muted),
    shake: raw.shake !== undefined ? Boolean(raw.shake) : true,
  };
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return structuredClone(defaults);
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    const parsed = JSON.parse(raw);
    return migrateSave(parsed);
  } catch {
    return structuredClone(defaults);
  }
}

export function writeSave(data: SaveData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...data, version: VERSION }));
  } catch {
    /* private mode / quota */
  }
}

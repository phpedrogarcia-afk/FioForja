import type { CareerStats, EquippedWorkshopGear, FinishedSword, PlayerInventory, PlayerWallet, SaveData, SwordDesign } from "./types.ts";
import { DEFAULT_DESIGN } from "./catalog.ts";

export type { SaveData };

const KEY = "a-forja-save";
const VERSION = 5;

export function generateUniqueId(prefix = "sword"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}

export const defaultWallet: PlayerWallet = {
  gold: 850,
  rubies: 35,
  diamonds: 20,
};

export const defaultEquippedGear: EquippedWorkshopGear = {
  hammer: "standard",
  anvil: "anvil_cast",
  furnace: "furnace_coal",
  quench: "quench_water",
};

export const defaultInventory: PlayerInventory = {
  unlockedProfiles: ["short", "long", "falchion", "saber"],
  unlockedSteels: ["iron", "steel"],
  unlockedGuards: ["cross", "curved", "ring"],
  unlockedPommels: ["disc", "sphere", "cross"],
  unlockedWraps: ["leather", "braided", "linen"],
  unlockedRunes: ["fehu", "uruz"],
  unlockedTools: ["hammer_standard", "anvil_cast", "furnace_coal", "quench_water"],
  materials: {
    iron_ingot: 8,
    steel_ingot: 4,
    damascus_billet: 0,
    starmetal_ore: 0,
    fusion_fragment: 0,
    catalyst_astral: 0,
    scrap: 0,
    refined_iron: 1,
  },
  fusionCores: [],
  components: [],
  equipped: defaultEquippedGear,
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

export const defaultSaveData: SaveData = {
  version: VERSION,
  gallery: [],
  lastDesign: DEFAULT_DESIGN,
  wallet: defaultWallet,
  inventory: defaultInventory,
  career: defaultCareer,
  muted: false,
  shake: true,
  claimedForgeRewardIds: [],
  claimedStrikeRewardIds: [],
};

const defaults = defaultSaveData;

export const migrateSaveData = migrateSave;

export function migrateSave(raw: any): SaveData {
  if (!raw || typeof raw !== "object") return structuredClone(defaults);

  const rawGallery: FinishedSword[] = Array.isArray(raw.gallery) ? raw.gallery : [];
  const seenIds = new Set<string>();

  // Full gallery preservation without silent truncation
  const gallery = rawGallery.map((sword) => {
    let id = typeof sword.id === "string" && sword.id.trim().length > 0 ? sword.id : generateUniqueId("sword");
    if (seenIds.has(id)) {
      id = generateUniqueId("sword");
    }
    seenIds.add(id);

    return {
      ...sword,
      id,
      design: {
        ...DEFAULT_DESIGN,
        ...(sword.design || {}),
        profile: sword.design?.profile || "long",
        steel: sword.design?.steel || "iron",
      },
      quality: Number.isFinite(sword.quality) ? sword.quality : 50,
      affixes: Array.isArray(sword.affixes) ? sword.affixes : (Array.isArray(sword.perks) ? [...sword.perks] : []),
      forgeRunId: typeof sword.forgeRunId === "string" ? sword.forgeRunId : generateUniqueId("run"),
      pendingRewards: sword.pendingRewards,
      claimedRewards: sword.claimedRewards,
      installedComponents: sword.installedComponents,
      fusionHistory: sword.fusionHistory,
    };
  });

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
  const rawMaterials = { ...(rawInv.materials || {}) };
  // Migrate legacy catalyst_crystal into canonical catalyst_astral
  if (typeof rawMaterials.catalyst_crystal === "number" && rawMaterials.catalyst_crystal > 0) {
    rawMaterials.catalyst_astral = (rawMaterials.catalyst_astral || 0) + rawMaterials.catalyst_crystal;
    delete rawMaterials.catalyst_crystal;
  }

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
      ...rawMaterials,
    },
    fusionCores: Array.isArray(rawInv.fusionCores) ? rawInv.fusionCores : [],
    components: Array.isArray(rawInv.components) ? rawInv.components : [],
    equipped: {
      hammer: rawInv.equipped?.hammer || defaultEquippedGear.hammer,
      anvil: rawInv.equipped?.anvil || defaultEquippedGear.anvil,
      furnace: rawInv.equipped?.furnace || defaultEquippedGear.furnace,
      quench: rawInv.equipped?.quench || defaultEquippedGear.quench,
    },
  };

  const claimedForgeRewardIds: string[] = Array.isArray(raw.claimedForgeRewardIds)
    ? raw.claimedForgeRewardIds
    : [];

  const claimedStrikeRewardIds: string[] = Array.isArray(raw.claimedStrikeRewardIds)
    ? raw.claimedStrikeRewardIds
    : [];

  return {
    version: VERSION,
    gallery,
    lastDesign: { ...DEFAULT_DESIGN, ...(raw.lastDesign || {}) },
    wallet,
    inventory,
    career,
    muted: Boolean(raw.muted),
    shake: raw.shake !== undefined ? Boolean(raw.shake) : true,
    claimedForgeRewardIds,
    claimedStrikeRewardIds,
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

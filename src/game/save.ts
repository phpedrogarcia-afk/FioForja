import type { CareerStats, EquippedWorkshopGear, FinishedSword, PlayerInventory, PlayerWallet, SaveData, SaveResult } from "./types.ts";
import { DEFAULT_DESIGN } from "./catalog.ts";
import { DEFAULT_COMMISSIONS } from "./commissions.ts";

export type { SaveData, SaveResult };

const KEY = "a-forja-save";
const BACKUP_KEY = "a-forja-save-backup";
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
  unlockedBlueprints: ["guarda_medieval"],
  masteredBlueprints: [],
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
  activeForgeAttempt: null,
  commissions: DEFAULT_COMMISSIONS,
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
    unlockedBlueprints: Array.isArray(rawInv.unlockedBlueprints) && rawInv.unlockedBlueprints.length > 0
      ? Array.from(new Set([...(defaultInventory.unlockedBlueprints || ["guarda_medieval"]), ...rawInv.unlockedBlueprints]))
      : ["guarda_medieval"],
    masteredBlueprints: Array.isArray(rawInv.masteredBlueprints) ? rawInv.masteredBlueprints : [],
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
    activeForgeAttempt: raw.activeForgeAttempt || null,
    commissions: Array.isArray(raw.commissions) && raw.commissions.length > 0
      ? raw.commissions
      : DEFAULT_COMMISSIONS,
  };
}

let lastSuccessfulSaveSnapshot: SaveData | null = null;

export function getLastSuccessfulSave(): SaveData | null {
  return lastSuccessfulSaveSnapshot ? structuredClone(lastSuccessfulSaveSnapshot) : null;
}

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return null;
}

export function loadSave(): SaveData {
  const storage = getStorage();
  if (!storage) {
    return structuredClone(defaults);
  }

  // 1. Try loading primary save
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateSave(parsed);
      lastSuccessfulSaveSnapshot = structuredClone(migrated);
      return migrated;
    }
  } catch (err) {
    console.warn("[SaveManager] Primary save corrupt or unreadable, attempting backup recovery...", err);
  }

  // 2. Fallback to backup if primary is corrupt
  try {
    const backupRaw = storage.getItem(BACKUP_KEY);
    if (backupRaw) {
      const parsedBackup = JSON.parse(backupRaw);
      const recovered = migrateSave(parsedBackup);
      // Re-persist recovered save to primary slot
      try {
        storage.setItem(KEY, JSON.stringify({ ...recovered, version: VERSION }));
      } catch {
        /* ignore */
      }
      lastSuccessfulSaveSnapshot = structuredClone(recovered);
      console.info("[SaveManager] Successfully recovered game state from backup.");
      return recovered;
    }
  } catch (backupErr) {
    console.error("[SaveManager] Both primary and backup saves unreadable.", backupErr);
  }

  const fresh = structuredClone(defaults);
  lastSuccessfulSaveSnapshot = structuredClone(fresh);
  return fresh;
}

export function writeSave(data: SaveData): import("./types.ts").SaveResult {
  const storage = getStorage();
  if (!storage) {
    return {
      ok: false,
      error: "Armazenamento local (localStorage) não disponível no ambiente.",
      code: "STORAGE_UNAVAILABLE",
    };
  }

  let serialized: string;
  try {
    serialized = JSON.stringify({ ...data, version: VERSION });
  } catch (err: any) {
    return {
      ok: false,
      error: `Falha na serialização dos dados do jogo: ${err?.message || "JSON inválido"}`,
      code: "SERIALIZATION_FAILED",
    };
  }

  try {
    // Preserve current primary state into backup slot before overwriting, only if valid!
    const existingRaw = storage.getItem(KEY);
    if (existingRaw) {
      let isExistingValid = false;
      try {
        const parsed = JSON.parse(existingRaw);
        if (parsed && typeof parsed === "object" && (Array.isArray(parsed.gallery) || parsed.version)) {
          isExistingValid = true;
        }
      } catch {
        isExistingValid = false;
      }

      if (isExistingValid) {
        try {
          storage.setItem(BACKUP_KEY, existingRaw);
        } catch {
          /* non-fatal if backup slot is tight */
        }
      }
    } else {
      try {
        storage.setItem(BACKUP_KEY, serialized);
      } catch {
        /* non-fatal */
      }
    }

    // Write primary state
    storage.setItem(KEY, serialized);
    lastSuccessfulSaveSnapshot = structuredClone(data);
    return { ok: true };
  } catch (err: any) {
    const isQuota =
      err?.name === "QuotaExceededError" ||
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err?.code === 22 ||
      err?.code === 1014 ||
      err?.number === -2147024882;

    if (isQuota) {
      console.error("[SaveManager] Quota de armazenamento esgotada! Não foi possível persistir a transação.");
      return {
        ok: false,
        error: "Quota de armazenamento local excedida. Libere espaço no navegador para preservar seu progresso.",
        code: "QUOTA_EXCEEDED",
      };
    }

    return {
      ok: false,
      error: err?.message || "Erro desconhecido ao gravar no armazenamento local.",
      code: "UNKNOWN",
    };
  }
}

export function recoverFromBackup(): { success: boolean; data?: SaveData; error?: string } {
  const storage = getStorage();
  if (!storage) {
    return { success: false, error: "Ambiente sem localStorage." };
  }
  try {
    const backupRaw = storage.getItem(BACKUP_KEY);
    if (!backupRaw) {
      return { success: false, error: "Nenhum backup encontrado no armazenamento." };
    }
    const parsed = JSON.parse(backupRaw);
    const migrated = migrateSave(parsed);
    storage.setItem(KEY, JSON.stringify({ ...migrated, version: VERSION }));
    lastSuccessfulSaveSnapshot = structuredClone(migrated);
    return { success: true, data: migrated };
  } catch (err: any) {
    return { success: false, error: err?.message || "Falha ao restaurar backup." };
  }
}
